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
@Table(name = "device_credentials")
@Getter
public class DeviceCredential extends BaseTimeEntity {
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "user_id")
	private User user;

	private String deviceId;      // ANDROID_ID / iOS identifierForVendor 등 (클라에서 전달)
	private String platform;      // ANDROID / IOS
	private String secretHash;    // BCrypt(deviceSecret)

	public static DeviceCredential create(User u, String deviceId, String platform,
		String secretHash) {
		DeviceCredential dc = new DeviceCredential();
		dc.user = u;
		dc.deviceId = deviceId;
		dc.platform = platform;
		dc.secretHash = secretHash;
		return dc;
	}
}
