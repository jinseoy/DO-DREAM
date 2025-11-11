package A704.DODREAM.fcm.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import A704.DODREAM.fcm.entity.UserDevices;

public interface UserDevicesRepository extends JpaRepository<UserDevices, Long> {

	List<UserDevices> findByUserIdAndIsActiveTrue(Long userId);

	Optional<UserDevices> findByFcmToken(String fcmToken);

	@Modifying
	@Query("UPDATE UserDevices d SET d.isActive = false WHERE d.fcmToken =:token")
	void deactivateByToken(String token);

	List<UserDevices> findByUserId(Long userId);

}
