import os
import httpx 
import json
import re     
import html   
from sqlalchemy.orm import Session
from app.config import GMS_KEY 

# --- (유지) LCEL 임포트 ---
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_chroma import Chroma
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from fastapi import HTTPException
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_classic.chains import create_history_aware_retriever, create_retrieval_chain
from langchain_classic.chains.combine_documents import create_stuff_documents_chain

# --- 전역 변수 초기화 ---
GMS_BASE_URL = "https://gms.ssafy.io/gmsapi/api.openai.com/v1"
CHROMA_PERSIST_DIRECTORY = "./chroma_db" 

# 1. 모델 및 벡터 스토어 클라이언트 초기화
try:
    embedding_model = OpenAIEmbeddings(
        model="text-embedding-3-large", 
        api_key=GMS_KEY,
        base_url=GMS_BASE_URL
    )
    
    llm = ChatOpenAI(
        temperature=0.7, 
        model_name="gpt-5", # (GMS에서 지원하는 gpt-5 모델)
        api_key=GMS_KEY,
        base_url=GMS_BASE_URL
    )
except Exception as e:
    print(f"GMS/OpenAI 모델 초기화 실패: {e}")
    embedding_model = None
    llm = None

# --- (유지) ID-컬렉션명 변환 헬퍼 함수 ---
def _get_collection_name(document_id: str) -> str:
    if not document_id:
        raise ValueError("Document ID가 비어있습니다.")
    return f"material_{document_id}"

# --- (유지) 워크플로우 1: 임베딩 생성 (Service Logic) ---
# (download_json_from_cloudfront, _clean_html_content, 
#  extract_data_from_json, create_and_store_embeddings 함수는
#  이전과 동일하므로 여기서는 생략합니다.)

async def download_json_from_cloudfront(url: str) -> dict:
    # ... (이전과 동일) ...
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url, follow_redirects=True)
            if response.status_code != 200:
                raise HTTPException(status_code=response.status_code, 
                                    detail=f"CloudFront/S3 JSON 다운로드 실패 (URL: {url}): HTTP {response.status_code}")
            return response.json()
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="JSON 다운로드 시간 초과")
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="다운로드된 파일이 유효한 JSON이 아닙니다.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"JSON 다운로드 중 오류: {str(e)}")

def _clean_html_content(html_text: str) -> str:
    # ... (이전과 동일) ...
    if not html_text:
        return ""
    text = re.sub(r'<br\s*/?>', '\n', html_text, flags=re.IGNORECASE)
    text = re.sub(r'<[^>]+>', ' ', text)
    text = html.unescape(text)
    text = ' '.join(text.split())
    return text

def extract_data_from_json(json_data: dict) -> list[Document]:
    # ... (이전과 동일) ...
    documents = []
    chapters = json_data.get("chapters", [])
    if not chapters:
        raise ValueError("JSON에서 'chapters' 키를 찾을 수 없거나 리스트가 비어있습니다.")
    for chapter in chapters:
        chapter_id = chapter.get("id")
        title = chapter.get("title")
        content_html = chapter.get("content", "")
        chapter_type = chapter.get("type")
        base_metadata = {
            "chapter_id": chapter_id,
            "title": title,
            "type": chapter_type
        }
        if "새 챕터의 내용을 입력하세요" in content_html:
            print(f"Skipping empty chapter: {title}")
            continue
        if chapter_type == "content":
            plain_text = _clean_html_content(content_html)
            if plain_text.strip():
                documents.append(Document(
                    page_content=plain_text,
                    metadata=base_metadata
                ))
        elif chapter_type == "quiz":
            qa_list = chapter.get("qa", [])
            for qa_pair in qa_list:
                q = qa_pair.get("question", "")
                a = qa_pair.get("answer", "")
                qa_content = f"질문: {q}\n정답: {a}"
                documents.append(Document(
                    page_content=qa_content,
                    metadata=base_metadata.copy() 
                ))
    print(f"JSON 파싱 완료. 총 {len(documents)}개의 Document 생성.")
    return documents

