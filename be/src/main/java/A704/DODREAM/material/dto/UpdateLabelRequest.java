package A704.DODREAM.material.dto;

import A704.DODREAM.material.enums.LabelColor;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class UpdateLabelRequest {
    private Long materialId;
    private LabelColor label;
}
