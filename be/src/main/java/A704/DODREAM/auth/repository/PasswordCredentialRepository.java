package A704.DODREAM.auth.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import A704.DODREAM.auth.entity.PasswordCredential;

public interface PasswordCredentialRepository extends JpaRepository<PasswordCredential, Long> {
	Optional<PasswordCredential> findByEmail(String email);

	boolean existsByEmail(String email);
}
