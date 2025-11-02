package A704.DODREAM.user.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import A704.DODREAM.user.entity.TeacherProfile;

public interface TeacherProfileRepository extends JpaRepository<TeacherProfile, Long> {
}
