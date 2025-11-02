package A704.DODREAM.file.controller;

import A704.DODREAM.file.dto.DownloadUrlResponse;
import A704.DODREAM.file.dto.PresignedUrlRequest;
import A704.DODREAM.file.dto.PresignedUrlResponse;
import A704.DODREAM.file.dto.DocumentSectionResponse;
import A704.DODREAM.file.dto.DocumentStructureResponse;
import A704.DODREAM.file.entity.DocumentSection;
import A704.DODREAM.file.entity.OcrStatus;
import A704.DODREAM.file.entity.UploadedFile;
import A704.DODREAM.file.repository.DocumentSectionRepository;
import A704.DODREAM.file.repository.UploadedFileRepository;
import A704.DODREAM.file.dto.FileUploadResponse;
import A704.DODREAM.file.dto.OcrResultResponse;
import A704.DODREAM.file.service.CloudFrontService;
import A704.DODREAM.file.service.FileStorageService;
import A704.DODREAM.file.service.OcrProcessService;
import A704.DODREAM.file.service.S3Service;
import java.util.List;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@Slf4j
@RestController
@RequestMapping("/api/files")
@RequiredArgsConstructor
public class FileUploadController {

    private final FileStorageService fileStorageService;
    private final OcrProcessService ocrProcessService;
    private final UploadedFileRepository uploadedFileRepository;
    private final S3Service s3Service;
    private final CloudFrontService cloudFrontService;
    private final DocumentSectionRepository documentSectionRepository;

    private static final long MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

    /**
     * S3 Presigned URL 생성 (새 플로우)
     * 1. 클라이언트가 이 API를 호출하여 Presigned URL을 받음
     * 2. 클라이언트가 받은 URL로 S3에 직접 업로드
     * 3. 업로드 완료 후 /files/{fileId}/process 호출하여 OCR 시작
     */
    @PostMapping("/presigned-url")
    public ResponseEntity<?> generatePresignedUrl(@RequestBody PresignedUrlRequest request) {
        try {
            // Validate request
            if (request.getFileName() == null || request.getFileName().isEmpty()) {
                return ResponseEntity.badRequest().body("File name is required");
            }

            if (request.getContentType() == null || !request.getContentType().equals("application/pdf")) {
                return ResponseEntity.badRequest().body("Only PDF files are allowed");
            }

            PresignedUrlResponse response = s3Service.generatePresignedUrl(request);

            log.info("Generated presigned URL for file: {}, fileId: {}", request.getFileName(), response.getFileId());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Failed to generate presigned URL: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Failed to generate presigned URL: " + e.getMessage());
        }
    }

    /**
     * PDF 다운로드 URL 생성 (CloudFront Signed URL)
     * 선생님이 업로드한 PDF를 다운로드할 수 있는 보안 URL 제공
     */
    @GetMapping("/{fileId}/download-url")
    public ResponseEntity<?> getDownloadUrl(@PathVariable Long fileId) {
        try {
            UploadedFile uploadedFile = uploadedFileRepository.findById(fileId)
                    .orElseThrow(() -> new RuntimeException("File not found"));

            // S3 key가 없으면 로컬 파일 (기존 플로우)
            if (uploadedFile.getS3Key() == null) {
                return ResponseEntity.badRequest()
                        .body("This file is stored locally and cannot be downloaded via CloudFront");
            }

            // CloudFront Signed URL 생성 (1시간 유효)
            String signedUrl = cloudFrontService.generateSignedUrl(uploadedFile.getS3Key());

            log.info("Generated download URL for file ID: {}, name: {}", fileId, uploadedFile.getOriginalFileName());

            return ResponseEntity.ok(DownloadUrlResponse.builder()
                    .downloadUrl(signedUrl)
                    .expiresIn(3600L) // 1시간 (3600초)
                    .fileName(uploadedFile.getOriginalFileName())
                    .fileId(uploadedFile.getId())
                    .build());

        } catch (Exception e) {
            log.error("Failed to generate download URL: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Failed to generate download URL: " + e.getMessage());
        }
    }

