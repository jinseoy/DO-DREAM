package A704.DODREAM.material.dto;

import java.time.LocalDateTime;
import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MaterialShareResponse {
	private Long materialId;
	private String materialTitle;
	private Long teacherId;
	private String teacherName;
	private LocalDateTime sharedAt;

	private Integer totalShared;
	private List<ShareResult> results;

	private String message;

	@Getter
	@Setter
	@NoArgsConstructor
	@AllArgsConstructor
	@Builder
	public static class ShareResult {
		private Long shareId;
		private Long studentId;
		private String studentName;
		private boolean success;
		private String message;
		private LocalDateTime sharedAt;
	}
}
