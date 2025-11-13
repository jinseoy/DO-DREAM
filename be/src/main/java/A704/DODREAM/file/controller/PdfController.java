package A704.DODREAM.file.controller;

import A704.DODREAM.auth.dto.request.UserPrincipal;
import A704.DODREAM.file.service.PdfService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import java.io.IOException;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
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
  @Operation(
      summary = "PDF 업로드 및 파싱 (multipart/form-data)",
      description = "PDF 파일을 multipart/form-data 형식으로 업로드하고 즉시 Gemini AI로 파싱합니다. " +
          "한 번의 요청으로 S3 업로드, DB 저장, AI 파싱, JSON 저장이 모두 처리됩니다. " +
          "파싱 처리 시간은 PDF 크기에 따라 수십 초에서 수 분이 걸릴 수 있습니다. " +
          "응답으로 파싱된 JSON 데이터와 메타데이터를 즉시 반환합니다."
  )
  @PostMapping(value = "/upload-and-parse-multipart", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public ResponseEntity<Map<String, Object>> uploadAndParsePdfMultipart(
      @RequestParam("file") MultipartFile file,
      @AuthenticationPrincipal UserPrincipal userPrincipal
  ) {
    Long userId = (userPrincipal != null) ? userPrincipal.userId() : 1L; // 기본값 1L (테스트용)
    Map<String, Object> result = pdfService.uploadAndParsePdf(file, userId);
    return ResponseEntity.ok(result);
  }

  /**
   * PDF 파싱 (기존 방식 - presigned URL로 업로드된 파일 파싱)
   */
  @Operation(
      summary = "PDF 파싱 및 구조 추출 (기존 방식)",
      description = "이미 S3에 업로드된 PDF를 CloudFront를 통해 다운로드하여 Gemini AI로 파싱합니다. " +
          "PDF의 텍스트, 목차, 구조를 추출하여 JSON 형태로 S3에 저장하고 결과를 반환합니다. " +
          "파싱 처리 시간은 PDF 크기에 따라 수십 초에서 수 분이 걸릴 수 있습니다. " +
          "이 방식은 presigned URL로 이미 업로드된 파일에 사용합니다."
  )
  @PostMapping("/{pdfId}/parse")
  public ResponseEntity<Map<String, Object>> parsePdf(
      @PathVariable Long pdfId,
      @AuthenticationPrincipal UserPrincipal userPrincipal
  ) {
    Long userId = (userPrincipal != null) ? userPrincipal.userId() : 1L; // 기본값 1L (테스트용)
    Map<String, Object> result = pdfService.parsePdfAndSave(pdfId, userId);
    return ResponseEntity.ok(result);
  }

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
}