def create_and_store_embeddings(document_id: str, documents: list[Document]):
    # ... (이전과 동일) ...
    if not documents:
        raise ValueError("임베딩할 Document가 없습니다.")
    if not embedding_model:
        raise ValueError("임베딩 모델이 초기화되지 않았습니다.")
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100)
    chunks = text_splitter.split_documents(documents)
    if not chunks:
        print("경고: 텍스트 분할 후 청크가 없습니다.")
        return
    collection_name = _get_collection_name(document_id)
    print(f"텍스트 분할 완료. 총 {len(chunks)}개의 청크 생성. 컬렉션: {collection_name}")
    vector_store = Chroma.from_documents(
        documents=chunks,
        embedding=embedding_model,
        collection_name=collection_name, 
        persist_directory=CHROMA_PERSIST_DIRECTORY
    )
    print(f"'{document_id}' (컬렉션: {collection_name}) 임베딩 및 저장 완료.")


# --- (수정) 워크플로우 2: RAG 질의응답 (TTS/간결한 답변 최적화) ---

def get_rag_chain(document_id: str): 
    """
    (수정) LCEL 체인 + TTS/간결한 답변 프롬프트 적용
    """
    if not embedding_model or not llm:
        raise ValueError("LLM 또는 임베딩 모델이 초기화되지 않았습니다.")

    collection_name = _get_collection_name(document_id)

    # 1. Retriever 로드
    # (🚨 수정 1) LLM 입력(Context) 최소화로 응답 속도 향상
    # k=5 (너무 많음) -> k=3 (적절)
    retriever = Chroma(
        persist_directory=CHROMA_PERSIST_DIRECTORY,
        embedding_function=embedding_model,
        collection_name=collection_name 
    ).as_retriever(
        search_type="mmr",
        search_kwargs={"k": 3} # 5 -> 3
    )

    # 2. (유지) 1단계: 질문 재구성 프롬프트
    rephrase_prompt = ChatPromptTemplate.from_messages([
        MessagesPlaceholder(variable_name="chat_history"),
        ("user", "{input}"),
        ("user", "이전 대화 내용을 참고하여, 위 질문을 검색하기 좋은 독립적인 질문으로 다시 작성해주세요.")
    ])
    
    # 3. (유지) 1단계 체인: History-Aware Retriever
    history_aware_retriever = create_history_aware_retriever(
        llm=llm, 
        retriever=retriever, 
        prompt=rephrase_prompt
    )

    # 4. (🚨 수정 2) 2단계: 답변 생성 프롬프트 (TTS 최적화)
    # LLM이 간결하게 답변하도록 시스템 프롬프트를 수정
    answer_prompt = ChatPromptTemplate.from_messages([
        ("system", """
         당신은 학생의 질문에 답변하는 친절하고 전문적인 AI 교사입니다.
         
         [!!중요 규칙!!]
         1. 학생은 이 답변을 모바일에서 **음성(TTS)으로 듣습니다.**
         2. 따라서, 답변은 **반드시 1~2문장의 간결하고 명확한 핵심 요약**으로 제공해야 합니다.
         3. 절대 길게 설명하지 마세요. 학생이 듣기에 불편합니다.
         
         [답변 생성 규칙]
         1. 오직 아래에 제공되는 [문서 내용]만을 근거로 답변해야 합니다.
         2. 근거를 찾을 수 없으면 "자료에 해당 내용이 없습니다"라고만 답변하세요.
         3. 답변 마지막에 참고한 문서의 [출처]를 (출처: ...) 형식으로 덧붙여주세요.
         
         [문서 내용]:
         {context}
         """),
        MessagesPlaceholder(variable_name="chat_history"),
        ("user", "{input}")
    ])
    
    # 5. (유지) 2단계 체인: Document Chain
    document_chain = create_stuff_documents_chain(llm, answer_prompt)
    
    # 6. (유지) 1단계와 2단계를 결합한 최종 체인
    conversational_retrieval_chain = create_retrieval_chain(
        history_aware_retriever, # 1단계
        document_chain         # 2단계
    )
    
    return conversational_retrieval_chain