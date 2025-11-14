package A704.DODREAM.file.service;

import A704.DODREAM.file.entity.OcrStatus;
import A704.DODREAM.file.entity.UploadedFile;
import A704.DODREAM.file.repository.UploadedFileRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.transaction.annotation.Transactional;
import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.security.KeyFactory;
import java.security.PrivateKey;
import java.security.Signature;
import java.security.spec.PKCS8EncodedKeySpec;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.reactive.function.client.WebClient;
import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;

@Service
@Slf4j
public class PdfService {

  @Autowired
  private UploadedFileRepository uploadedFileRepository;

  @Autowired
  private CloudFrontService cloudFrontService;

  @Autowired
  private WebClient webClient;

  @Autowired
  private S3Client s3Client;  // AWS SDK v2

  @Value("${fastapi.url}")
  private String fastApiUrl;

  @Value("${aws.s3.bucket}")
  private String bucketName;

  @Value("${aws.cloudfront.domain}")
  private String cloudFrontDomain;

  @Value("${aws.cloudfront.key-pair-id}")
  private String keyPairId;

  @Value("${aws.cloudfront.private-key-pem}")
  private String privateKeyPath;

  @Autowired
  private ObjectMapper objectMapper;  // JSON 직렬화용

  @Value("${aws.s3.upload-prefix:pdfs}")
  private String uploadPrefix;

  /**
   * PDF 업로드 + 파싱 통합 API (바이너리 스트림 방식)
   *
   * @param pdfBytes: PDF 바이너리 데이터
   * @param filename: 원본 파일명
   * @param userId: 사용자 ID
   * @return 파싱된 결과 및 메타데이터
   */
  @Transactional
  public Map<String, Object> uploadAndParsePdfFromBytes(byte[] pdfBytes, String filename, Long userId) {
    try {
      // 1. 파일 검증
      if (pdfBytes == null || pdfBytes.length == 0) {
        throw new RuntimeException("파일이 비어있습니다.");
      }

      if (filename == null || !filename.toLowerCase().endsWith(".pdf")) {
        throw new RuntimeException("PDF 파일만 업로드 가능합니다.");
      }

      // 2. S3 키 생성
      String s3Key = generateS3Key(filename);

      // 3. S3에 업로드 (한글 파일명 URL 인코딩 처리)
      String encodedFilename = URLEncoder.encode(filename, StandardCharsets.UTF_8);

      PutObjectRequest putRequest = PutObjectRequest.builder()
          .bucket(bucketName)
          .key(s3Key)
          .contentType("application/pdf")
          .metadata(Map.of(
              "original-filename", encodedFilename,
              "uploaded-by", userId.toString(),
              "uploaded-at", LocalDateTime.now().toString()
          ))
          .build();

      s3Client.putObject(
          putRequest,
          RequestBody.fromBytes(pdfBytes)
      );

      log.info("✅ PDF S3 업로드 완료: {}", s3Key);

      // 4. DB에 UploadedFile 레코드 생성
      UploadedFile uploadedFile = UploadedFile.builder()
          .originalFileName(filename)
          .s3Key(s3Key)
          .s3Bucket(bucketName)
          .contentType("application/pdf")
          .fileSize((long) pdfBytes.length)
          .ocrStatus(OcrStatus.PENDING)
          .uploaderId(userId)
          .build();

      UploadedFile savedFile = uploadedFileRepository.save(uploadedFile);

      log.info("✅ DB 저장 완료: pdfId={}", savedFile.getId());

      // 5. CloudFront signed URL 생성
      String cloudFrontUrl = cloudFrontService.generateSignedUrl(s3Key);

      // 6. FastAPI 호출하여 파싱
      String fastApiEndpoint = fastApiUrl + "/document/parse-pdf-from-cloudfront";

      Map<String, String> request = new HashMap<>();
      request.put("cloudfront_url", cloudFrontUrl);

      ResponseEntity<Map> response = webClient.post().uri(fastApiEndpoint)
          .bodyValue(request)
          .retrieve()
          .onStatus(status -> status.is4xxClientError() || status.is5xxServerError(),
              clientResponse -> clientResponse.bodyToMono(String.class)
                  .map(errorBody -> new RuntimeException("FastAPI 에러: " + errorBody)))
          .toEntity(Map.class)
          .block();

      if (response.getBody() == null) {
        throw new RuntimeException("FastAPI 응답이 비어있습니다.");
      }

      Map<String, Object> parsedData = (Map<String, Object>) response.getBody().get("parsed_data");

      if (parsedData == null) {
        throw new RuntimeException("FastAPI 응답에 parsed_data가 없습니다.");
      }

      // 7. JSON을 S3에 저장
      String jsonS3Key = uploadJsonToS3(s3Key, parsedData, userId.toString());

      // 8. DB 업데이트 (파싱 결과 반영)
      savedFile.setJsonS3Key(jsonS3Key);
      savedFile.setParsedAt(LocalDateTime.now());

      // 필수 필드만 DB에 저장 (검색용)
      if (parsedData.containsKey("indexes")) {
        List<String> indexes = (List<String>) parsedData.get("indexes");
        savedFile.setIndexes(String.join(",", indexes));
      }

      uploadedFileRepository.save(savedFile);

      log.info("✅ 전체 프로세스 완료: pdfId={}", savedFile.getId());

      return Map.of(
          "pdfId", savedFile.getId(),
          "filename", filename,
          "parsedData", parsedData
      );

    } catch (Exception e) {
      throw new RuntimeException("PDF 업로드 및 파싱 실패: " + e.getMessage());
    }
  }

