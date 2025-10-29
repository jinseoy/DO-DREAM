package A704.DODREAM.file.controller;

import A704.DODREAM.file.entity.OcrStatus;
import A704.DODREAM.file.entity.UploadedFile;
import A704.DODREAM.file.repository.UploadedFileRepository;
import A704.DODREAM.file.dto.FileUploadResponse;
import A704.DODREAM.file.dto.OcrResultResponse;
import A704.DODREAM.file.service.FileStorageService;
import A704.DODREAM.file.service.OcrProcessService;
import java.util.List;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@Slf4j
@RestController
@RequestMapping("/api/files")
@RequiredArgsConstructor
public class FileUploadController {

    private final FileStorageService fileStorageService;
    private final OcrProcessService ocrProcessService;
    private final UploadedFileRepository uploadedFileRepository;

    private static final long MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

    /**
     * PDF 파일 업로드 및 OCR 처리 시작
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