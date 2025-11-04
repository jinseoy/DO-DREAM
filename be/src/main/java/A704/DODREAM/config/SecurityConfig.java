package A704.DODREAM.config;

import java.io.IOException;
import java.util.List;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.filter.OncePerRequestFilter;
import A704.DODREAM.auth.util.JwtUtil;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;

@Configuration
@RequiredArgsConstructor
public class SecurityConfig {

	private final JwtUtil jwt;

	@Bean
	SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
		http
			.cors(cors -> {})
			.csrf(csrf -> csrf.disable())
			.sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
			.authorizeHttpRequests(auth -> auth
				.requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
				// ★ springdoc 경로 모두 허용 (프리픽스 유무 둘 다)
				.requestMatchers(
					"/api/swagger-ui/**", "/api/v3/api-docs/**",
					"/swagger-ui/**", "/v3/api-docs/**"
				).permitAll()
				// ★ 인증/헬스
				.requestMatchers("/api/auth/**", "/actuator/**", "/health").permitAll()
				// 교사 전용
				.requestMatchers("/api/teacher/**").hasRole("TEACHER")
				.anyRequest().authenticated()
			);

		http.addFilterBefore(new JwtAuthFilter(jwt),
			org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter.class);

		return http.build();
	}

	// ★ JwtAuthFilter: 공개 경로/OPTIONS 는 필터 스킵 + 조기 return
	static class JwtAuthFilter extends OncePerRequestFilter {
		private final JwtUtil jwt;
		JwtAuthFilter(JwtUtil jwt) { this.jwt = jwt; }

		@Override
		protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
			throws ServletException, IOException {

			String uri = req.getRequestURI();
			if ("OPTIONS".equalsIgnoreCase(req.getMethod())
				|| uri.startsWith("/api/auth/")
				|| uri.startsWith("/api/swagger-ui/")
				|| uri.startsWith("/api/v3/api-docs/")
				|| uri.startsWith("/swagger-ui/")
				|| uri.startsWith("/v3/api-docs/")) {
				chain.doFilter(req, res);
				return; // ★ 조기 반환
			}

			String h = req.getHeader("Authorization");
			if (h != null && h.startsWith("Bearer ")) {
				String at = h.substring(7);
				try {
					Claims c = jwt.parse(at).getBody();
					String sub = c.getSubject();
					String role = c.get("role", String.class);
					var auth = new UsernamePasswordAuthenticationToken(
						sub, null, List.of(new SimpleGrantedAuthority("ROLE_" + role)));
					org.springframework.security.core.context.SecurityContextHolder
						.getContext().setAuthentication(auth);
				} catch (Exception ignored) {}
			}
			chain.doFilter(req, res);
		}
	}
}