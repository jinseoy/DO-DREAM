package A704.DODREAM.auth.dto.request;

public record StudentSignupRequest(
	String name,
	String studentNumber,
	String deviceId,
	String platform,    // "ANDROID" | "IOS"
	String deviceSecret // 생체인증 통과 후 기기에서 꺼내 전송
) {
}
