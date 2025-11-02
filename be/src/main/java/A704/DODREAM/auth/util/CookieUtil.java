package A704.DODREAM.auth.util;

import java.time.Duration;

import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;

public class CookieUtil {
	public static final String REFRESH_COOKIE = "refresh";

	public static void addRefreshCookie(HttpServletResponse res, String token, int maxAgeSeconds) {
		ResponseCookie cookie = ResponseCookie.from(REFRESH_COOKIE, token)
			.httpOnly(true)
			.secure(true)
			.path("/auth")
			.maxAge(Duration.ofSeconds(maxAgeSeconds))
			.sameSite("Lax")   // <- 여기서 SameSite 지정 가능
			.build();
		res.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
	}

	public static void deleteRefreshCookie(HttpServletResponse res) {
		ResponseCookie cookie = ResponseCookie.from(REFRESH_COOKIE, "")
			.httpOnly(true)
			.secure(true)
			.path("/auth")
			.maxAge(Duration.ZERO)
			.sameSite("Lax")
			.build();
		res.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
	}
}
