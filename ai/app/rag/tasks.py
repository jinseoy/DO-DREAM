import httpx # (수정) Celery는 동기 작업이 기본이므로, 'async'가 아닌 'sync' httpx 사용
import json
from app.celery_config import celery_app
from app.rag.service import (
    extract_data_from_json,
    create_and_store_embeddings,
    _get_collection_name # (service.py의 헬퍼 함수 임포트)
)
from fastapi import HTTPException
import logging

# 로거 설정
log = logging.getLogger(__name__)

def download_json_sync(url: str) -> dict:
    """
    (수정) Celery 동기 작업을 위한 '동기식(sync)' 다운로더
    """
    try:
        # service.py의 async Httpx와 달리, sync Httpx 사용
        response = httpx.get(url, follow_redirects=True, timeout=60.0)
        
        if response.status_code != 200:
            log.error(f"CloudFront/S3 JSON 다운로드 실패 (URL: {url}): HTTP {response.status_code}")
            # Celery 작업 내에서는 HTTPException 대신 Exception을 발생시키는 것이 좋음
            raise Exception(f"HTTP {response.status_code} - {response.text}")
        
        return response.json()

    except httpx.TimeoutException:
        log.error(f"JSON 다운로드 시간 초과 (URL: {url})")
        raise
    except json.JSONDecodeError:
        log.error(f"다운로드된 파일이 유효한 JSON이 아님 (URL: {url})")
        raise
    except Exception as e:
        log.error(f"JSON 다운로드 중 오류 (URL: {url}): {str(e)}")
        raise


@celery_app.task(name="create_embedding_task", bind=True, max_retries=3)
def create_embedding_task(self, document_id: str, s3_url: str):
    """
    (신규) Celery 백그라운드 작업
    JSON 다운로드, 파싱, 임베딩, 저장을 순차적으로 수행합니다.
    """
    try:
        log.info(f"[Task Start] 임베딩 작업 시작. DocID: {document_id}")
        
        # 1. (수정) 동기식 다운로더 호출
        log.info(f"Downloading: {s3_url}")
        json_data = download_json_sync(s3_url)
        log.info(f"Download Complete. DocID: {document_id}")

        # 2. 파싱 (service.py 함수 재사용)
        documents = extract_data_from_json(json_data)
        log.info(f"Parsing Complete. {len(documents)}개 Document 생성.")

        # 3. 임베딩 및 저장 (service.py 함수 재사용)
        create_and_store_embeddings(document_id, documents)
        log.info(f"[Task Success] 임베딩 작업 완료. DocID: {document_id}")

        return {"status": "success", "document_id": document_id}

    except Exception as e:
        log.error(f"[Task Failed] 임베딩 작업 실패. DocID: {document_id}. Error: {e}")
        # (수정) 3회 재시도 (예: 네트워크 오류 시)
        raise self.retry(exc=e, countdown=60) # 60초 후 재시도