  /**
   * PDF 업로드 + 파싱 통합 API (MultipartFile 방식)
   *
   * @param file: 업로드할 PDF 파일
   * @param userId: 사용자 ID
   * @return 파싱된 결과 및 메타데이터
   */
  @Transactional
  public Map<String, Object> uploadAndParsePdf(MultipartFile file, Long userId) {
    try {
      // 1. 파일 검증
      if (file.isEmpty()) {
        throw new RuntimeException("파일이 비어있습니다.");
      }

      String originalFilename = file.getOriginalFilename();
      if (originalFilename == null || !originalFilename.toLowerCase().endsWith(".pdf")) {
        throw new RuntimeException("PDF 파일만 업로드 가능합니다.");
      }

      // 2. S3 키 생성
      String s3Key = generateS3Key(originalFilename);

      // 3. S3에 업로드 (한글 파일명 URL 인코딩 처리)
      String encodedFilename = URLEncoder.encode(originalFilename, StandardCharsets.UTF_8);

      PutObjectRequest putRequest = PutObjectRequest.builder()
          .bucket(bucketName)
          .key(s3Key)
          .contentType("application/pdf")
          .metadata(Map.of(
              "original-filename", encodedFilename,
              "uploaded-by", userId.toString(),
              "uploaded-at", LocalDateTime.now().toString()
          ))
          .build();

      s3Client.putObject(
          putRequest,
          RequestBody.fromInputStream(file.getInputStream(), file.getSize())
      );

      log.info("✅ PDF S3 업로드 완료: {}", s3Key);

      // 4. DB에 UploadedFile 레코드 생성
      UploadedFile uploadedFile = UploadedFile.builder()
          .originalFileName(originalFilename)
          .s3Key(s3Key)
          .s3Bucket(bucketName)
          .contentType("application/pdf")
          .fileSize(file.getSize())
          .ocrStatus(OcrStatus.PENDING)
          .uploaderId(userId)
          .build();

      UploadedFile savedFile = uploadedFileRepository.save(uploadedFile);

      log.info("✅ DB 저장 완료: pdfId={}", savedFile.getId());

      // 5. CloudFront signed URL 생성
      String cloudFrontUrl = cloudFrontService.generateSignedUrl(s3Key);

      // 6. FastAPI 호출하여 파싱
      String fastApiEndpoint = fastApiUrl + "/document/parse-pdf-from-cloudfront";

      Map<String, String> request = new HashMap<>();
      request.put("cloudfront_url", cloudFrontUrl);

      ResponseEntity<Map> response = webClient.post().uri(fastApiEndpoint)
          .bodyValue(request)
          .retrieve()
          .onStatus(status -> status.is4xxClientError() || status.is5xxServerError(),
              clientResponse -> clientResponse.bodyToMono(String.class)
                  .map(errorBody -> new RuntimeException("FastAPI 에러: " + errorBody)))
          .toEntity(Map.class)
          .block();

      if (response.getBody() == null) {
        throw new RuntimeException("FastAPI 응답이 비어있습니다.");
      }

      Map<String, Object> parsedData = (Map<String, Object>) response.getBody().get("parsed_data");

      if (parsedData == null) {
        throw new RuntimeException("FastAPI 응답에 parsed_data가 없습니다.");
      }

      // 7. JSON을 S3에 저장
      String jsonS3Key = uploadJsonToS3(s3Key, parsedData, userId.toString());

      // 8. DB 업데이트 (파싱 결과 반영)
      savedFile.setJsonS3Key(jsonS3Key);
      savedFile.setParsedAt(LocalDateTime.now());

      // 필수 필드만 DB에 저장 (검색용)
      if (parsedData.containsKey("indexes")) {
        List<String> indexes = (List<String>) parsedData.get("indexes");
        savedFile.setIndexes(String.join(",", indexes));
      }

      uploadedFileRepository.save(savedFile);

      log.info("✅ 전체 프로세스 완료: pdfId={}", savedFile.getId());

      return Map.of(
          "pdfId", savedFile.getId(),
          "filename", originalFilename,
          "s3Key", s3Key,
          "jsonS3Key", jsonS3Key,
          "parsedData", parsedData
      );

    } catch (IOException e) {
      throw new RuntimeException("파일 업로드 실패: " + e.getMessage());
    } catch (Exception e) {
      throw new RuntimeException("PDF 업로드 및 파싱 실패: " + e.getMessage());
    }
  }

