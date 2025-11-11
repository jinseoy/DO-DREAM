package A704.DODREAM.material.dto;

import java.time.LocalDateTime;
import java.util.List;

import A704.DODREAM.material.entity.MaterialShare;
import A704.DODREAM.material.enums.LabelColor;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MaterialShareListResponse {

	private Long studentId;
	private String studentName;

	private int totalCount;
	private List<SharedMaterialInfo> materials;

	@Getter
	@Builder
	@NoArgsConstructor
	@AllArgsConstructor
	public static class SharedMaterialInfo {
		private Long shareId;
		private Long materialId;
		private String materialTitle;
		private String originalFileName;
		private String fileUrl;
		private Long fileSize;
		private String subject;
		private String gradeLevel;
		private String contentType;
		private String processingStatus;
		private LabelColor labelColor;

		private Long teacherId;
		private String teacherName;

		private LocalDateTime sharedAt;
		private LocalDateTime accessedAt;
		private boolean isAccessed;

		public static SharedMaterialInfo from(MaterialShare share) {
			return SharedMaterialInfo.builder()
				.shareId(share.getId())
				.materialId(share.getMaterial().getId())
				.materialTitle(share.getMaterial().getTitle())
				.originalFileName(share.getMaterial().getOriginalFileName())
				.fileUrl(share.getMaterial().getFileUrl())
				.fileSize(share.getMaterial().getFileSize())
				.subject(share.getMaterial().getSubject())
				.gradeLevel(share.getMaterial().getGradeLevel())
				.contentType(share.getMaterial().getContentType().name())
				.processingStatus(share.getMaterial().getProcessingStatus().name())
				.labelColor(share.getMaterial().getLabel())
				.teacherId(share.getTeacher().getId())
				.teacherName(share.getTeacher().getName())
				.sharedAt(share.getSharedAt())
				.accessedAt(share.getAccessedAt())
				.isAccessed(share.getAccessedAt() != null)
				.build();
		}
	}
}
