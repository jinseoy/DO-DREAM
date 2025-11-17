package A704.DODREAM.file.controller;

import A704.DODREAM.auth.dto.request.UserPrincipal;
import A704.DODREAM.file.entity.UploadedFile;
import A704.DODREAM.file.service.PdfService;
import A704.DODREAM.file.service.TempPdfDataService;
import A704.DODREAM.material.dto.PublishRequest;
import A704.DODREAM.material.service.PublishService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import java.io.IOException;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.util.StreamUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/pdf")
@Tag(name = "PDF API", description = "PDF 파싱 및 분석 API")
public class PdfController {

  @Autowired
  private PdfService pdfService;

  @Autowired
  private TempPdfDataService tempPdfDataService;

  @Autowired
  private PublishService publishService;

  /**
   * PDF 업로드 + 파싱 통합 API (바이너리 직접 전송 - 권장)
   * Content-Type: application/pdf로 바이너리 직접 전송
   */
  @Operation(
      summary = "PDF 업로드 및 파싱 (바이너리 직접 전송)",
      description = "PDF 바이너리를 직접 전송하여 업로드하고 즉시 Gemini AI로 파싱합니다. " +
          "Content-Type을 application/pdf로 설정하고 body에 PDF 바이너리를 직접 전송합니다. " +
          "파일명은 filename 쿼리 파라미터로 전달합니다. " +
          "한 번의 요청으로 S3 업로드, DB 저장, AI 파싱, JSON 저장이 모두 처리됩니다. " +
          "파싱 처리 시간은 PDF 크기에 따라 수십 초에서 수 분이 걸릴 수 있습니다."
  )
  @PostMapping(value = "/upload-and-parse", consumes = "application/pdf")
  public ResponseEntity<Map<String, Object>> uploadAndParsePdfBinary(
      @RequestBody byte[] pdfBytes,
      @Parameter(description = "PDF 파일명 (예: document.pdf)")
      @RequestParam(value = "filename", defaultValue = "document.pdf") String filename,
      @AuthenticationPrincipal UserPrincipal userPrincipal
  ) {
    Long userId = (userPrincipal != null) ? userPrincipal.userId() : 1L; // 기본값 1L (테스트용)
    Map<String, Object> result = pdfService.uploadAndParsePdfFromBytes(pdfBytes, filename, userId);
    return ResponseEntity.ok(result);
  }

  /**
   * PDF 업로드 + 파싱 통합 API (multipart/form-data)
   * 폼 데이터로 파일 전송
   */
//  @Operation(
//      summary = "PDF 업로드 및 파싱 (multipart/form-data)",
//      description = "PDF 파일을 multipart/form-data 형식으로 업로드하고 즉시 Gemini AI로 파싱합니다. " +
//          "한 번의 요청으로 S3 업로드, DB 저장, AI 파싱, JSON 저장이 모두 처리됩니다. " +
//          "파싱 처리 시간은 PDF 크기에 따라 수십 초에서 수 분이 걸릴 수 있습니다. " +
//          "응답으로 파싱된 JSON 데이터와 메타데이터를 즉시 반환합니다."
//  )
//  @PostMapping(value = "/upload-and-parse-multipart", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
//  public ResponseEntity<Map<String, Object>> uploadAndParsePdfMultipart(
//      @RequestParam("file") MultipartFile file,
//      @AuthenticationPrincipal UserPrincipal userPrincipal
//  ) {
//    Long userId = (userPrincipal != null) ? userPrincipal.userId() : 1L; // 기본값 1L (테스트용)
//    Map<String, Object> result = pdfService.uploadAndParsePdf(file, userId);
//    return ResponseEntity.ok(result);
//  }