  /**
   * S3 키 생성 (UUID 기반)
   */
  private String generateS3Key(String originalFileName) {
    String uuid = UUID.randomUUID().toString();
    String extension = ".pdf";

    int lastDotIndex = originalFileName.lastIndexOf('.');
    if (lastDotIndex > 0) {
      extension = originalFileName.substring(lastDotIndex);
    }

    return uploadPrefix + "/" + uuid + extension;
  }

  /**
   * PDF 파싱 및 JSON S3 저장 (기존 방식 - presigned URL 사용)
   */
  @Transactional
  public Map<String, Object> parsePdfAndSave(Long pdfId, Long userId) {
    // 1. DB에서 PDF 정보 조회
    UploadedFile uploadedFile = uploadedFileRepository.findById(pdfId)
        .orElseThrow(() -> new RuntimeException("PDF not found"));

    // 2. 권한 검증
    if (!uploadedFile.getUploaderId().equals(userId)) {
      throw new RuntimeException("Not your PDF");
    }

    // 3. S3 키 확인
    if (uploadedFile.getS3Key() == null) {
      throw new RuntimeException("S3 key not found. Please upload via presigned URL first.");
    }

    // 4. CloudFront signed URL 생성
//    String cloudFrontUrl = generateCloudFrontSignedUrl(uploadedFile.getS3Key());

    String cloudFrontUrl = cloudFrontService.generateSignedUrl(uploadedFile.getS3Key());
    // 5. FastAPI 호출
    String fastApiEndpoint = fastApiUrl + "/document/parse-pdf-from-cloudfront";

    Map<String, String> request = new HashMap<>();
    request.put("cloudfront_url", cloudFrontUrl);

    try {
      ResponseEntity<Map> response = webClient.post().uri(fastApiEndpoint)
          .bodyValue(request)
          .retrieve()
          .onStatus(status -> status.is4xxClientError() || status.is5xxServerError(),
              clientResponse -> clientResponse.bodyToMono(String.class)
                  .map(errorBody -> new RuntimeException("FastAPI 에러: " + errorBody)))
          .toEntity(Map.class)
          .block();

      if (response.getBody() == null) {
        throw new RuntimeException("FastAPI 응답이 비어있습니다.");
      }

      Map<String, Object> parsedData = (Map<String, Object>) response.getBody().get("parsed_data");

      if (parsedData == null) {
        throw new RuntimeException("FastAPI 응답에 parsed_data가 없습니다.");
      }

      // ===== 6. JSON을 S3에 저장 =====
      String jsonS3Key = uploadJsonToS3(uploadedFile.getS3Key(), parsedData, userId.toString());

      // ===== 7. DB 업데이트 (메타데이터 + 필수 필드만) =====
      uploadedFile.setJsonS3Key(jsonS3Key);  // S3에 저장된 JSON 경로
      uploadedFile.setParsedAt(LocalDateTime.now());

      // 필수 필드만 DB에 저장 (검색용)
      if (parsedData.containsKey("indexes")) {
        List<String> indexes = (List<String>) parsedData.get("indexes");
        uploadedFile.setIndexes(String.join(",", indexes));  // 목차만 DB에
      }

      uploadedFileRepository.save(uploadedFile);

      return Map.of(
          "pdfId", pdfId,
          "filename", uploadedFile.getOriginalFileName(),
          "jsonS3Key", jsonS3Key,  // 프론트에 S3 경로 알려줌
          "parsedData", parsedData  // 즉시 사용할 수 있게 전체 JSON도 반환
      );

    } catch (Exception e) {
      throw new RuntimeException("PDF 파싱 실패: " + e.getMessage());
    }
  }

