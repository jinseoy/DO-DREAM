package A704.DODREAM.material.dto;

import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MaterialShareRequest {
    private Long materialId;
    private Long teacherId;
    private List<Long> studentIds;
    private String shareMessage;
}