  /**
   * PDF 파싱 (기존 방식 - presigned URL로 업로드된 파일 파싱)
   */
//  @Operation(
//      summary = "PDF 파싱 및 구조 추출 (기존 방식)",
//      description = "이미 S3에 업로드된 PDF를 CloudFront를 통해 다운로드하여 Gemini AI로 파싱합니다. " +
//          "PDF의 텍스트, 목차, 구조를 추출하여 JSON 형태로 S3에 저장하고 결과를 반환합니다. " +
//          "파싱 처리 시간은 PDF 크기에 따라 수십 초에서 수 분이 걸릴 수 있습니다. " +
//          "이 방식은 presigned URL로 이미 업로드된 파일에 사용합니다."
//  )
//  @PostMapping("/{pdfId}/parse")
//  public ResponseEntity<Map<String, Object>> parsePdf(
//      @PathVariable Long pdfId,
//      @AuthenticationPrincipal UserPrincipal userPrincipal
//  ) {
//    Long userId = (userPrincipal != null) ? userPrincipal.userId() : 1L; // 기본값 1L (테스트용)
//    Map<String, Object> result = pdfService.parsePdfAndSave(pdfId, userId);
//    return ResponseEntity.ok(result);
//  }

  /**
   * S3에서 JSON 조회 (이미 파싱된 경우)
   */
  @Operation(
      summary = "파싱된 PDF 데이터 조회",
      description = "이미 파싱된 PDF의 JSON 데이터를 S3에서 조회하여 반환합니다. " +
          "파싱이 완료되지 않은 PDF는 조회할 수 없습니다."
  )
  @GetMapping("/{pdfId}/json")
  public ResponseEntity<Map<String, Object>> getJsonFromS3(
      @PathVariable Long pdfId,
      @AuthenticationPrincipal UserPrincipal userPrincipal
  ) {
    Long userId = (userPrincipal != null) ? userPrincipal.userId() : 1L;
    Map<String, Object> result = pdfService.getJsonFromS3(pdfId, userId);
    return ResponseEntity.ok(result);
  }

  /**
   * CloudFront signed URL 생성 (JSON 다운로드용)
   */
  @Operation(
      summary = "JSON 파일 다운로드 URL 생성",
      description = "파싱된 JSON 파일을 다운로드할 수 있는 CloudFront Signed URL을 생성합니다. " +
          "URL은 1시간 동안 유효하며, 프론트엔드에서 직접 JSON 파일을 다운로드할 때 사용합니다."
  )
  @GetMapping("/{pdfId}/json-url")
  public ResponseEntity<Map<String, String>> getJsonDownloadUrl(
      @PathVariable Long pdfId,
      @AuthenticationPrincipal UserPrincipal userPrincipal
  ) {
    Long userId = (userPrincipal != null) ? userPrincipal.userId() : 1L;
    String signedUrl = pdfService.generateJsonSignedUrl(pdfId, userId);
    return ResponseEntity.ok(Map.of("url", signedUrl));
  }

  /**
   * 개념 Check 필터링만 조회 (GET - 빠른 응답)
   */
  @Operation(
      summary = "개념 Check 조회 (필터링만)",
      description = "이미 파싱된 PDF의 JSON에서 s_title이 '개념 Check'인 항목만 필터링하여 반환합니다. " +
          "FastAPI 호출 없이 Spring에서 직접 필터링하므로 빠르게 응답합니다. " +
          "AI 가공이 필요한 경우 POST /concept-check 엔드포인트를 사용하세요."
  )
  @GetMapping("/{pdfId}/concept-check")
  public ResponseEntity<Map<String, Object>> getConceptCheck(
      @PathVariable Long pdfId,
      @AuthenticationPrincipal UserPrincipal userPrincipal
  ) {
    Long userId = (userPrincipal != null) ? userPrincipal.userId() : 1L;
    Map<String, Object> result = pdfService.getConceptCheckOnly(pdfId, userId);
    return ResponseEntity.ok(result);
  }

  /**
   * 개념 Check 추출 및 AI 가공 (POST - 느린 응답)
   */
//  @Operation(
//      summary = "개념 Check 추출 및 가공 (AI 처리)",
//      description = "이미 파싱된 PDF의 JSON에서 s_title이 '개념 Check'인 항목만 필터링하여 " +
//          "FastAPI로 전송 후 Gemini AI로 가공된 결과를 S3에 저장합니다. " +
//          "가공된 JSON은 concept-check-json/ 경로에 저장되며, " +
//          "응답으로 가공된 데이터를 즉시 반환합니다. " +
//          "처리 시간이 오래 걸리므로 단순 조회는 GET /concept-check를 사용하세요."
//  )
//  @PostMapping("/{pdfId}/concept-check")
//  public ResponseEntity<Map<String, Object>> extractConceptCheck(
//      @PathVariable Long pdfId,
//      @AuthenticationPrincipal UserPrincipal userPrincipal
//  ) {
//    Long userId = (userPrincipal != null) ? userPrincipal.userId() : 1L;
//    Map<String, Object> result = pdfService.extractConceptCheck(pdfId, userId);
//    return ResponseEntity.ok(result);
//  }dfdf

