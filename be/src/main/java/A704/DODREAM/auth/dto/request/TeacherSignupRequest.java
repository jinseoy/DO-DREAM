package A704.DODREAM.auth.dto.request;

public record TeacherSignupRequest(
	String name,        // 실명
	String email,       // 로그인 아이디
	String password     // 평문(서비스에서 BCrypt)
) {}
