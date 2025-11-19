package A704.DODREAM.fcm.dto;

import A704.DODREAM.fcm.enums.DeviceType;
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
public class TokenRegisterDto {
    private String token;
    private DeviceType deviceType;
}
