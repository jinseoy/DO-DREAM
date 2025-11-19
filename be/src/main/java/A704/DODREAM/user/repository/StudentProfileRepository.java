package A704.DODREAM.user.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import A704.DODREAM.user.entity.StudentProfile;

public interface StudentProfileRepository extends JpaRepository<StudentProfile, Long> {

	// 특정 반의 학생 목록
	@Query("SELECT s FROM StudentProfile s " +
		"JOIN FETCH s.user u " +
		"WHERE s.classroom.id = :classroomId")
	List<StudentProfile> findByClassroomIdWithUser(Long classroomId);

	@Query("SELECT s FROM StudentProfile s " +
		"JOIN FETCH s.user u " +
		"WHERE s.classroom.id IN :classroomIds " +
		"ORDER BY s.classroom.id, s.studentNumber")
	List<StudentProfile> findByClassroomIdsWithUser(List<Long> classroomIds);

	// 특정 학생의 프로필 조회
	@Query("SELECT s FROM StudentProfile s " +
		"JOIN FETCH s.user u " +
		"LEFT JOIN FETCH s.classroom c " +
		"LEFT JOIN FETCH c.school " +
		"WHERE s.user.id = :userId")
	Optional<StudentProfile> findByUserId(@Param("userId") Long userId);
}
