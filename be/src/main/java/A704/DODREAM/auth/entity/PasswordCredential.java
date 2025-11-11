package A704.DODREAM.auth.entity;

import A704.DODREAM.global.entity.BaseTimeEntity;
import A704.DODREAM.user.entity.User;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;

@Entity
@Table(name = "password_credentials")
@Getter
public class PasswordCredential extends BaseTimeEntity {
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private long id;

	@ManyToOne(optional = false, fetch = FetchType.LAZY)
	@JoinColumn(name = "user_id")
	private User user;

	private String email;

	/**
	 * BCrypt 해시
	 */
	private String passwordHash;

	public static PasswordCredential create(User user, String email, String passwordHash) {
		PasswordCredential cred = new PasswordCredential();
		cred.user = user;
		cred.email = email;
		cred.passwordHash = passwordHash;
		return cred;
	}
}
