package A704.DODREAM.auth.controller;

import java.time.Duration;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import A704.DODREAM.auth.dto.request.TeacherLoginRequest;
import A704.DODREAM.auth.dto.request.TeacherSignupRequest;
import A704.DODREAM.auth.dto.request.TeacherVerifyRequest;
import A704.DODREAM.auth.dto.response.TokenResponse;
import A704.DODREAM.auth.service.RefreshTokenService;
import A704.DODREAM.auth.service.TeacherAuthService;
import A704.DODREAM.auth.util.CookieUtil;
import A704.DODREAM.auth.util.JwtUtil;
import A704.DODREAM.user.entity.User;
import A704.DODREAM.user.repository.UserRepository;
import io.jsonwebtoken.Claims;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;

@Tag(name = "Teacher Auth API", description = "교사 로그인/회원가입 API")
@RestController
@RequestMapping("/api/auth/teacher")
@RequiredArgsConstructor
public class TeacherAuthController {

	private final TeacherAuthService teacherAuthService;
	private final JwtUtil jwt;
	private final RefreshTokenService refreshTokenService;
	private final UserRepository userRepository; // ← refresh에서 실제 유저 로드

	private static final int RT_MAX_AGE = 14 * 24 * 60 * 60;

	@Operation(
		summary = "교사 사전 인증",
		description = "교원번호와 이름으로 학사 더미레지스트리 일치 여부를 확인합니다."
	)
	@PostMapping("/verify")
	public ResponseEntity<Void> verify(@RequestBody TeacherVerifyRequest req) {
		teacherAuthService.verify(req);
		return ResponseEntity.ok().build();
	}

	// 1) 회원가입 (레지스트리 재검증 포함)
	@Operation(
		summary = "교사 회원가입",
		description = "사전 인증 정보(이름/교원번호)와 이메일/비밀번호로 회원가입을 완료합니다."
	)
	@PostMapping("/register")
	public ResponseEntity<Void> register(@RequestBody TeacherSignupRequest req) {
		teacherAuthService.signup(req);
		return ResponseEntity.ok().build();
	}

	@Operation(
		summary = "교사 로그인",
		description = "이메일과 비밀번호로 로그인합니다. AT는 응답 바디로, RT는 HttpOnly 쿠키로 발급됩니다."
	)
	@PostMapping("/login")
	public ResponseEntity<TokenResponse> login(@RequestBody TeacherLoginRequest req,
		HttpServletResponse res) {
		User user = teacherAuthService.authenticate(req);

		String at = jwt.createAccessToken(user);
		String rt = jwt.createRefreshToken(user);

		// Redis 저장 + HttpOnly 쿠키 발급 (ResponseCookie 헤더로)
		refreshTokenService.save(user.getId(), rt, Duration.ofSeconds(RT_MAX_AGE));
		CookieUtil.addRefreshCookie(res, rt, RT_MAX_AGE);

		// AT는 JSON 바디로 (프론트: localStorage 저장)
		return ResponseEntity.ok(new TokenResponse(at));
	}

	// 쿠키의 RT로 새 AT 발급 + RT 회전
	@Operation(
		summary = "토큰 재발급",
		description = "쿠키에 담긴 Refresh Token으로 Access Token을 재발급하고, Refresh Token을 회전합니다."
	)
	@PostMapping("/refresh")
	public ResponseEntity<TokenResponse> refresh(HttpServletRequest req, HttpServletResponse res) {
		String rt = extractRefreshFromCookie(req);
		if (rt == null) {
			CookieUtil.deleteRefreshCookie(res);    // ← 쿠키 정리
			return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
		}

		Claims claims;
		try {
			claims = jwt.parse(rt).getBody();       // 서명/만료 검증
		} catch (io.jsonwebtoken.ExpiredJwtException e) {
			CookieUtil.deleteRefreshCookie(res);    // ← 만료: 쿠키 제거
			return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
		} catch (Exception e) {
			CookieUtil.deleteRefreshCookie(res);    // ← 기타 오류도 쿠키 제거
			return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
		}

		Long userId = Long.valueOf(claims.getSubject());
		User user = userRepository.findById(userId)
			.orElseThrow(() -> {
				CookieUtil.deleteRefreshCookie(res);     // 유저 없음: 쿠키 제거
				return new ResponseStatusException(HttpStatus.UNAUTHORIZED);
			});

		String newAT = jwt.createAccessToken(user);
		String newRT = jwt.createRefreshToken(user);

		boolean ok = refreshTokenService.validateAndRotate(userId, rt, newRT, Duration.ofSeconds(RT_MAX_AGE));
		if (!ok) {
			CookieUtil.deleteRefreshCookie(res);    // ← Redis 불일치/만료: 쿠키 제거
			return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
		}

		CookieUtil.addRefreshCookie(res, newRT, RT_MAX_AGE);
		return ResponseEntity.ok(new TokenResponse(newAT));
	}

	@Operation(
		summary = "로그아웃",
		description = "서버에 저장된 Refresh Token을 폐기하고, 쿠키의 RT를 삭제합니다."
	)
	@PostMapping("/logout")
	public ResponseEntity<Void> logout(HttpServletRequest req, HttpServletResponse res) {
		String rt = extractRefreshFromCookie(req);
		if (rt != null) {
			try {
				var claims = jwt.parse(rt).getBody();
				Long userId = Long.valueOf(claims.getSubject());
				refreshTokenService.revoke(userId);
			} catch (Exception ignored) {
			}
		}
		CookieUtil.deleteRefreshCookie(res);
		return ResponseEntity.ok().build();
	}

	private String extractRefreshFromCookie(HttpServletRequest req) {
		Cookie[] cookies = req.getCookies();
		if (cookies == null)
			return null;
		for (Cookie c : cookies) {
			if (CookieUtil.REFRESH_COOKIE.equals(c.getName()))
				return c.getValue();
		}
		return null;
	}
}
