package A704.DODREAM.file.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "ocr_words")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class OcrWord {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "ocr_page_id", nullable = false)
	private OcrPage ocrPage;

	@Column(nullable = false, columnDefinition = "TEXT")
	private String text;

	@Column(nullable = false)
	private Double confidence; // OCR 신뢰도 (0.0 ~ 1.0)

	// Bounding Box 좌표 (Naver Clova OCR이 제공하는 4개의 좌표점)
	@Column(nullable = false)
	private Integer x1; // 좌상단 X

	@Column(nullable = false)
	private Integer y1; // 좌상단 Y

	@Column(nullable = false)
	private Integer x2; // 우상단 X

	@Column(nullable = false)
	private Integer y2; // 우상단 Y

	@Column(nullable = false)
	private Integer x3; // 우하단 X

	@Column(nullable = false)
	private Integer y3; // 우하단 Y

	@Column(nullable = false)
	private Integer x4; // 좌하단 X

	@Column(nullable = false)
	private Integer y4; // 좌하단 Y

	@Column(nullable = false)
	private Integer wordOrder; // 단어 순서

	// 비즈니스 메서드
	public void setOcrPage(OcrPage ocrPage) {
		this.ocrPage = ocrPage;
	}
}