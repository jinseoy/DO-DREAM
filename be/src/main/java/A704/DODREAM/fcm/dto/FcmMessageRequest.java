package A704.DODREAM.fcm.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class FcmMessageRequest {
	private boolean validateOnly;
	private FcmMessageRequest.Message message;

	@Builder
	@AllArgsConstructor
	@Getter
	public static class Message {
		private FcmMessageRequest.Notification notification;
		private String token;
	}

	@Builder
	@AllArgsConstructor
	@Getter
	public static class Notification {
		private String title;
		private String body;
		private String image;
	}
}
