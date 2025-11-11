package A704.DODREAM.fcm.entity;

import java.time.LocalDateTime;

import A704.DODREAM.fcm.enums.DeviceType;
import A704.DODREAM.user.entity.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserDevices {
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "user_id", nullable = false)
	private User user;

	@Column(length = 500, nullable = false, unique = true)
	private String fcmToken;

	@Enumerated(EnumType.STRING)
	private DeviceType deviceType;

	@Column(nullable = false)
	private LocalDateTime registeredAt;

	private LocalDateTime lastUsedAt;

	@Column(nullable = false)
	private boolean isActive;
}