  /**
   * JSON을 S3에 업로드
   *
   * @param pdfS3Key: 원본 PDF의 S3 키 (예: pdfs/user123/2024/01/abc123.pdf)
   * @param jsonData: 파싱된 JSON 데이터
   * @param username: 사용자 ID
   * @return S3에 저장된 JSON의 키
   */
  private String uploadJsonToS3(String pdfS3Key, Map<String, Object> jsonData, String username) {
    try {
      // PDF 경로에서 파일명 추출
      // pdfs/user123/2024/01/abc123.pdf → abc123
      String filename = pdfS3Key.substring(pdfS3Key.lastIndexOf("/") + 1)
          .replace(".pdf", "");

      // JSON S3 키 생성 (같은 구조로)
      // parsed-json/user123/2024/01/abc123.json
      String jsonS3Key = pdfS3Key
          .replace(uploadPrefix + "/", "parsed-json/")
          .replace(".pdf", ".json");

      // JSON을 예쁘게 포맷팅
      String jsonString = objectMapper.writerWithDefaultPrettyPrinter()
          .writeValueAsString(jsonData);
      String encodedUsername = URLEncoder.encode(username, StandardCharsets.UTF_8);

      // S3에 업로드
      PutObjectRequest putRequest = PutObjectRequest.builder()
          .bucket(bucketName)
          .key(jsonS3Key)
          .contentType("application/json")
          .metadata(Map.of(
              "original-pdf", pdfS3Key,
              "parsed-at", LocalDateTime.now().toString(),
              "owner", encodedUsername
          ))
          .build();

      s3Client.putObject(
          putRequest,
          RequestBody.fromString(jsonString)
      );

      System.out.println("✅ JSON S3 저장 완료: " + jsonS3Key);

      return jsonS3Key;

    } catch (JsonProcessingException e) {
      throw new RuntimeException("JSON 직렬화 실패: " + e.getMessage());
    } catch (S3Exception e) {
      throw new RuntimeException("S3 업로드 실패: " + e.getMessage());
    }
  }

