package A704.DODREAM.auth.controller;

import java.time.Duration;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import A704.DODREAM.auth.dto.request.StudentLoginRequest;
import A704.DODREAM.auth.dto.request.StudentSignupRequest;
import A704.DODREAM.auth.dto.request.StudentVerifyRequest;
import A704.DODREAM.auth.dto.response.TokenResponse;
import A704.DODREAM.auth.service.RefreshTokenService;
import A704.DODREAM.auth.service.StudentAuthService;
import A704.DODREAM.auth.util.CookieUtil;
import A704.DODREAM.auth.util.JwtUtil;
import A704.DODREAM.user.entity.User;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;

@Tag(name = "Student Auth API", description = "학생 회원가입/로그인 API (생체인증 기반)")
@RestController
@RequestMapping("/api/auth/student")
@RequiredArgsConstructor
public class StudentAuthController {
	private final StudentAuthService studentAuthService;
	private final JwtUtil jwt;
	private final RefreshTokenService refreshTokenService;

	private static final int RT_MAX_AGE = 14 * 24 * 60 * 60;

	@Operation(summary = "학생 사전 인증", description = "학번과 이름이 더미레지스트리와 일치하는지 확인")
	@PostMapping("/verify")
	public ResponseEntity<Void> verify(@RequestBody StudentVerifyRequest req) {
		studentAuthService.verify(req);
		return ResponseEntity.ok().build();
	}

	@Operation(summary = "학생 회원가입", description = "사전 인증 후 기기 시크릿과 함께 가입")
	@PostMapping("/register")
	public ResponseEntity<Void> register(@RequestBody StudentSignupRequest req) {
		studentAuthService.signup(req);
		return ResponseEntity.ok().build();
	}

	@Operation(summary = "학생 로그인", description = "기기 시크릿으로 로그인, AT 바디/RT 쿠키")
	@PostMapping("/login")
	public ResponseEntity<TokenResponse> login(@RequestBody StudentLoginRequest req,
		HttpServletResponse res) {
		User user = studentAuthService.authenticate(req);
		String at = jwt.createAccessToken(user);
		String rt = jwt.createRefreshToken(user);

		refreshTokenService.save(user.getId(), rt, Duration.ofSeconds(RT_MAX_AGE));
		CookieUtil.addRefreshCookie(res, rt, RT_MAX_AGE);
		return ResponseEntity.ok(new TokenResponse(at));
	}
}
