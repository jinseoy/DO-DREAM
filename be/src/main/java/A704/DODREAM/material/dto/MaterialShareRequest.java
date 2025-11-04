package A704.DODREAM.material.dto;

import A704.DODREAM.material.enums.ShareType;
import lombok.*;

import java.util.List;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MaterialShareRequest {
    private Long materialId;
    private Long teacherId;

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
