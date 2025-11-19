package A704.DODREAM.user.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import A704.DODREAM.user.entity.Classroom;

public interface ClassroomRepository extends JpaRepository<Classroom, Long> {
	Optional<Classroom> findBySchoolIdAndYearAndGradeLevelAndClassNumber(
		Long schoolId, Integer year, Integer gradeLevel, Integer classNumber
	);

	boolean existsBySchoolIdAndYearAndGradeLevelAndClassNumber(
		Long schoolId, Integer year, Integer gradeLevel, Integer classNumber
	);
}