  /**
   * S3에서 JSON 다운로드 (나중에 재조회할 때)
   */
  public Map<String, Object> getJsonFromS3(Long pdfId, Long userId) {
    UploadedFile uploadedFile = uploadedFileRepository.findById(pdfId)
        .orElseThrow(() -> new RuntimeException("PDF not found"));

    // 권한 검증
    if (!uploadedFile.getUploaderId().equals(userId)) {
      throw new RuntimeException("Not your PDF");
    }

    if (uploadedFile.getJsonS3Key() == null) {
      throw new RuntimeException("파싱된 JSON이 없습니다.");
    }

    try {
      // S3에서 JSON 다운로드
      GetObjectRequest getRequest = GetObjectRequest.builder()
          .bucket(bucketName)
          .key(uploadedFile.getJsonS3Key())
          .build();

      ResponseInputStream<GetObjectResponse> response = s3Client.getObject(getRequest);
      String jsonString = new String(response.readAllBytes());

      // JSON 파싱
      Map<String, Object> jsonData = objectMapper.readValue(jsonString, Map.class);

      return Map.of(
          "pdfId", pdfId,
          "filename", uploadedFile.getOriginalFileName(),
          "parsedAt", uploadedFile.getParsedAt(),
          "parsedData", jsonData
      );

    } catch (Exception e) {
      throw new RuntimeException("JSON 조회 실패: " + e.getMessage());
    }
  }
  /**
   * CloudFront Signed URL 생성 (FastAPI 파싱용 - GET 권한)
   *
   * 이건 S3 presigned URL과 다름!
   * S3 presigned URL: 업로드용 (PUT)
   * CloudFront signed URL: 다운로드/파싱용 (GET)
   */
  private String generateCloudFrontSignedUrl(String s3Key) {
    try {
      // 1. CloudFront URL 생성
      String resourceUrl = "https://" + cloudFrontDomain + "/" + s3Key;

      // 2. 만료 시간 (Unix timestamp - 초 단위)
      long expiresEpochSeconds = Instant.now().plusSeconds(3600).getEpochSecond();

      // 3. Canned Policy JSON 생성
      String policy = createCannedPolicy(resourceUrl, expiresEpochSeconds);

      // 4. Private key 로드
      PrivateKey privateKey = loadPrivateKey(privateKeyPath);

      // 5. Policy 서명 생성
      String signature = signPolicy(policy, privateKey);

      // 6. URL 인코딩된 signature
      String encodedSignature = makeBytesUrlSafe(signature);

      // 7. Signed URL 조합
      String signedUrl = resourceUrl +
          "?Expires=" + expiresEpochSeconds +
          "&Signature=" + encodedSignature +
          "&Key-Pair-Id=" + keyPairId;

      log.info("✅ CloudFront signed URL 생성 완료: {}", s3Key);
      return signedUrl;

    } catch (Exception e) {
      log.error("❌ CloudFront signed URL 생성 실패: {}", e.getMessage(), e);
      throw new RuntimeException("CloudFront signed URL 생성 실패: " + e.getMessage());
    }
  }
  private String createCannedPolicy(String resourceUrl, long expiresEpochSeconds) {
    return String.format(
        "{\"Statement\":[{\"Resource\":\"%s\",\"Condition\":{\"DateLessThan\":{\"AWS:EpochTime\":%d}}}]}",
        resourceUrl,
        expiresEpochSeconds
    );
  }
  private String signPolicy(String policy, PrivateKey privateKey) throws Exception {
    // SHA1withRSA 서명 생성
    Signature signature = Signature.getInstance("SHA1withRSA");
    signature.initSign(privateKey);
    signature.update(policy.getBytes(StandardCharsets.UTF_8));

    byte[] signatureBytes = signature.sign();

    // Base64 인코딩
    return Base64.getEncoder().encodeToString(signatureBytes);
  }
  private String makeBytesUrlSafe(String base64String) {
    return base64String
        .replace("+", "-")
        .replace("=", "_")
        .replace("/", "~");
  }
  /**
   * JSON 파일의 CloudFront Signed URL 생성 (프론트엔드 다운로드용)
   *
   * @param pdfId: PDF ID
   * @param userId: 사용자 ID (권한 검증용)
   * @return CloudFront signed URL
   */
  public String generateJsonSignedUrl(Long pdfId, Long userId) {
    // 1. DB에서 PDF 조회
    UploadedFile uploadedFile = uploadedFileRepository.findById(pdfId)
        .orElseThrow(() -> new RuntimeException("PDF not found"));

    // 2. 권한 검증
    if (!uploadedFile.getUploaderId().equals(userId)) {
      throw new RuntimeException("Not your PDF");
    }

    // 3. JSON S3 키 확인
    if (uploadedFile.getJsonS3Key() == null || uploadedFile.getJsonS3Key().isEmpty()) {
      throw new RuntimeException("파싱된 JSON이 없습니다. 먼저 PDF를 파싱해주세요.");
    }

    // 4. CloudFront signed URL 생성
    String signedUrl = generateCloudFrontSignedUrl(uploadedFile.getJsonS3Key());

    log.info("✅ JSON 다운로드 URL 생성 완료: pdfId={}, userId={}", pdfId, userId);

    return signedUrl;
  }

