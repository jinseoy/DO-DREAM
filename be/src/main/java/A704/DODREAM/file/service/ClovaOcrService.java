package A704.DODREAM.file.service;

import java.io.File;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;

import A704.DODREAM.file.dto.ClovaOcrResponse;
import A704.DODREAM.file.dto.PageOcrResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class ClovaOcrService {

	private final WebClient webClient;

	@Value("${clova.ocr.api-url}")
	private String apiUrl;

	@Value("${clova.ocr.secret-key}")
	private String secretKey;

	/**
	 * 이미지 파일을 Clova OCR로 전송하여 텍스트 추출
	 */
	public PageOcrResult processImage(File imageFile, int pageNumber) {
		log.info("Processing OCR for page {}: {}", pageNumber, imageFile.getName());

		try {
			// Multipart 요청 생성
			MultipartBodyBuilder builder = new MultipartBodyBuilder();
			builder.part("file", new FileSystemResource(imageFile));
			builder.part("message", createRequestMessage());

			// API 호출
			ClovaOcrResponse response = webClient.post()
				.uri(apiUrl)
				.header(HttpHeaders.CONTENT_TYPE, MediaType.MULTIPART_FORM_DATA_VALUE)
				.header("X-OCR-SECRET", secretKey)
				.body(BodyInserters.fromMultipartData(builder.build()))
				.retrieve()
				.bodyToMono(ClovaOcrResponse.class)
				.block();

			if (response == null || response.getImages() == null || response.getImages().isEmpty()) {
				throw new RuntimeException("Empty OCR response");
			}

			// OCR 결과 파싱
			return parseOcrResponse(response, pageNumber);

		} catch (Exception e) {
			log.error("OCR processing failed for page {}: {}", pageNumber, e.getMessage(), e);
			throw new RuntimeException("OCR processing failed: " + e.getMessage(), e);
		}
	}

	/**
	 * OCR 응답을 PageOcrResult로 변환
	 */
	private PageOcrResult parseOcrResponse(ClovaOcrResponse response, int pageNumber) {
		ClovaOcrResponse.Image image = response.getImages().get(0);

		if (!"SUCCESS".equals(image.getInferResult())) {
			throw new RuntimeException("OCR inference failed: " + image.getMessage());
		}

		List<ClovaOcrResponse.Field> fields = image.getFields();
		if (fields == null || fields.isEmpty()) {
			log.warn("No text found in page {}", pageNumber);
			return PageOcrResult.builder()
				.pageNumber(pageNumber)
				.fullText("")
				.words(new ArrayList<>())
				.build();
		}

		// 전체 텍스트 추출
		String fullText = fields.stream()
			.map(ClovaOcrResponse.Field::getInferText)
			.collect(Collectors.joining(" "));

		// 단어별 정보 추출
		List<PageOcrResult.WordInfo> words = new ArrayList<>();
		for (int i = 0; i < fields.size(); i++) {
			ClovaOcrResponse.Field field = fields.get(i);
			List<ClovaOcrResponse.Vertex> vertices = field.getBoundingPoly().getVertices();

			if (vertices != null && vertices.size() >= 4) {
				PageOcrResult.WordInfo wordInfo = PageOcrResult.WordInfo.builder()
					.text(field.getInferText())
					.confidence(field.getInferConfidence())
					.x1(vertices.get(0).getX())
					.y1(vertices.get(0).getY())
					.x2(vertices.get(1).getX())
					.y2(vertices.get(1).getY())
					.x3(vertices.get(2).getX())
					.y3(vertices.get(2).getY())
					.x4(vertices.get(3).getX())
					.y4(vertices.get(3).getY())
					.order(i)
					.build();

				words.add(wordInfo);
			}
		}

		log.info("OCR completed for page {}: {} characters, {} words",
			pageNumber, fullText.length(), words.size());

		return PageOcrResult.builder()
			.pageNumber(pageNumber)
			.fullText(fullText)
			.words(words)
			.build();
	}

	/**
	 * Clova OCR API 요청 메시지 생성
	 */
	private String createRequestMessage() {
		return """
			{
			  "version": "V2",
			  "requestId": "dodream-ocr-request",
			  "timestamp": %d,
			  "images": [
			    {
			      "format": "png",
			      "name": "image"
			    }
			  ]
			}
			""".formatted(System.currentTimeMillis());
	}
}