package A704.DODREAM.auth.service;

import java.time.Duration;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class RefreshTokenService {
	private final StringRedisTemplate redis;

	private String key(long userId) {
		return "refresh:%d".formatted(userId);
	}

	public void save(long userId, String token, Duration ttl) {
		redis.opsForValue().set(key(userId), token, ttl);
	}

	public boolean validateAndRotate(long userId, String presented, String newToken, Duration ttl) {
		String stored = redis.opsForValue().get(key(userId));
		if (stored == null || !stored.equals(presented))
			return false;
		redis.opsForValue().set(key(userId), newToken, ttl);
		return true;
	}

	public void revoke(long userId) {
		redis.delete(key(userId));
	}
}