  /**
   * Private key 로드 (CloudFront용)
   * 파일 경로 또는 PEM 내용 자체를 받을 수 있음
   */
  private PrivateKey loadPrivateKey(String privateKeyInput) throws Exception {
    String privateKeyPEM;

    // PEM 헤더가 있으면 직접 PEM 내용으로 간주
    if (privateKeyInput.contains("-----BEGIN PRIVATE KEY-----")) {
      privateKeyPEM = privateKeyInput;
    } else {
      // 파일 경로로 간주
      byte[] keyBytes = Files.readAllBytes(Paths.get(privateKeyInput));
      privateKeyPEM = new String(keyBytes);
    }

    // PEM 포맷 정리
    String cleanedKey = privateKeyPEM
        .replace("-----BEGIN PRIVATE KEY-----", "")
        .replace("-----END PRIVATE KEY-----", "")
        .replaceAll("\\s", "");

    byte[] decoded = Base64.getDecoder().decode(cleanedKey);
    PKCS8EncodedKeySpec spec = new PKCS8EncodedKeySpec(decoded);
    KeyFactory kf = KeyFactory.getInstance("RSA");
    return kf.generatePrivate(spec);
  }

  /**
   * 개념 Check 추출 API
   * S3에 저장된 JSON에서 s_title == "개념 Check"인 항목만 필터링하여
   * FastAPI로 전송 후 가공된 결과를 S3에 저장
   *
   * @param pdfId: PDF ID
   * @param userId: 사용자 ID (권한 검증용)
   * @return 가공된 개념 Check 데이터
   */
  /**
   * 개념 Check 필터링만 수행 (GET - FastAPI 호출 없이 빠르게 반환)
   */
  @Transactional(readOnly = true)
  public Map<String, Object> getConceptCheckOnly(Long pdfId, Long userId) {
    try {
      // 1. DB에서 PDF 정보 조회
      UploadedFile uploadedFile = uploadedFileRepository.findById(pdfId)
          .orElseThrow(() -> new RuntimeException("PDF를 찾을 수 없습니다."));

      // 2. 권한 검증
      if (!uploadedFile.getUploaderId().equals(userId)) {
        throw new RuntimeException("권한이 없습니다.");
      }

      // 3. JSON S3 키 확인 (파싱된 JSON이 있어야 함)
      if (uploadedFile.getJsonS3Key() == null || uploadedFile.getJsonS3Key().isEmpty()) {
        throw new RuntimeException("파싱된 JSON이 없습니다. 먼저 PDF를 파싱해주세요.");
      }

      // 4. S3에서 JSON 다운로드
      GetObjectRequest getRequest = GetObjectRequest.builder()
          .bucket(bucketName)
          .key(uploadedFile.getJsonS3Key())
          .build();

      ResponseInputStream<GetObjectResponse> response = s3Client.getObject(getRequest);
      String jsonString = new String(response.readAllBytes());

      // 5. JSON 파싱
      Map<String, Object> jsonData = objectMapper.readValue(jsonString, Map.class);

      // ===== 디버깅: JSON 구조 확인 =====
      log.info("📋 JSON 최상위 키 목록: {}", jsonData.keySet());
      if (jsonData.containsKey("data")) {
        log.info("📋 data 타입: {}", jsonData.get("data").getClass().getName());
      }

      // 6. 개념 Check 필터링
      List<Map<String, Object>> conceptCheckItems = filterConceptCheckFromJson(jsonData);

      if (conceptCheckItems.isEmpty()) {
        throw new RuntimeException("개념 Check 항목을 찾을 수 없습니다.");
      }

      log.info("✅ 개념 Check 항목 {}개 조회 완료", conceptCheckItems.size());

      // 7. 새로운 JSON 구조로 반환
      return Map.of(
          "pdfId", pdfId,
          "filename", uploadedFile.getOriginalFileName(),
          "conceptCheckCount", conceptCheckItems.size(),
          "data", conceptCheckItems
      );

    } catch (Exception e) {
      log.error("❌ 개념 Check 조회 실패: {}", e.getMessage(), e);
      throw new RuntimeException("개념 Check 조회 실패: " + e.getMessage());
    }
  }

