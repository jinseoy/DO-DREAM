package A704.DODREAM.auth.filter;

import java.io.IOException;
import java.util.List;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.servlet.HandlerExceptionResolver;

import A704.DODREAM.auth.dto.request.UserPrincipal;
import A704.DODREAM.auth.util.JwtUtil;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {

	private final JwtUtil jwt;

	@Override
	protected boolean shouldNotFilter(HttpServletRequest request) {
		// 프리플라이트만 스킵(선택). 그 외 경로 화이트리스트는 SecurityConfig에서 permitAll로만 관리
		return "OPTIONS".equalsIgnoreCase(request.getMethod());
	}

	@Override
	protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
		throws ServletException, IOException {
		String h = req.getHeader("Authorization");
		if (h != null && h.startsWith("Bearer ")) {
			try {
				Claims c = jwt.parse(h.substring(7)).getBody();

				// JwtUtil에서 subject = userId 문자열, name/role은 claim으로 발급 중
				Long userId = parseLong(c.getSubject());
				String name  = c.get("name", String.class);
				String role  = c.get("role", String.class);

				if (userId == null || role == null) {
					res.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
					return;
				}

				if (SecurityContextHolder.getContext().getAuthentication() == null) {
					UserPrincipal principal = new UserPrincipal(userId, name, role);

					var auth = new UsernamePasswordAuthenticationToken(
						principal,
						null,
						List.of(new SimpleGrantedAuthority("ROLE_" + role))
					);
					SecurityContextHolder.getContext().setAuthentication(auth);
				}
			} catch (Exception e) {
				res.setStatus(HttpServletResponse.SC_UNAUTHORIZED); // 401
				return;
			}
		}
		chain.doFilter(req, res);
	}

	private Long parseLong(String v) {
		try { return v == null ? null : Long.parseLong(v); }
		catch (NumberFormatException e) { return null; }
	}

	// @Override
	// protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
	// 	throws ServletException, IOException {
	// 	String h = req.getHeader("Authorization");
	// 	if (h != null && h.startsWith("Bearer ")) {
	// 		try {
	// 			Claims c = jwt.parse(h.substring(7)).getBody();
	// 			String sub = c.getSubject();
	// 			String role = c.get("role", String.class);
	//
	// 			if (SecurityContextHolder.getContext().getAuthentication() == null) {
	// 				var auth = new UsernamePasswordAuthenticationToken(
	// 					sub, null, List.of(new SimpleGrantedAuthority("ROLE_" + role)));
	// 				SecurityContextHolder.getContext().setAuthentication(auth);
	// 			}
	// 		} catch (Exception e) {
	// 			res.setStatus(HttpServletResponse.SC_UNAUTHORIZED); // 401
	// 			return;
	// 		}
	// 	}
	// 	chain.doFilter(req, res);
	// }
}
