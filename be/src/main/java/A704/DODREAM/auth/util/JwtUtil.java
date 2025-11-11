package A704.DODREAM.auth.util;

import java.time.Instant;
import java.util.Date;

import javax.crypto.SecretKey;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import A704.DODREAM.user.entity.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jws;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;

@Component
public class JwtUtil {
	private final SecretKey key;
	private final long accessExpSeconds;
	private final long refreshExpSeconds;

	public JwtUtil(
		@Value("${jwt.secret}") String secretBase64,
		@Value("${jwt.access-exp-seconds:900}") long accessExpSeconds,
		@Value("${jwt.refresh-exp-seconds:1209600}") long refreshExpSeconds
	) {
		// Base64 문자열을 디코드하여 SecretKey 생성
		this.key = Keys.hmacShaKeyFor(Decoders.BASE64.decode(secretBase64));
		this.accessExpSeconds = accessExpSeconds;
		this.refreshExpSeconds = refreshExpSeconds;
	}

	public String createAccessToken(User u) {
		return createToken(u, accessExpSeconds);
	}

	public String createRefreshToken(User u) {
		return createToken(u, refreshExpSeconds);
	}

	private String createToken(User u, long expSeconds) {
		Instant now = Instant.now();
		return Jwts.builder()
			.subject(String.valueOf(u.getId()))
			.claim("name", u.getName())
			.claim("role", u.getRole().name())
			.issuedAt(Date.from(now))
			.expiration(Date.from(now.plusSeconds(expSeconds)))
			.issuer("dodream")
			.signWith(key, Jwts.SIG.HS256)
			.compact();
	}

	public Jws<Claims> parse(String token) {
		return Jwts.parser()
			.verifyWith(key)
			.build()
			.parseSignedClaims(token);
	}
}
