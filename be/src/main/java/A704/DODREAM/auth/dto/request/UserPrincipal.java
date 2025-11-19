package A704.DODREAM.auth.dto.request;

import java.io.Serializable;

public record UserPrincipal(
	Long userId,
	String name,
	String role
) implements Serializable {
}