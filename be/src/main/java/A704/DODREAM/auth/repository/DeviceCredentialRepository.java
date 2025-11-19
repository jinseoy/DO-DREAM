package A704.DODREAM.auth.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import A704.DODREAM.auth.entity.DeviceCredential;

public interface DeviceCredentialRepository extends JpaRepository<DeviceCredential, Long> {
	Optional<DeviceCredential> findByDeviceId(String deviceId);

	boolean existsByDeviceId(String deviceId);
}