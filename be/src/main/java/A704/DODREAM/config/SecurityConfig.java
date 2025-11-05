package A704.DODREAM.config;

import A704.DODREAM.auth.util.JwtUtil;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Configuration
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtUtil jwt;

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();

		config.setAllowedOrigins(List.of( "https://www.dodream.io.kr", "http://localhost:5173", "http://localhost:8080"));
		config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
		config.setAllowedHeaders(List.of("*"));
		config.setAllowCredentials(true);
		config.setMaxAge(3600L); // 3600초

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    @Bean
    SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource())) // CORS 설정
                .csrf(csrf -> csrf.disable())
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers("/error", "/error/**").permitAll()
                        // springdoc (프리픽스 유무 모두 허용)
                        .requestMatchers("/api/swagger-ui/**", "/api/v3/api-docs/**",
                                "/swagger-ui/**", "/v3/api-docs/**").permitAll()
                        // 공개 엔드포인트
                        .requestMatchers("/api/auth/**", "/auth/**", "/actuator/**", "/health").permitAll()
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

        JwtAuthFilter(JwtUtil jwt) {
            this.jwt = jwt;
        }

        @Override
        protected boolean shouldNotFilter(HttpServletRequest req) {
            String u = req.getRequestURI();
            return "OPTIONS".equalsIgnoreCase(req.getMethod())
                    || u.equals("/error")
                    || u.startsWith("/api/auth/")
                    || u.startsWith("/auth/")
                    || u.startsWith("/api/swagger-ui/")
                    || u.startsWith("/api/v3/api-docs/")
                    || u.startsWith("/swagger-ui/")
                    || u.startsWith("/v3/api-docs/");
        }

        @Override
        protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
                throws ServletException, IOException {
            String h = req.getHeader("Authorization");
            if (h != null && h.startsWith("Bearer ")) {
                String at = h.substring(7);
                try {
                    Claims c = jwt.parse(at).getBody();
                    String sub = c.getSubject();
                    String role = c.get("role", String.class);
                    var auth = new UsernamePasswordAuthenticationToken(
                            sub, null, List.of(new SimpleGrantedAuthority("ROLE_" + role)));
                    org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(auth);
                } catch (Exception ignored) {
                }
            }
            chain.doFilter(req, res);
        }
    }
}