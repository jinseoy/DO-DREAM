package A704.DODREAM.auth.dto.request;

public record StudentLoginRequest(
	String deviceId,
	String deviceSecret
) {
}
