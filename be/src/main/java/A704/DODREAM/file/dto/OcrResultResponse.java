package A704.DODREAM.file.dto;

import java.time.LocalDateTime;
import java.util.List;

import A704.DODREAM.file.entity.OcrStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OcrResultResponse {
	private Long fileId;
	private String originalFileName;
	private OcrStatus ocrStatus;
	private String errorMessage;
	private LocalDateTime uploadedAt;
	private LocalDateTime completedAt;
	private List<PageResponse> pages;

	@Data
	@Builder
	@NoArgsConstructor
	@AllArgsConstructor
	public static class PageResponse {
		private Integer pageNumber;
		private String fullText;
		private List<WordResponse> words;
	}

	@Data
	@Builder
	@NoArgsConstructor
	@AllArgsConstructor
	public static class WordResponse {
		private String text;
		private Double confidence;
		private BoundingBox boundingBox;
	}

	@Data
	@Builder
	@NoArgsConstructor
	@AllArgsConstructor
	public static class BoundingBox {
		private Integer x1;
		private Integer y1;
		private Integer x2;
		private Integer y2;
		private Integer x3;
		private Integer y3;
		private Integer x4;
		private Integer y4;
	}
}