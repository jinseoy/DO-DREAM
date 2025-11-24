# 📱 DO:DREAM - AI기반 시각장애인 음성 학습 플랫폼

![img](./img/DODREAM_main_page.png)

## 프로젝트 소개

- 장애를 가진 학생들이 공평하게 학습할 수 있도록, AI 기반 맞춤형 학습 자료를 제공하는 교육 플랫폼입니다.
- RAG(Retrieval-Augmented Generation) 기술과 ChromaDB 벡터 데이터베이스를 활용하여 학습 자료에서 핵심 개념을 추출하고, Cross-EncoderReranker로 최적화된 정보를 기반으로 학생 수준에 맞는 퀴즈를 자동 생성하며 AI가 답안을 즉시 채점합니다.
- 교실 관리 페이지에서 학생별 학습 진행률과 통계를 확인하고, 공유한 학습 자료와 퀴즈 결과를 실시간으로 모니터링할 수 있습니다.
- PDF OCR 기술로 교재를 업로드하면 자동으로 텍스트를 추출하고, LangChain 기반 대화형 AI를 통해 학생이 학습 내용에 대해 질문하면 TTS로 음성 답변을 제공받을 수 있으며, Firebase 푸시 알림과 JWT 인증, AWS S3 파일 관리로 안전하고 편리한 학습 환경을 제공합니다.

## `DO:DREAM` 팀원 구성

<div align="center">

