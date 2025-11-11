package A704.DODREAM.auth.controller;

import java.time.Duration;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import A704.DODREAM.auth.dto.request.StudentLoginRequest;
import A704.DODREAM.auth.dto.request.StudentSignupRequest;
import A704.DODREAM.auth.dto.request.StudentVerifyRequest;
import A704.DODREAM.auth.dto.response.TokenResponse;
import A704.DODREAM.auth.service.RefreshTokenService;
import A704.DODREAM.auth.service.StudentAuthService;
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

@Tag(name = "Student Auth API", description = "학생 회원가입/로그인 API (생체인증 기반)")
@RestController
@RequestMapping("/api/auth/student")
@RequiredArgsConstructor
public class StudentAuthController {
	private final StudentAuthService studentAuthService;
	private final JwtUtil jwt;
	private final RefreshTokenService refreshTokenService;
	private final UserRepository userRepository;

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
