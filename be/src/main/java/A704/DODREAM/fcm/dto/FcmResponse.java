package A704.DODREAM.fcm.dto;

import java.util.List;

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
