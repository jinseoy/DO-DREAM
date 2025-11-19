package A704.DODREAM.material.dto;

import java.util.List;
import java.util.Map;

import A704.DODREAM.material.enums.ShareType;
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
public class MaterialShareRequest {

    private Long materialId;

	private Map<Long, ClassShareInfo> shares;

	@Getter
	@Setter
	@NoArgsConstructor
	@AllArgsConstructor
	@Builder
	public static class ClassShareInfo {
		private ShareType type;
		private List<Long> studentIds;
	}
}
