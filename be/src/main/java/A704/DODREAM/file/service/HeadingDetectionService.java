package A704.DODREAM.file.service;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import A704.DODREAM.file.entity.DocumentSection;
import A704.DODREAM.file.entity.OcrPage;
import A704.DODREAM.file.entity.OcrWord;
import A704.DODREAM.file.entity.UploadedFile;
import A704.DODREAM.file.repository.DocumentSectionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class HeadingDetectionService {

	private final DocumentSectionRepository documentSectionRepository;

	// 제목 패턴들
	private static final Pattern[] HEADING_PATTERNS = {
		Pattern.compile("^\\d+\\.\\s*.+"),              // "1. 서론"
		Pattern.compile("^제\\s*\\d+\\s*장.+"),         // "제1장", "제 1 장"
		Pattern.compile("^Chapter\\s+\\d+.+", Pattern.CASE_INSENSITIVE), // "Chapter 1"
		Pattern.compile("^[IVX]+\\.\\s*.+"),            // "I. Introduction"
		Pattern.compile("^\\d+-\\d+.+"),                // "1-1 개념"
		Pattern.compile("^\\[.*\\]"),                   // "[단원명]"
		Pattern.compile("^\\d+\\)\\s*.+"),              // "1) 제목"
		Pattern.compile("^[가-힣]{1,10}\\s*\\d+"),      // "단원 1", "Chapter 1"
	};

	/**
	 * OCR 완료 후 제목 감지 및 섹션 생성
	 */
	@Transactional
	public List<DocumentSection> detectAndCreateSections(UploadedFile uploadedFile) {
		log.info("Starting heading detection for file ID: {}", uploadedFile.getId());

		List<DocumentSection> sections = new ArrayList<>();
		int sectionOrder = 0;

		for (OcrPage page : uploadedFile.getOcrPages()) {
			List<HeadingCandidate> candidates = findHeadingCandidates(page);

			for (HeadingCandidate candidate : candidates) {
				DocumentSection section = DocumentSection.builder()
					.uploadedFile(uploadedFile)
					.title(candidate.getText())
					.level(candidate.getLevel())
					.startPage(page.getPageNumber())
					.endPage(page.getPageNumber()) // 나중에 업데이트 가능
					.fontSize(candidate.getFontSize())
					.sectionOrder(sectionOrder++)
					.build();

				sections.add(section);
				log.info("Detected heading: '{}' (Level: {}, Page: {}, Size: {})",
					candidate.getText(), candidate.getLevel(), page.getPageNumber(), candidate.getFontSize());
			}
		}

		// DB 저장
		if (!sections.isEmpty()) {
			documentSectionRepository.saveAll(sections);
			log.info("Saved {} sections for file ID: {}", sections.size(), uploadedFile.getId());
		} else {
			log.warn("No headings detected for file ID: {}", uploadedFile.getId());
		}

		return sections;
	}

	/**
	 * 페이지에서 제목 후보 찾기
	 */
	private List<HeadingCandidate> findHeadingCandidates(OcrPage page) {
		List<HeadingCandidate> candidates = new ArrayList<>();

		if (page.getWords().isEmpty()) {
			return candidates;
		}

		// 1. 평균 글자 크기 계산
		double avgHeight = calculateAverageHeight(page.getWords());
		log.debug("Page {} average height: {}", page.getPageNumber(), avgHeight);

		// 2. 큰 글자 찾기
		for (OcrWord word : page.getWords()) {
			int height = word.getY3() - word.getY1();

			// 조건 1: 평균보다 1.4배 이상 큰 글자 (임계값 낮춤)
			if (height >= avgHeight * 1.4) {
				String text = word.getText().trim();

				// 조건 2: 제목 패턴 매칭 또는 충분히 큰 글자
				if (isHeadingPattern(text) || height >= avgHeight * 1.8) {
					int level = determineLevel(text, height, avgHeight);

					candidates.add(HeadingCandidate.builder()
						.text(text)
						.fontSize(height)
						.level(level)
						.build());

					log.debug("Heading candidate: '{}' (size: {}, avg: {}, ratio: {})",
						text, height, avgHeight, height / avgHeight);
				}
			}
		}

		return candidates;
	}

	/**
	 * 평균 글자 높이 계산
	 */
	private double calculateAverageHeight(List<OcrWord> words) {
		if (words.isEmpty()) {
			return 0;
		}

		int totalHeight = 0;
		for (OcrWord word : words) {
			totalHeight += (word.getY3() - word.getY1());
		}

		return (double)totalHeight / words.size();
	}

	/**
	 * 제목 패턴 매칭
	 */
	private boolean isHeadingPattern(String text) {
		if (text == null || text.isEmpty()) {
			return false;
		}

		for (Pattern pattern : HEADING_PATTERNS) {
			if (pattern.matcher(text).matches()) {
				return true;
			}
		}

		return false;
	}

	/**
	 * 제목 레벨 결정
	 */
	private int determineLevel(String text, int fontSize, double avgHeight) {
		double ratio = fontSize / avgHeight;

		// 크기 비율로 레벨 결정
		if (ratio >= 2.5) {
			return 1; // 대단원
		} else if (ratio >= 1.8) {
			return 2; // 중단원
		} else {
			return 3; // 소단원
		}
	}

	/**
	 * 제목 후보 내부 클래스
	 */
	@lombok.Data
	@lombok.Builder
	private static class HeadingCandidate {
		private String text;
		private Integer fontSize;
		private Integer level;
	}
}