  /**
   * 임시 저장 (Redis)
   */
  @Operation(
      summary = "PDF 수정 내용 임시 저장",
      description = "교사가 수정 중인 PDF JSON 데이터를 Redis에 임시 저장합니다. " +
          "프론트엔드에서 자동 저장 기능으로 주기적으로 호출합니다. " +
          "임시 저장 데이터는 24시간 동안 보관되며, 이후 자동 삭제됩니다. " +
          "발행하기 완료 시 자동으로 삭제됩니다."
  )
  @PostMapping("/{pdfId}/temp-save")
  public ResponseEntity<Map<String, Object>> saveTempData(
          @PathVariable Long pdfId,
          @RequestBody PublishRequest request,
          @AuthenticationPrincipal UserPrincipal userPrincipal
  ) {
    Long userId = (userPrincipal != null) ? userPrincipal.userId() : 1L;
    tempPdfDataService.save(pdfId, userId, request);

    return ResponseEntity.ok(Map.of(
        "success", true,
        "message", "임시 저장이 완료되었습니다.",
        "pdfId", pdfId
    ));
  }

  /**
   * 임시 저장 데이터 조회 (Redis)
   */
  @Operation(
      summary = "임시 저장된 데이터 조회",
      description = "Redis에 임시 저장된 PDF 수정 내용을 조회합니다. " +
          "페이지 재접속 시 자동으로 호출하여 임시 저장 데이터가 있으면 화면에 표시합니다. " +
          "임시 저장 데이터가 없으면 S3의 원본 JSON을 사용합니다."
  )
  @GetMapping("/{pdfId}/temp-data")
  public ResponseEntity<Map<String, Object>> getTempData(
      @PathVariable Long pdfId,
      @AuthenticationPrincipal UserPrincipal userPrincipal
  ) {
    Long userId = (userPrincipal != null) ? userPrincipal.userId() : 1L;
    Map<String, Object> tempData = tempPdfDataService.get(pdfId, userId);

    if (tempData == null) {
      return ResponseEntity.ok(Map.of(
          "exists", false,
          "message", "임시 저장 데이터가 없습니다."
      ));
    }

    return ResponseEntity.ok(Map.of(
        "exists", true,
        "message", "임시 저장 데이터를 불러왔습니다.",
        "data", tempData
    ));
  }

  /**
   * 텍스트 추출 (JSON → TXT 다운로드)
   */
  @Operation(
      summary = "텍스트 추출 (JSON → TXT 다운로드)",
      description = "파싱된 PDF의 JSON 데이터에서 텍스트를 추출하여 TXT 파일로 다운로드합니다. " +
          "프론트엔드에서 '텍스트 추출' 버튼 클릭 시 호출합니다. " +
          "JSON 구조에서 텍스트 내용을 추출하여 읽기 쉬운 TXT 형태로 변환합니다."
  )
  @GetMapping("/{pdfId}/extract-text")
  public ResponseEntity<ByteArrayResource> extractTextToFile(
      @PathVariable Long pdfId,
      @AuthenticationPrincipal UserPrincipal userPrincipal
  ) {
    Long userId = (userPrincipal != null) ? userPrincipal.userId() : 1L;

    // 서비스에서 텍스트 추출
    String textContent = pdfService.extractTextFromJson(pdfId, userId);

    // 바이트 배열로 변환
    byte[] textBytes = textContent.getBytes(java.nio.charset.StandardCharsets.UTF_8);
    ByteArrayResource resource = new ByteArrayResource(textBytes);

    // 파일명 생성 (pdfId 기반)
    String filename = "extracted_text_" + pdfId + ".txt";

    // 다운로드 응답 생성
    return ResponseEntity.ok()
        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
        .contentType(MediaType.TEXT_PLAIN)
        .contentLength(textBytes.length)
        .body(resource);
  }
}