package A704.DODREAM.user.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import A704.DODREAM.user.entity.TeacherProfile;

public interface TeacherProfileRepository extends JpaRepository<TeacherProfile, Long> {
	Optional<TeacherProfile> findByUserId(Long userId);
}
