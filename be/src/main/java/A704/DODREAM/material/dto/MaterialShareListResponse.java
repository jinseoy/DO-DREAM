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

		private Long teacherId;
		private String teacherName;
        private LabelColor labelColor;

		private LocalDateTime sharedAt;
		private LocalDateTime accessedAt;
		private boolean isAccessed;

		public static SharedMaterialInfo from(MaterialShare share) {
			return SharedMaterialInfo.builder()
				.shareId(share.getId())
				.materialId(share.getMaterial().getId())
				.materialTitle(share.getMaterial().getTitle())
				.teacherId(share.getTeacher().getId())
				.teacherName(share.getTeacher().getName())
                .labelColor(share.getMaterial().getLabel())
				.sharedAt(share.getSharedAt())
				.accessedAt(share.getAccessedAt())
				.isAccessed(share.getAccessedAt() != null)
				.build();
		}
	}
}
