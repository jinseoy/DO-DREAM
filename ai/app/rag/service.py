import os
import httpx 
import json
import re     
import html   
from sqlalchemy.orm import Session
from app.config import GMS_KEY 

# --- LangChain v1.0+ 모듈형 임포트 ---
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_chroma import Chroma

# --- ✅ langchain-classic 패키지 사용 ---
from langchain_classic.memory import ConversationSummaryBufferMemory
from langchain_classic.chains import ConversationalRetrievalChain

from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from fastapi import HTTPException

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
        model_name="gpt-5", 
        api_key=GMS_KEY,
        base_url=GMS_BASE_URL
    )
except Exception as e:
    print(f"GMS/OpenAI 모델 초기화 실패: {e}")
    embedding_model = None
    llm = None

# --- (신규) ID-컬렉션명 변환 헬퍼 함수 ---
def _get_collection_name(document_id: str) -> str:
    """
    외부 document_id(숫자형 문자열)를 ChromaDB의 유효한
    collection_name(3자 이상)으로 변환합니다.
    
    Spring/Client는 Long ID(예: "1")를 사용하므로, "material_" 접두사를 붙여
    ChromaDB의 3자 이상 유효성 검사를 통과시킵니다.
    """
    # ID가 비어있거나 None이면 안 됨
    if not document_id:
        raise ValueError("Document ID가 비어있습니다.")
        
    # ChromaDB 규칙에 맞게 접두사 추가
    return f"material_{document_id}"
# ---------------------------------------------

# --- 워크플로우 1: 임베딩 생성 (Service Logic) ---

async def download_json_from_cloudfront(url: str) -> dict:
    """
    httpx를 사용하여 CloudFront (Pre-signed) URL에서
    JSON 파일을 비동기적으로 다운로드합니다.
    """
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
    """
    HTML 문자열에서 태그를 제거하고 텍스트만 추출하는 헬퍼 함수
    """
    if not html_text:
        return ""
    text = re.sub(r'<br\s*/?>', '\n', html_text, flags=re.IGNORECASE)
    text = re.sub(r'<[^>]+>', ' ', text)
    text = html.unescape(text)
    text = ' '.join(text.split())
    return text

def extract_data_from_json(json_data: dict) -> list[Document]:
    """
    [실제 파서 V2] 새로운 "chapters" JSON 스키마를 파싱하여 Document 리스트 반환
    """
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
    """
    (수정) Document 리스트를 받아 텍스트를 분할(chunking)하고,
    'document_id'를 'collection_name'으로 변환하여 ChromaDB에 저장합니다.
    """
    if not documents:
        raise ValueError("임베딩할 Document가 없습니다.")
    if not embedding_model:
        raise ValueError("임베딩 모델이 초기화되지 않았습니다.")

    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100)
    chunks = text_splitter.split_documents(documents)
    
    if not chunks:
        print("경고: 텍스트 분할 후 청크가 없습니다. (원본 Document가 너무 짧을 수 있음)")
        return
        
    # --- (핵심 수정) ---
    # FastAPI로 받은 ID(예: "1")를 ChromaDB용 이름(예: "material_1")으로 변환
    collection_name = _get_collection_name(document_id)
    # -------------------

    print(f"텍스트 분할 완료. 총 {len(chunks)}개의 청크 생성. 컬렉션: {collection_name}")

    # ChromaDB에 저장
    vector_store = Chroma.from_documents(
        documents=chunks,
        embedding=embedding_model,
        collection_name=collection_name, # (수정) document_id -> collection_name
        persist_directory=CHROMA_PERSIST_DIRECTORY
    )
    print(f"'{document_id}' (컬렉션: {collection_name}) 임베딩 및 저장 완료.")


# --- 워크플로우 2: RAG 질의응답 (Service Logic) ---

def get_rag_chain(document_id: str, chat_history: list) -> ConversationalRetrievalChain:
    """
    (수정) 'document_id'를 'collection_name'으로 변환하여 RAG 체인을 생성합니다.
    """
    if not embedding_model or not llm:
        raise ValueError("LLM 또는 임베딩 모델이 초기화되지 않았습니다.")

    # --- (핵심 수정) ---
    # FastAPI로 받은 ID(예: "1")를 ChromaDB용 이름(예: "material_1")으로 변환
    collection_name = _get_collection_name(document_id)
    # -------------------

    # 1. Retriever 로드
    retriever = Chroma(
        persist_directory=CHROMA_PERSIST_DIRECTORY,
        embedding_function=embedding_model,
        collection_name=collection_name # (수정) document_id -> collection_name
    ).as_retriever(
        search_type="mmr",
        search_kwargs={"k": 3}
    )

    # 2. 메모리 생성
    memory = ConversationSummaryBufferMemory(
        llm=llm,
        max_token_limit=1000,
        memory_key="chat_history",
        return_messages=True,
        output_key='answer'
    )
    
    # 이전 대화 내역을 메모리에 채우기
    for role, content in chat_history:
        if role == "user":
            memory.chat_memory.add_user_message(content)
        elif role == "ai":
            memory.chat_memory.add_ai_message(content)

    # 3. RAG 체인 생성
    chain = ConversationalRetrievalChain.from_llm(
        llm=llm,
        retriever=retriever,
        memory=memory,
        return_source_documents=True,
        verbose=True
    )
    return chain