    /**
     * S3 업로드 완료 후 OCR 처리 시작 (새 플로우)
     * 클라이언트가 presigned URL로 S3에 업로드 완료 후 이 API를 호출
     */
    @PostMapping("/{fileId}/process")
    public ResponseEntity<?> startOcrProcess(@PathVariable Long fileId) {
        try {
            UploadedFile uploadedFile = uploadedFileRepository.findById(fileId)
                    .orElseThrow(() -> new RuntimeException("File not found"));

            if (uploadedFile.getS3Key() == null) {
                return ResponseEntity.badRequest()
                        .body("S3 key not found for this file. Please upload via presigned URL first.");
            }

            // 비동기 OCR 처리 시작
            ocrProcessService.processOcrAsyncFromS3(fileId);

            log.info("OCR processing started for file ID: {}", fileId);

            return ResponseEntity.ok(FileUploadResponse.builder()
                    .fileId(uploadedFile.getId())
                    .originalFileName(uploadedFile.getOriginalFileName())
                    .ocrStatus(OcrStatus.PROCESSING)
                    .message("OCR processing started")
                    .uploadedAt(uploadedFile.getCreatedAt())
                    .build());

        } catch (Exception e) {
            log.error("Failed to start OCR process: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Failed to start OCR process: " + e.getMessage());
        }
    }

