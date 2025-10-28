package A704.DODREAM.file.service;

import A704.DODREAM.api.service.file.dto.PageOcrResult;
import A704.DODREAM.file.OcrPage;
import A704.DODREAM.file.OcrStatus;
import A704.DODREAM.file.OcrWord;
import A704.DODREAM.file.UploadedFile;
import A704.DODREAM.file.UploadedFileRepository;
import java.io.File;
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

    /**
     * 비동기로 OCR 프로세스 실행
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