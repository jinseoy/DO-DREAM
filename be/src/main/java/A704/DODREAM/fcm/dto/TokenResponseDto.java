package A704.DODREAM.fcm.dto;

import java.time.LocalDateTime;

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