  /**
   * JSON에서 concept_checks 배열의 title == "개념 Check"인 항목만 필터링하는 공통 메서드
   */
  private List<Map<String, Object>> filterConceptCheckFromJson(Map<String, Object> jsonData) {
    // data 배열에서 concept_checks 추출

    // ===== 디버깅: data 키 확인 =====
    if (!jsonData.containsKey("data")) {
      log.error("❌ JSON에 'data' 키가 없습니다. 사용 가능한 키: {}", jsonData.keySet());
      throw new RuntimeException("data 배열이 없습니다. 사용 가능한 키: " + jsonData.keySet());
    }

    Object dataObj = jsonData.get("data");
    if (!(dataObj instanceof List)) {
      log.error("❌ 'data'가 배열이 아닙니다. 타입: {}", dataObj.getClass().getName());
      throw new RuntimeException("data가 배열 형식이 아닙니다.");
    }

    List<Map<String, Object>> dataList = (List<Map<String, Object>>) dataObj;
    if (dataList.isEmpty()) {
      log.warn("⚠️ data 배열이 비어있습니다.");
      throw new RuntimeException("data 배열이 비어있습니다.");
    }

    log.info("🔍 data 배열 크기: {}", dataList.size());

    // ===== 디버깅: 첫 번째 data 항목의 구조 확인 =====
    if (!dataList.isEmpty()) {
      Map<String, Object> firstItem = dataList.get(0);
      log.info("🔍 첫 번째 data 항목의 키: {}", firstItem.keySet());
    }

    // data -> concept_checks에서 개념 Check 찾기
    List<Map<String, Object>> conceptCheckItems = new ArrayList<>();

    for (Map<String, Object> dataItem : dataList) {
      // concept_checks 배열 가져오기
      Object conceptChecksObj = dataItem.get("concept_checks");

      if (conceptChecksObj == null) {
        log.info("⚠️ concept_checks 키가 없습니다.");
        continue;
      }

      if (!(conceptChecksObj instanceof List)) {
        log.warn("⚠️ concept_checks가 배열이 아닙니다. 타입: {}", conceptChecksObj.getClass().getName());
        continue;
      }

      List<Map<String, Object>> conceptChecks = (List<Map<String, Object>>) conceptChecksObj;
      log.info("🔍 concept_checks 배열 크기: {}", conceptChecks.size());

      for (Map<String, Object> conceptCheck : conceptChecks) {
        String titleValue = (String) conceptCheck.get("title");
        log.info("🔍 concept_check title 값: '{}'", titleValue);

        // title == "개념 Check"인 항목만 추가
        if ("개념 Check".equals(titleValue)) {
          log.info("✅ 개념 Check 발견!");
          conceptCheckItems.add(conceptCheck);
        }
      }
    }

    return conceptCheckItems;
  }

