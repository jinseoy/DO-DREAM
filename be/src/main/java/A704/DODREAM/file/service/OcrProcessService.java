package A704.DODREAM.file.service;

import A704.DODREAM.file.entity.OcrPage;
import A704.DODREAM.file.entity.OcrStatus;
import A704.DODREAM.file.entity.OcrWord;
import A704.DODREAM.file.entity.UploadedFile;
import A704.DODREAM.file.repository.UploadedFileRepository;
import A704.DODREAM.file.dto.PageOcrResult;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class OcrProcessService {

    private final PdfProcessService pdfProcessService;
    private final ClovaOcrService clovaOcrService;
    private final FileStorageService fileStorageService;
    private final UploadedFileRepository uploadedFileRepository;
    private final CloudFrontService cloudFrontService;
    private final HeadingDetectionService headingDetectionService;

    /**
     * 비동기로 OCR 프로세스 실행 (S3/CloudFront 사용)
     * 새로운 플로우: CloudFront에서 파일 다운로드 → OCR 처리
     */
    @Async
    @Transactional
    public void processOcrAsyncFromS3(Long fileId) {
        log.info("Starting async OCR process from S3 for file ID: {}", fileId);

        UploadedFile uploadedFile = uploadedFileRepository.findById(fileId)
                .orElseThrow(() -> new RuntimeException("File not found: " + fileId));

        if (uploadedFile.getS3Key() == null) {
            throw new RuntimeException("S3 key not found for file ID: " + fileId);
        }

        Path tempPdfFile = null;
        List<File> imageFiles = null;

        try {
            // 상태 업데이트: PROCESSING
            uploadedFile.updateOcrStatus(OcrStatus.PROCESSING);
            uploadedFileRepository.save(uploadedFile);

            // 1. CloudFront에서 PDF 다운로드
            log.info("Step 1: Downloading PDF from CloudFront - S3 Key: {}", uploadedFile.getS3Key());
            byte[] pdfBytes = cloudFrontService.downloadFile(uploadedFile.getS3Key());

            // 2. 임시 파일로 저장
            tempPdfFile = Files.createTempFile("ocr-", ".pdf");
            Files.write(tempPdfFile, pdfBytes);
            log.info("PDF downloaded and saved to temp file: {}", tempPdfFile);

            // 3. PDF를 이미지로 변환
            log.info("Step 2: Converting PDF to images");
            imageFiles = pdfProcessService.convertPdfToImages(tempPdfFile.toFile());

            // 4. 각 페이지를 OCR 처리
            log.info("Step 3: Processing {} pages with OCR", imageFiles.size());
            for (int i = 0; i < imageFiles.size(); i++) {
                File imageFile = imageFiles.get(i);
                int pageNumber = i + 1;

                try {
                    // OCR 실행
                    PageOcrResult pageResult = clovaOcrService.processImage(imageFile, pageNumber);

                    // 결과를 DB에 저장
                    saveOcrResult(uploadedFile, pageResult);

                    log.info("Page {} OCR completed", pageNumber);

                } catch (Exception e) {
                    log.error("Failed to process page {}: {}", pageNumber, e.getMessage(), e);
                    // 페이지 하나 실패해도 계속 진행
                }
            }

            // 5. 제목 및 섹션 감지
            log.info("Step 4: Detecting headings and creating sections");
            try {
                headingDetectionService.detectAndCreateSections(uploadedFile);
                log.info("Heading detection completed for file ID: {}", fileId);
            } catch (Exception e) {
                log.error("Heading detection failed for file ID {}: {}", fileId, e.getMessage(), e);
                // 제목 감지 실패해도 OCR은 완료로 처리
            }

            // 6. 상태 업데이트: COMPLETED
            uploadedFile.updateOcrStatus(OcrStatus.COMPLETED);
            uploadedFileRepository.save(uploadedFile);

            log.info("OCR process completed successfully for file ID: {}", fileId);

        } catch (Exception e) {
            log.error("OCR process failed for file ID {}: {}", fileId, e.getMessage(), e);
            uploadedFile.setError(e.getMessage());
            uploadedFileRepository.save(uploadedFile);

        } finally {
            // 6. 임시 파일 정리
            if (tempPdfFile != null) {
                try {
                    Files.deleteIfExists(tempPdfFile);
                    log.info("Temp PDF file deleted");
                } catch (IOException e) {
                    log.warn("Failed to delete temp PDF file: {}", tempPdfFile, e);
                }
            }

            if (imageFiles != null) {
                for (File imageFile : imageFiles) {
                    fileStorageService.deleteTempFile(imageFile);
                }
                log.info("Temp image files cleaned up");
            }
        }
    }

    /**
     * 비동기로 OCR 프로세스 실행 (로컬 파일 시스템 사용)
     * 기존 플로우: 로컬 파일 시스템에서 파일 읽기 → OCR 처리
     */
    @Async
    @Transactional
    public void processOcrAsync(Long fileId) {
        log.info("Starting async OCR process for file ID: {}", fileId);

        UploadedFile uploadedFile = uploadedFileRepository.findById(fileId)
                .orElseThrow(() -> new RuntimeException("File not found: " + fileId));

        List<File> imageFiles = null;

        try {
            // 상태 업데이트: PROCESSING
            uploadedFile.updateOcrStatus(OcrStatus.PROCESSING);
            uploadedFileRepository.save(uploadedFile);

            // 1. PDF를 이미지로 변환
            log.info("Step 1: Converting PDF to images - File ID: {}", fileId);
            imageFiles = pdfProcessService.convertPdfToImages(uploadedFile.getStoredFileName());

            // 2. 각 페이지를 OCR 처리
            log.info("Step 2: Processing {} pages with OCR", imageFiles.size());
            for (int i = 0; i < imageFiles.size(); i++) {
                File imageFile = imageFiles.get(i);
                int pageNumber = i + 1;

                try {
                    // OCR 실행
                    PageOcrResult pageResult = clovaOcrService.processImage(imageFile, pageNumber);

                    // 결과를 DB에 저장
                    saveOcrResult(uploadedFile, pageResult);

                    log.info("Page {} OCR completed", pageNumber);

                } catch (Exception e) {
                    log.error("Failed to process page {}: {}", pageNumber, e.getMessage(), e);
                    // 페이지 하나 실패해도 계속 진행
                }
            }

            // 3. 상태 업데이트: COMPLETED
            uploadedFile.updateOcrStatus(OcrStatus.COMPLETED);
            uploadedFileRepository.save(uploadedFile);

            log.info("OCR process completed successfully for file ID: {}", fileId);

        } catch (Exception e) {
            log.error("OCR process failed for file ID {}: {}", fileId, e.getMessage(), e);
            uploadedFile.setError(e.getMessage());
            uploadedFileRepository.save(uploadedFile);

        } finally {
            // 4. 임시 파일 정리
            if (imageFiles != null) {
                for (File imageFile : imageFiles) {
                    fileStorageService.deleteTempFile(imageFile);
                }
                log.info("Temp files cleaned up");
            }
        }
    }

    /**
     * OCR 결과를 DB에 저장
     */
    private void saveOcrResult(UploadedFile uploadedFile, PageOcrResult pageResult) {
        // OcrPage 생성
        OcrPage ocrPage = OcrPage.builder()
                .pageNumber(pageResult.getPageNumber())
                .fullText(pageResult.getFullText())
                .build();

        uploadedFile.addOcrPage(ocrPage);

        // OcrWord 생성
        for (PageOcrResult.WordInfo wordInfo : pageResult.getWords()) {
            OcrWord ocrWord = OcrWord.builder()
                    .text(wordInfo.getText())
                    .confidence(wordInfo.getConfidence())
                    .x1(wordInfo.getX1())
                    .y1(wordInfo.getY1())
                    .x2(wordInfo.getX2())
                    .y2(wordInfo.getY2())
                    .x3(wordInfo.getX3())
                    .y3(wordInfo.getY3())
                    .x4(wordInfo.getX4())
                    .y4(wordInfo.getY4())
                    .wordOrder(wordInfo.getOrder())
                    .build();

            ocrPage.addWord(ocrWord);
        }
    }
}