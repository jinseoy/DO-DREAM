package A704.DODREAM.fcm.dto;

import A704.DODREAM.fcm.enums.DeviceType;
import lombok.*;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FcmResponse {
    private boolean success;
    private String message;
    private List<UserResult> result;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class UserResult {
        private Long userId;
        private String userName;
        private List<FcmResult> devices;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class FcmResult {
        private Long deviceId;
        private DeviceType deviceType;
        private Boolean success;
    }
}