  @Transactional
  public Map<String, Object> extractConceptCheck(Long pdfId, Long userId) {
    try {
      // 1. DB에서 PDF 정보 조회
      UploadedFile uploadedFile = uploadedFileRepository.findById(pdfId)
          .orElseThrow(() -> new RuntimeException("PDF를 찾을 수 없습니다."));

      // 2. 권한 검증
      if (!uploadedFile.getUploaderId().equals(userId)) {
        throw new RuntimeException("권한이 없습니다.");
      }

      // 3. JSON S3 키 확인 (파싱된 JSON이 있어야 함)
      if (uploadedFile.getJsonS3Key() == null || uploadedFile.getJsonS3Key().isEmpty()) {
        throw new RuntimeException("파싱된 JSON이 없습니다. 먼저 PDF를 파싱해주세요.");
      }

      // 4. S3에서 JSON 다운로드
      GetObjectRequest getRequest = GetObjectRequest.builder()
          .bucket(bucketName)
          .key(uploadedFile.getJsonS3Key())
          .build();

      ResponseInputStream<GetObjectResponse> response = s3Client.getObject(getRequest);
      String jsonString = new String(response.readAllBytes());

      // 5. JSON 파싱
      Map<String, Object> jsonData = objectMapper.readValue(jsonString, Map.class);

      // 6. 개념 Check 필터링 (공통 메서드 사용)
      List<Map<String, Object>> conceptCheckItems = filterConceptCheckFromJson(jsonData);

      if (conceptCheckItems.isEmpty()) {
        throw new RuntimeException("개념 Check 항목을 찾을 수 없습니다.");
      }

      log.info("✅ 개념 Check 항목 {}개 추출 완료", conceptCheckItems.size());

      // 7. FastAPI로 전송할 데이터 구성
      Map<String, Object> requestData = new HashMap<>();
      requestData.put("concept_checks", conceptCheckItems);

      // 8. FastAPI 호출 (개념 Check 가공)
      String fastApiEndpoint = fastApiUrl + "/document/process-concept-check";

      ResponseEntity<Map> fastApiResponse = webClient.post()
          .uri(fastApiEndpoint)
          .bodyValue(requestData)
          .retrieve()
          .onStatus(status -> status.is4xxClientError() || status.is5xxServerError(),
              clientResponse -> clientResponse.bodyToMono(String.class)
                  .map(errorBody -> new RuntimeException("FastAPI 에러: " + errorBody)))
          .toEntity(Map.class)
          .block();

      if (fastApiResponse.getBody() == null) {
        throw new RuntimeException("FastAPI 응답이 비어있습니다.");
      }

      Map<String, Object> processedData = fastApiResponse.getBody();

      log.info("✅ FastAPI 가공 완료");

      // 9. 가공된 JSON을 S3에 저장
      String conceptCheckS3Key = uploadConceptCheckJsonToS3(
          uploadedFile.getS3Key(),
          processedData,
          userId.toString()
      );

      // 10. DB 업데이트
      uploadedFile.setConceptCheckJsonS3Key(conceptCheckS3Key);
      uploadedFileRepository.save(uploadedFile);

      log.info("✅ 개념 Check 추출 및 저장 완료: pdfId={}", pdfId);

      return Map.of(
          "pdfId", pdfId,
          "filename", uploadedFile.getOriginalFileName(),
          "processedData", processedData
      );

    } catch (Exception e) {
      log.error("❌ 개념 Check 추출 실패: {}", e.getMessage(), e);
      throw new RuntimeException("개념 Check 추출 실패: " + e.getMessage());
    }
  }

  /**
   * 개념 Check JSON을 S3에 업로드
   *
   * @param pdfS3Key: 원본 PDF의 S3 키
   * @param conceptCheckData: 가공된 개념 Check 데이터
   * @param username: 사용자 ID
   * @return S3에 저장된 개념 Check JSON의 키
   */
  private String uploadConceptCheckJsonToS3(String pdfS3Key, Map<String, Object> conceptCheckData, String username) {
    try {
      // PDF 경로에서 파일명 추출
      String filename = pdfS3Key.substring(pdfS3Key.lastIndexOf("/") + 1)
          .replace(".pdf", "");

      // 개념 Check JSON S3 키 생성
      // concept-check-json/UUID.json
      String conceptCheckS3Key = pdfS3Key
          .replace(uploadPrefix + "/", "concept-check-json/")
          .replace(".pdf", ".json");

      // JSON을 예쁘게 포맷팅
      String jsonString = objectMapper.writerWithDefaultPrettyPrinter()
          .writeValueAsString(conceptCheckData);

      // S3에 업로드
      PutObjectRequest putRequest = PutObjectRequest.builder()
          .bucket(bucketName)
          .key(conceptCheckS3Key)
          .contentType("application/json")
          .metadata(Map.of(
              "original-pdf", pdfS3Key,
              "processed-at", LocalDateTime.now().toString(),
              "owner", username,
              "type", "concept-check"
          ))
          .build();

      s3Client.putObject(
          putRequest,
          RequestBody.fromString(jsonString)
      );

      log.info("✅ 개념 Check JSON S3 저장 완료: {}", conceptCheckS3Key);

      return conceptCheckS3Key;

    } catch (JsonProcessingException e) {
      throw new RuntimeException("JSON 직렬화 실패: " + e.getMessage());
    } catch (S3Exception e) {
      throw new RuntimeException("S3 업로드 실패: " + e.getMessage());
    }
  }
}