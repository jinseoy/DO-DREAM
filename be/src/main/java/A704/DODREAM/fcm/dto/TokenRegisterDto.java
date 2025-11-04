package A704.DODREAM.fcm.dto;

import A704.DODREAM.fcm.enums.DeviceType;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TokenRegisterDto {
    private Long userId;
    private String token;
    private DeviceType deviceType;
}
