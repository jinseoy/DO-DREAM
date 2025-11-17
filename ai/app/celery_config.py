from celery import Celery
from app.config import CELERY_BROKER_URL

# Celery 앱 인스턴스 생성
celery_app = Celery(
    'dodream_rag_worker',
    broker=CELERY_BROKER_URL,
    backend=CELERY_BROKER_URL, # 작업 결과도 Redis에 저장
    include=['app.rag.tasks']  # Celery가 이 파일을 스캔하여 @task를 찾음
)

# Celery 설정
celery_app.conf.update(
    task_track_started=True,
    broker_connection_retry_on_startup=True, # 서버 시작 시 Redis 연결 재시도
    result_expires=3600, # 작업 결과 1시간 후 만료
)

if __name__ == '__main__':
    celery_app.start()