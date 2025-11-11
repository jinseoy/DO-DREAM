package A704.DODREAM.user.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

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
}
