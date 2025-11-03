package A704.DODREAM.fcm.dto;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TokenResponseDto {
    private boolean success;
    private String message;
    private TokenInfo tokenInfo;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class TokenInfo {
        private Long deviceId;
        private Long userId;
        private String deviceType;
        private LocalDateTime registeredAt;
        private LocalDateTime lastUsedAt;
    }
}
