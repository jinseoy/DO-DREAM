package A704.DODREAM.file.service;

import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.IOException;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

import javax.imageio.ImageIO;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class PdfProcessService {

	private final FileStorageService fileStorageService;

	private static final int DPI = 300; // 고해상도로 변환
	private static final String IMAGE_FORMAT = "png";

	/**
	 * PDF 파일을 페이지별 이미지로 변환 (저장된 파일명 사용)
	 */
	public List<File> convertPdfToImages(String storedFileName) throws IOException {
		Path pdfPath = fileStorageService.getFilePath(storedFileName);
		File pdfFile = pdfPath.toFile();
		return convertPdfToImages(pdfFile);
	}

	/**
	 * PDF 파일을 페이지별 이미지로 변환 (File 객체 직접 사용)
	 */
	public List<File> convertPdfToImages(File pdfFile) throws IOException {
		List<File> imageFiles = new ArrayList<>();

		try (PDDocument document = Loader.loadPDF(pdfFile)) {
			PDFRenderer pdfRenderer = new PDFRenderer(document);
			int pageCount = document.getNumberOfPages();

			log.info("Converting PDF to images: {} pages", pageCount);

			for (int pageIndex = 0; pageIndex < pageCount; pageIndex++) {
				BufferedImage image = pdfRenderer.renderImageWithDPI(pageIndex, DPI);

				// 이미지를 바이트 배열로 변환
				ByteArrayOutputStream baos = new ByteArrayOutputStream();
				ImageIO.write(image, IMAGE_FORMAT, baos);
				byte[] imageData = baos.toByteArray();

				// 임시 파일로 저장
				String prefix = String.format("page_%d", pageIndex + 1);
				File imageFile = fileStorageService.saveTempFile(imageData, prefix, IMAGE_FORMAT);
				imageFiles.add(imageFile);

				log.debug("Page {} converted to image", pageIndex + 1);
			}

			log.info("PDF conversion completed: {} pages converted", pageCount);
		} catch (IOException e) {
			// 이미 생성된 임시 파일들 정리
			for (File imageFile : imageFiles) {
				fileStorageService.deleteTempFile(imageFile);
			}
			throw new IOException("Failed to convert PDF to images: " + e.getMessage(), e);
		}

		return imageFiles;
	}

	/**
	 * PDF 페이지 수 확인
	 */
	public int getPageCount(String storedFileName) throws IOException {
		Path pdfPath = fileStorageService.getFilePath(storedFileName);
		File pdfFile = pdfPath.toFile();

		try (PDDocument document = Loader.loadPDF(pdfFile)) {
			return document.getNumberOfPages();
		}
	}
}