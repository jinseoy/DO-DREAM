package A704.DODREAM.config;

import A704.DODREAM.auth.filter.JwtAuthFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@RequiredArgsConstructor
public class SecurityConfig {

	private final JwtAuthFilter jwtAuthFilter; // 분리한 필터 주입

	@Bean
	public CorsConfigurationSource corsConfigurationSource() {
		CorsConfiguration config = new CorsConfiguration();
		config.setAllowedOrigins(List.of(
			"https://www.dodream.io.kr",
			"http://localhost:5173",
			"http://localhost:8080"
		));
		config.setAllowedMethods(List.of("GET","POST","PUT","DELETE","PATCH","OPTIONS"));
		config.setAllowedHeaders(List.of("*"));
		config.setAllowCredentials(true);
		config.setMaxAge(3600L);

		UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
		source.registerCorsConfiguration("/**", config);
		return source;
	}

	@Bean
	SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
		http
			.cors(c -> c.configurationSource(corsConfigurationSource()))
			.csrf(cs -> cs.disable())
			.sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
			.authorizeHttpRequests(auth -> auth
				// 인가 규칙(화이트리스트)은 여기에서만 관리
				.requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
				.requestMatchers("/error", "/error/**").permitAll()
				.requestMatchers(
					"/api/swagger-ui/**", "/api/v3/api-docs/**",
					"/swagger-ui/**", "/v3/api-docs/**",
					"/swagger-resources/**"
				).permitAll()
				.requestMatchers("/api/auth/**", "/auth/**", "/actuator/**", "/health").permitAll()
				// 교사 전용
				.requestMatchers("/api/teacher/**").hasRole("TEACHER")
				// 나머지는 인증 필요
				.anyRequest().authenticated()
			)
			.addFilterBefore(jwtAuthFilter, org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter.class);

		return http.build();
	}
}