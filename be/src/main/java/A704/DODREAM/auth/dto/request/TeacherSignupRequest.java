package A704.DODREAM.auth.dto.request;

public record TeacherSignupRequest(
	String name,
	String teacherNumber,   // ← 사전 인증 값도 함께 받아 서버에서 재검증
	String email,
	String password
) {
}

