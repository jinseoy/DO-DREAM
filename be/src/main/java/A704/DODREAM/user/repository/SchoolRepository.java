package A704.DODREAM.user.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import A704.DODREAM.user.entity.School;

public interface SchoolRepository extends JpaRepository<School, Long> {
	Optional<School> findByName(String name);
}
