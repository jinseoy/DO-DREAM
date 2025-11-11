package A704.DODREAM.file.dto;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PageOcrResult {
	private Integer pageNumber;
	private String fullText;
	private List<WordInfo> words;

	@Data
	@Builder
	@NoArgsConstructor
	@AllArgsConstructor
	public static class WordInfo {
		private String text;
		private Double confidence;
		private Integer x1;
		private Integer y1;
		private Integer x2;
		private Integer y2;
		private Integer x3;
		private Integer y3;
		private Integer x4;
		private Integer y4;
		private Integer order;
	}
}