|                                                                  팀장 / FE                                                                  |                                                            FE                                                             |                                                                BE                                                                |
|:-----------------------------------------------------------------------------------------------------------------------------------------:|:----------------------------------------------------------------------------------------------------------------------------------:|:-----------------------------------------------------------------------------------------------------------------------------------------:|
|    [<img src="https://avatars.githubusercontent.com/u/195054777?v=4" height=150 width=150> <br/> @jinseoy](https://github.com/jinseoy)  | [<img src="https://avatars.githubusercontent.com/u/78808933?v=4" height=150 width=150> <br/> @juhye87](https://github.com/juhye87) | [<img src="https://avatars.githubusercontent.com/u/83768801?v=4" height=150 width=150> <br/> @rladbstn1000](https://github.com/rladbstn1000) |
|                                                                  **양진서**                                                                  |                                                              **양세희**                                                               |                                                                  **김윤수**                                                                  |
|                                                                  **BE**                                                                   |                                                               **BE**                                                               |                                                                 **Infra**                                                                 |
| [<img src="https://avatars.githubusercontent.com/u/128020138?v=4" height=150 width=150> <br/> @justlikesh](https://github.com/justlikesh) | [<img src="https://avatars.githubusercontent.com/u/157487365?v=4" height=150 width=150> <br/> @Eun31](https://github.com/Eun31)  |   [<img src="https://avatars.githubusercontent.com/u/172126044?v=4" height=150 width=150> <br/> @jgm0327](https://github.com/jgm0327)   |
|                                                                  **김승호**                                                                  |                                                              **이은**                                                               |                                                                  **장규민**                                                                  |

</div>

## 1. 개발 환경

- Frontend
   - Web: React, Vite, TypeScript
   - App: React Native, TypeScript
- Backend: Spring Boot 3.5.7, Spring Data JPA, Spring Security, MySQL 8.x, Redis
- AI: FastAPI, Python, LangChain, ChromaDB, HuggingFace
- 버전 및 이슈관리: GitLab, Jira
- 협업 툴: Discord, Notion
- 서비스 배포 환경: AWS EC2, Docker, Nginx, HashiCorp Vault, AWS S3, CloudFront, Jenkins
- 외부 API: Naver Clova OCR, Firebase Cloud Messaging, OpenAI API


<br>

## 2. 시스템 아키텍처 및 사용한 기술 스택

### 시스템 아키텍처

![img](./img/dodream_system_architecture.png)

### 기술 스택

![img](./img/dodream_tech_stack.png)


<br>

## 3. 역할 분담

### 🐯 양진서

#### 담당 역할 : 팀장, 프론트엔드 개발(시각장애 학생용 모바일 앱)

- 학습 자료 관리 시스템
    - 학습 자료 목록 조회 및 상세 정보 표시
    - 섹션별 학습 자료 구조화 및 탐색
    - 학습 진행률 추적 및 표시

- 음성 기반 학습 재생 기능
    - TTS 음성 재생 (섹션별/연속/반복 모드)
    - 재생 속도 조절 및 일시정지/재개
    - 스크린 리더와의 오디오 충돌 방지 처리
    - 음성 명령 기반 재생 컨트롤

- AI 음성 Q&A 시스템
    - 음성 입력 기반 질문 등록
    - AI 답변 TTS 출력
    - 질문 히스토리 조회 및 관리

- 학습 지원 기능
    - 북마크 등록
    - 퀴즈 풀기 및 음성 질문/답변

- 접근성 최적화
    - TalkBack/VoiceOver 스크린 리더 완벽 지원
    - 음성 중심 UI/UX 설계
    - 오프라인 학습 지원 (MMKV 로컬 스토리지)

### 👻 김승호

#### 담당 역할 : 백엔드 개발

- PDF 처리 및 OCR 시스템 : PDF 업로드 및 AI 파싱 API  
    - PDF JSON을 TXT로 추출 및 다운로드
    - OCR 기반 문서 구조 감지
    - PDF 파싱 API 통합
- AWS 클라우드 연동 시스템
    - S3 Presigned URL 업로드 기능
    - CloudFront Signed URL 다운로드 기능
    - S3/CloudFront 클라이언트 설정
- Redis 임시 저장 시스템
    - PDF 수정 내용 임시 저장/조회 API
    - Redis 기반 서비스 로직 구현
    - 24시간 자동 삭제
- 개념 Check 추출 시스템
    - JSON 필터링 및 개념 Check 추출
    - FastAPI 연동 및 S3 저장
    - Gemini AI 가공 로직 통합
- 학습 자료 발행 시스템
    - 퀴즈 데이터 JSON 추출 및 S3 저장
    - JSON 콘텐츠 필터링 로직
    - 발행 자료 형식 지원
- 백엔드 인프라 설정
    - 초기 프로젝트 구조 설계
    - 엔티티 설계 및 구현
    - JWT 인증 필터 설정
    - Vault 서버 설정

### 😎 김윤수

#### 담당 역할 : 백엔드 개발

- 보안 인증 시스템 구축: Spring Security와 JWT를 도입하여 토큰 기반 인증/인가 로직을 구현하고, Redis를 활용한 Refresh Token 관리(저장/만료/삭제)를 통해 안전한 로그인 및 로그아웃 프로세스 구축

- 맥락 인식 AI 튜터 구현: LangChain과 ChromaDB를 활용하여 학습 자료 기반 실시간 질의응답(Chatbot) 기능 개발. 대화 히스토리 반영 및 Re-ranking 기술 도입으로 답변 정확도 고도화

- RAG 기반 퀴즈 및 채점 엔진: 학습 자료에서 맞춤형 문제를 자동 생성하고, 의미 기반(Semantic) 유사도 분석을 통해 서술형 답안을 정밀하게 채점

- 학습 성취도 분석: 퀴즈 중복 풀이 방지(Latest Attempt) 알고리즘을 적용하여, 왜곡 없는 정확한 학습 정답률 통계 및 오답 분석 데이터 제공

### 🐬 양세희

#### 담당 역할 : 프론트엔드 개발 (교사용 웹 개발)

- 학습 자료 관리: 학습 자료 편집 에디터, 자료 발행 및 전송, 워드로 다운로드
- 학생 학습현황 리포트: 학습 진도율, 퀴즈 성적, 질의응답 정보 기록
- 기타 서비스: 자료 컬러 라벨 필터링, 메모장

### 😀 장규민

#### 담당 역할 : 백엔드 & 인프라 개발

- HTTPS 통신 구축 : Nginx를 활용해 SSL 기반 HTTPS 환경 구성
- 블루-그린 배포 : 서비스 무중단 배포 환경 설계 및 운영
- 설정 관리 자동화 : Vault로 민감 정보 및 환경 변수 중앙 관리
- CI/CD 파이프라인 구축 : Jenkins를 활용해 Web, Backend, AI 서비스 자동 빌드·배포
- 학생 상세 정보 조회 : 사용자별 학습 정보 및 프로필 조회 API 개발
- 학습 진행률 관리 : 학습 진도 저장, 조회, 계산 로직 구현 및 데이터 구조 설계

### 😃 이은

#### 담당 역할 : 백엔드 개발

- 자료 발행 시스템
    - 변환 완료된 학습 자료 발행 처리 API 개발
    - 발행 상태 변경 로직 구현
- 발행 자료 조회
    - 교사별 발행 자료 목록 조회 API 개발
    - 발행 이력 및 상태 확인 기능 구현
- 자료 공유 시스템
    - 공유가능한 학생 목록 조회
    - 교사가 학습 자료를 학생에게 공유하는 API 개발
- 푸시 알림 시스템
    - FCM 연동을 통한 자료 공유 시 학생 실시간 알림 기능 구현

<br>

## 4. 개발 기간 및 작업 관리

### 개발 기간

- 전체 개발 기간 : 2025-10-02 ~ 2025-11-23
- 기획 및 설계 : 2025-10-02 ~ 2025-10-12
- UI 구현 : 2025-10-12 ~ 2025-10-20
- 기능 구현 : 2025-10-20 ~ 2025-11-20

### 작업 관리

- Jira 이슈 관리 및 대시보드를 활용하여 팀 전체의 작업 진행 상황을 공유했습니다.
- 매일 아침 9시 10분 데일리 스크럼을 진행하여 문제 상황, 진행도, 오늘 할 일 등을 공유하고, Notion 페이지에 스크럼 회의 내용을 기록했습니다.

<br>

## 5. 신경 쓴 부분

### 1. PDF 바이너리 직접 처리 및 파일명 인코딩 안정성 확보

  - Content-Type 직접 지정: Content-Type: application/pdf로 바이너리 직접 전송하여 Multipart 오버헤드 제거
  - 한글 파일명 처리: URLEncoder.encode(filename, StandardCharsets.UTF_8)로 한글 파일명 URL 인코딩
  - S3 메타데이터 관리: Map.of("original-filename", encodedFilename)로 S3 객체에 원본 파일명 보존
  - 동적 S3 Key 생성: UUID.randomUUID()로 중복 없는 고유 키 생성 및 사용자별 디렉토리 구조화

### 2. CloudFront Signed URL 생성의 Private Key 파싱

  - PEM 형식 정규화: replace("\\n", "\n")로 Vault에 저장된 줄바꿈 이스케이프 처리
  - Base64 디코딩: Base64.getDecoder().decode(normalized)로 Private Key 복호화
  - RSA KeyFactory 활용: KeyFactory.getInstance("RSA").generatePrivate()로 PrivateKey 객체 생성
  - 만료 시간 설정: Instant.now().plus(1, ChronoUnit.HOURS)로 1시간 유효 Signed URL 발급

 ### 3. Redis 기반 임시 저장 시스템의 TTL 관리

  - Redis Key 전략: "temp-pdf:%d:%d".formatted(pdfId, userId)로 사용자별 격리된 키 구조
  - TTL 자동 만료: Duration.ofHours(24)로 24시간 후 자동 삭제
  - JSON 직렬화/역직렬화: ObjectMapper.writeValueAsString()로 복잡한 객체를 Redis에 안전하게 저장
  - 예외 처리: 임시 저장 실패 시에도 메인 프로세스 롤백 방지

### 4. FastAPI 외부 API 연동 및 타임아웃 관리

  - WebClient 비동기 통신: Spring WebFlux WebClient로 FastAPI 호출
  - 타임아웃 설정: .timeout(Duration.ofMinutes(5))로 대용량 PDF 파싱 시간 확보
  - 에러 핸들링: onStatus().map(errorBody -> RuntimeException)으로 4xx/5xx 에러 감지 및 처리
  - 블로킹 제어: .block()으로 동기식 응답 대기 및 트랜잭션 정합성 보장

### 5. 복잡한 JSON 필터링 및 퀴즈 데이터 분리 로직

  - 타입별 콘텐츠 분리: filterQuizChapters()로 type: "quiz"인 챕터만 추출
  - 이중 저장 전략: 전체 JSON과 퀴즈 전용 JSON을 별도 S3 경로에 저장
  - 동적 S3 Key 생성: String.format("quiz-json/%s/%s_quiz.json", userId, pdfId)로 사용자/파일별 구조화
  - 독립적 에러 처리: 퀴즈 저장 실패 시 발행 프로세스는 정상 진행

### 6. S3 업로드 프로세스의 메타데이터 관리

  - PutObjectRequest 빌더 패턴: AWS SDK v2의 빌더로 타입 안전한 요청 생성
  - 메타데이터 타임스탬프: LocalDateTime.now().toString()로 업로드/파싱 시간 기록
  - RequestBody 인코딩: RequestBody.fromString(json, StandardCharsets.UTF_8)로 UTF-8 보장

### 7. 초기 RAG 임베딩 비동기 처리 및 장애 격리

  - 임베딩 비동기 호출: PDF 파싱 완료 후 FastAPI RAG 임베딩 API 즉시 호출
  - 장애 격리: try-catch로 임베딩 실패 시에도 파일 업로드는 성공 처리
  - Authorization 헤더 전달: authorizationHeader로 JWT 토큰을 FastAPI에 전달하여 사용자 인증 유지
  - 로그 기반 추적: 임베딩 실패 시 로그 남기고 별도 재처리 가능하도록 설계


<br>

## 6. 개선 목표

### 1. RAG 임베딩 실패 시 재처리 메커니즘 구현

  현재 PDF 파싱 후 RAG 임베딩 생성 시 실패하면 로그만 남기고 파일 업로드는 성공 처리됩니다. 이로 인해 임베딩이 없는 자료는 AI 챗봇 질의응답이 불가능한 문제가 있습니다.
  이를 해결하기 위해 Redis Queue를 활용한 재처리 시스템을 구현하고, Spring Scheduler로 주기적으로 실패한 임베딩을
  재시도하는 기능을 추가할 예정입니다.

### 2. AI 퀴즈 채점 병렬 처리 최적화

  현재 퀴즈 채점은 안정성을 위해 순차 처리되어 10문제 채점 시 약 30초 이상 소요되는 문제가 있습니다. 이를 해결하기 위해 FastAPI의
  asyncio.gather()를 활용하여 여러 답안을 병렬로 채점하고, Spring WebClient의 타임아웃을 동적으로 조정하여 응답 속도를 3~5배 개선할 계획입니다.     

### 3. CloudFront Signed URL 캐싱 전략 도입

  현재 PDF/JSON 조회 시마다 CloudFront Signed URL을 새로 생성하여 Private Key 파싱 및 서명 작업이 반복되는 문제가 있습니다. 이를 해결하기 위해 Spring Cache(Caffeine)를 활용하여 URL을 50분간 캐싱하고, 만료 10분 전에 자동 갱신하는 방식으로 API 응답 속도를 개선할 예정입니다.

### 4. PDF 파싱 타임아웃 동적 조정 및 진행률 피드백

  현재 FastAPI 호출 시 5분 고정 타임아웃으로 인해 대용량 PDF(50페이지 이상) 파싱 시 실패하는 경우가 발생합니다. 이를 해결하기 위해 파일 크기에 따라 타임아웃을 동적으로 계산하고(1MB당 30초), WebSocket 또는 SSE를 통해 클라이언트에 파싱 진행률을 실시간으로 전달하는 기능을 구현할
  계획입니다.

### 5. 학습 진행률 조회 쿼리 N+1 문제 해결

  현재 학생의 전체 교재 진행률 조회 시 MaterialShare와 Material, Progress를 개별 쿼리로 조회하여 N+1 문제가 발생하는 상황입니다. 이를 해결하기 위해 JPA의 @EntityGraph 또는 Querydsl의 Fetch Join을 활용하여 한 번의 쿼리로 모든 데이터를 조회하고, DTO Projection을 통해 불필요한 필드 로딩을 최소화할 예정입니다.
