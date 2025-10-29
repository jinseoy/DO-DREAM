# PDF OCR API 사용 가이드

## 개요
Naver Clova OCR을 사용하여 PDF 파일을 텍스트로 변환하는 API입니다.

## 주요 기능
- PDF 파일 업로드
- 비동기 OCR 처리
- 페이지별 텍스트 추출
- 텍스트 좌표 정보 저장 (하이라이팅 가능)

## API 엔드포인트

### 1. PDF 파일 업로드 및 OCR 시작

```http
POST http://localhost:8080/api/files/upload
Content-Type: multipart/form-data
```

**요청 파라미터:**
- `file`: PDF 파일 (최대 50MB)
- `uploaderId`: 업로드한 선생님 ID (Long)

**응답 예시:**
```json
{
  "fileId": 1,
  "originalFileName": "lesson.pdf",
  "fileSize": 2048576,
  "ocrStatus": "PENDING",
  "message": "File uploaded successfully. OCR processing started.",
  "uploadedAt": "2025-10-28T11:30:00"
}
```

**OCR 상태:**
- `PENDING`: 대기 중
- `PROCESSING`: 처리 중
- `COMPLETED`: 완료
- `FAILED`: 실패

---

### 2. OCR 결과 조회

```http
GET http://localhost:8080/api/files/{fileId}/ocr-result
```

**응답 예시:**
```json
{
  "fileId": 1,
  "originalFileName": "lesson.pdf",
  "ocrStatus": "COMPLETED",
  "errorMessage": null,
  "uploadedAt": "2025-10-28T11:30:00",
  "completedAt": "2025-10-28T11:31:30",
  "pages": [
    {
      "pageNumber": 1,
      "fullText": "이것은 첫 번째 페이지의 전체 텍스트입니다...",
      "words": [
        {
          "text": "이것은",
          "confidence": 0.99,
          "boundingBox": {
            "x1": 100,
            "y1": 200,
            "x2": 300,
            "y2": 200,
            "x3": 300,
            "y3": 250,
            "x4": 100,
            "y4": 250
          }
        }
      ]
    }
  ]
}
```

---

### 3. 업로더의 파일 목록 조회

```http
GET http://localhost:8080/api/files/uploader/{uploaderId}
```

**응답 예시:**
```json
[
  {
    "fileId": 1,
    "originalFileName": "lesson1.pdf",
    "fileSize": 2048576,
    "ocrStatus": "COMPLETED",
    "uploadedAt": "2025-10-28T11:30:00"
  },
  {
    "fileId": 2,
    "originalFileName": "lesson2.pdf",
    "fileSize": 3145728,
    "ocrStatus": "PROCESSING",
    "uploadedAt": "2025-10-28T11:35:00"
  }
]
```

---

## Postman으로 테스트하기

### 1. PDF 파일 업로드

1. Postman에서 새 요청 생성
2. Method: `POST`
3. URL: `http://localhost:8080/api/files/upload`
4. Body 탭 선택
5. `form-data` 선택
6. Key-Value 입력:
   - Key: `file` (Type: File), Value: PDF 파일 선택
   - Key: `uploaderId` (Type: Text), Value: `1`
7. Send 클릭

### 2. OCR 결과 확인

1. 위에서 받은 `fileId` 복사
2. Method: `GET`
3. URL: `http://localhost:8080/api/files/{fileId}/ocr-result`
4. `{fileId}`를 실제 ID로 변경
5. Send 클릭

---

## 처리 플로우

```
1. 파일 업로드
   → 파일 저장 (로컬: ~/dodream/uploads/)
   → DB에 메타데이터 저장
   → 상태: PENDING

2. 비동기 OCR 처리 시작
   → 상태: PROCESSING
   → PDF를 페이지별 이미지로 변환 (300 DPI)
   → 임시 이미지 저장 (~/dodream/temp/)

3. 각 페이지 OCR
   → Naver Clova OCR API 호출
   → 텍스트 및 좌표 정보 추출
   → DB에 저장 (ocr_pages, ocr_words 테이블)

4. 완료
   → 상태: COMPLETED
   → 임시 파일 삭제
   → completedAt 기록
```

---

## 에러 처리

OCR 처리 중 에러가 발생하면:
- 상태가 `FAILED`로 변경됨
- `errorMessage` 필드에 에러 내용 저장
- 생성된 임시 파일은 자동으로 정리됨

---

## 데이터베이스 스키마

### uploaded_files
- `id`: 파일 ID (PK)
- `original_file_name`: 원본 파일명
- `stored_file_name`: 저장된 파일명 (UUID)
- `file_path`: 파일 경로
- `file_size`: 파일 크기 (bytes)
- `file_type`: MIME 타입
- `ocr_status`: 처리 상태 (ENUM)
- `error_message`: 에러 메시지
- `uploader_id`: 업로더 ID
- `created_at`, `updated_at`, `completed_at`: 타임스탬프

### ocr_pages
- `id`: 페이지 ID (PK)
- `uploaded_file_id`: 파일 ID (FK)
- `page_number`: 페이지 번호
- `full_text`: 페이지 전체 텍스트

### ocr_words
- `id`: 단어 ID (PK)
- `ocr_page_id`: 페이지 ID (FK)
- `text`: 텍스트
- `confidence`: OCR 신뢰도 (0.0 ~ 1.0)
- `x1, y1, x2, y2, x3, y3, x4, y4`: Bounding Box 좌표
- `word_order`: 단어 순서

---

## 주의사항

1. **파일 크기 제한**: 최대 50MB
2. **파일 형식**: PDF만 허용
3. **비동기 처리**: 업로드 즉시 응답을 받지만, OCR은 백그라운드에서 처리됨
4. **처리 시간**: PDF 크기와 페이지 수에 따라 다름 (보통 1-5분)
5. **API 키 관리**: `application.yml`의 Clova OCR Secret Key는 노출되지 않도록 주의

---

## 추가 개발 가능한 기능

- [ ] 페이지별 텍스트만 추출 API
- [ ] 특정 영역(Bounding Box)의 텍스트 검색
- [ ] OCR 처리 진행률 조회
- [ ] WebSocket을 통한 실시간 상태 업데이트
- [ ] S3 등 클라우드 스토리지 연동
- [ ] 썸네일 이미지 생성
- [ ] 텍스트 전문 검색 (Elasticsearch 연동)