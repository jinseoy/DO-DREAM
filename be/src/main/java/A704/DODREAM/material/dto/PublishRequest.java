package A704.DODREAM.material.dto;

import A704.DODREAM.material.enums.LabelColor;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PublishRequest {

    String materialTitle;
    LabelColor labelColor;
    Map<String,Object> editedJson;
}