    /**
     * PDF 파일 업로드 및 OCR 처리 시작 (기존 플로우)
     */
    @PostMapping("/upload")
    public ResponseEntity<?> uploadFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam("uploaderId") Long uploaderId) {

        try {
            // 1. 파일 검증
            if (file.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body("File is empty");
            }

            if (!fileStorageService.isPdfFile(file)) {
                return ResponseEntity.badRequest()
                        .body("Only PDF files are allowed");
            }

            if (!fileStorageService.isValidFileSize(file, MAX_FILE_SIZE)) {
                return ResponseEntity.badRequest()
                        .body("File size exceeds maximum limit (100MB)");
            }

            // 2. 파일 저장
            String storedFileName = fileStorageService.storeFile(file);
            String filePath = fileStorageService.getFilePath(storedFileName).toString();

            // 3. DB에 파일 정보 저장
            UploadedFile uploadedFile = UploadedFile.builder()
                    .originalFileName(file.getOriginalFilename())
                    .storedFileName(storedFileName)
                    .filePath(filePath)
                    .fileSize(file.getSize())
                    .fileType(file.getContentType())
                    .uploaderId(uploaderId)
                    .ocrStatus(OcrStatus.PENDING)
                    .build();

            uploadedFile = uploadedFileRepository.save(uploadedFile);

            // 4. 비동기 OCR 프로세스 시작
            ocrProcessService.processOcrAsync(uploadedFile.getId());

            // 5. 응답 생성
            FileUploadResponse response = FileUploadResponse.builder()
                    .fileId(uploadedFile.getId())
                    .originalFileName(uploadedFile.getOriginalFileName())
                    .fileSize(uploadedFile.getFileSize())
                    .ocrStatus(uploadedFile.getOcrStatus())
                    .message("File uploaded successfully. OCR processing started.")
                    .uploadedAt(uploadedFile.getCreatedAt())
                    .build();

            log.info("File uploaded: ID={}, Name={}", uploadedFile.getId(), file.getOriginalFilename());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("File upload failed: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("File upload failed: " + e.getMessage());
        }
    }

    /**
     * OCR 결과 조회
     */
    @GetMapping("/{fileId}/ocr-result")
    public ResponseEntity<?> getOcrResult(@PathVariable Long fileId) {
        try {
            UploadedFile uploadedFile = uploadedFileRepository.findById(fileId)
                    .orElseThrow(() -> new RuntimeException("File not found"));

            OcrResultResponse response = convertToOcrResultResponse(uploadedFile);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Failed to get OCR result: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Failed to get OCR result: " + e.getMessage());
        }
    }

    /**
     * 업로더의 파일 목록 조회
     */
    @GetMapping("/uploader/{uploaderId}")
    public ResponseEntity<?> getFilesByUploader(@PathVariable Long uploaderId) {
        try {
            List<UploadedFile> files = uploadedFileRepository.findByUploaderId(uploaderId);

            List<FileUploadResponse> responses = files.stream()
                    .map(file -> FileUploadResponse.builder()
                            .fileId(file.getId())
                            .originalFileName(file.getOriginalFileName())
                            .fileSize(file.getFileSize())
                            .ocrStatus(file.getOcrStatus())
                            .uploadedAt(file.getCreatedAt())
                            .build())
                    .collect(Collectors.toList());

            return ResponseEntity.ok(responses);

        } catch (Exception e) {
            log.error("Failed to get files: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Failed to get files: " + e.getMessage());
        }
    }

    /**
     * OCR 상태만 조회
     */
    @GetMapping("/{fileId}/status")
    public ResponseEntity<?> getOcrStatus(@PathVariable Long fileId) {
        try {
            UploadedFile uploadedFile = uploadedFileRepository.findById(fileId)
                    .orElseThrow(() -> new RuntimeException("File not found"));

            return ResponseEntity.ok(FileUploadResponse.builder()
                    .fileId(uploadedFile.getId())
                    .originalFileName(uploadedFile.getOriginalFileName())
                    .fileSize(uploadedFile.getFileSize())
                    .ocrStatus(uploadedFile.getOcrStatus())
                    .message(getStatusMessage(uploadedFile.getOcrStatus()))
                    .uploadedAt(uploadedFile.getCreatedAt())
                    .build());

        } catch (Exception e) {
            log.error("Failed to get OCR status: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Failed to get OCR status: " + e.getMessage());
        }
    }

    /**
     * 파일의 전체 텍스트만 조회 (좌표 정보 제외)
     */
    @GetMapping("/{fileId}/text")
    public ResponseEntity<?> getFullText(@PathVariable Long fileId) {
        try {
            UploadedFile uploadedFile = uploadedFileRepository.findById(fileId)
                    .orElseThrow(() -> new RuntimeException("File not found"));

            if (uploadedFile.getOcrStatus() != OcrStatus.COMPLETED) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body("OCR is not completed yet. Current status: " + uploadedFile.getOcrStatus());
            }

            StringBuilder fullText = new StringBuilder();
            uploadedFile.getOcrPages().stream()
                    .sorted((p1, p2) -> p1.getPageNumber().compareTo(p2.getPageNumber()))
                    .forEach(page -> {
                        fullText.append("=== Page ").append(page.getPageNumber()).append(" ===\n");
                        fullText.append(page.getFullText()).append("\n\n");
                    });

            return ResponseEntity.ok(fullText.toString());

        } catch (Exception e) {
            log.error("Failed to get full text: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Failed to get full text: " + e.getMessage());
        }
    }

    /**
     * 문서 구조 조회 (감지된 제목/섹션 목록)
     */
    @GetMapping("/{fileId}/structure")
    public ResponseEntity<?> getDocumentStructure(@PathVariable Long fileId) {
        try {
            UploadedFile uploadedFile = uploadedFileRepository.findById(fileId)
                    .orElseThrow(() -> new RuntimeException("File not found"));

            if (uploadedFile.getOcrStatus() != OcrStatus.COMPLETED) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body("OCR is not completed yet. Current status: " + uploadedFile.getOcrStatus());
            }

            // 섹션 조회
            List<DocumentSection> sections = documentSectionRepository
                    .findByUploadedFileIdOrderBySectionOrder(fileId);

            // DTO 변환
            List<DocumentSectionResponse> sectionResponses = sections.stream()
                    .map(section -> DocumentSectionResponse.builder()
                            .sectionId(section.getId())
                            .title(section.getTitle())
                            .level(section.getLevel())
                            .startPage(section.getStartPage())
                            .endPage(section.getEndPage())
                            .fontSize(section.getFontSize())
                            .summaryText(section.getSummaryText())
                            .build())
                    .collect(Collectors.toList());

            DocumentStructureResponse response = DocumentStructureResponse.builder()
                    .fileId(uploadedFile.getId())
                    .fileName(uploadedFile.getOriginalFileName())
                    .totalPages(uploadedFile.getOcrPages().size())
                    .sections(sectionResponses)
                    .message(sections.isEmpty() ? "No headings detected" : "Document structure retrieved successfully")
                    .build();

            log.info("Retrieved document structure for file ID: {} ({} sections)", fileId, sections.size());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Failed to get document structure: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Failed to get document structure: " + e.getMessage());
        }
    }

    /**
     * 특정 레벨의 섹션만 조회 (레벨 1 = 대단원, 2 = 중단원, 3 = 소단원)
     */
    @GetMapping("/{fileId}/sections")
    public ResponseEntity<?> getSectionsByLevel(
            @PathVariable Long fileId,
            @RequestParam(required = false) Integer level) {
        try {
            UploadedFile uploadedFile = uploadedFileRepository.findById(fileId)
                    .orElseThrow(() -> new RuntimeException("File not found"));

            if (uploadedFile.getOcrStatus() != OcrStatus.COMPLETED) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body("OCR is not completed yet. Current status: " + uploadedFile.getOcrStatus());
            }

            List<DocumentSection> sections;
            if (level != null) {
                sections = documentSectionRepository.findByUploadedFileIdAndLevel(fileId, level);
            } else {
                sections = documentSectionRepository.findByUploadedFileIdOrderBySectionOrder(fileId);
            }

            List<DocumentSectionResponse> sectionResponses = sections.stream()
                    .map(section -> DocumentSectionResponse.builder()
                            .sectionId(section.getId())
                            .title(section.getTitle())
                            .level(section.getLevel())
                            .startPage(section.getStartPage())
                            .endPage(section.getEndPage())
                            .fontSize(section.getFontSize())
                            .summaryText(section.getSummaryText())
                            .build())
                    .collect(Collectors.toList());

            return ResponseEntity.ok(sectionResponses);

        } catch (Exception e) {
            log.error("Failed to get sections: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Failed to get sections: " + e.getMessage());
        }
    }

    /**
     * 상태별 메시지 반환
     */
    private String getStatusMessage(OcrStatus status) {
        return switch (status) {
            case PENDING -> "OCR processing is waiting to start";
            case PROCESSING -> "OCR processing is in progress";
            case COMPLETED -> "OCR processing completed successfully";
            case FAILED -> "OCR processing failed";
        };
    }

    /**
     * UploadedFile을 OcrResultResponse로 변환
     */
    private OcrResultResponse convertToOcrResultResponse(UploadedFile uploadedFile) {
        List<OcrResultResponse.PageResponse> pages = uploadedFile.getOcrPages().stream()
                .map(page -> {
                    List<OcrResultResponse.WordResponse> words = page.getWords().stream()
                            .map(word -> OcrResultResponse.WordResponse.builder()
                                    .text(word.getText())
                                    .confidence(word.getConfidence())
                                    .boundingBox(OcrResultResponse.BoundingBox.builder()
                                            .x1(word.getX1())
                                            .y1(word.getY1())
                                            .x2(word.getX2())
                                            .y2(word.getY2())
                                            .x3(word.getX3())
                                            .y3(word.getY3())
                                            .x4(word.getX4())
                                            .y4(word.getY4())
                                            .build())
                                    .build())
                            .collect(Collectors.toList());

                    return OcrResultResponse.PageResponse.builder()
                            .pageNumber(page.getPageNumber())
                            .fullText(page.getFullText())
                            .words(words)
                            .build();
                })
                .collect(Collectors.toList());

        return OcrResultResponse.builder()
                .fileId(uploadedFile.getId())
                .originalFileName(uploadedFile.getOriginalFileName())
                .ocrStatus(uploadedFile.getOcrStatus())
                .errorMessage(uploadedFile.getErrorMessage())
                .uploadedAt(uploadedFile.getCreatedAt())
                .completedAt(uploadedFile.getCompletedAt())
                .pages(pages)
                .build();
    }
}