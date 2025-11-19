package A704.DODREAM.file.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DocumentSectionResponse {
	private Long sectionId;
	private String title;
	private Integer level;
	private Integer startPage;
	private Integer endPage;
	private Integer fontSize;
	private String summaryText;
}