package A704.DODREAM.user.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import A704.DODREAM.user.entity.ClassroomTeacher;
import A704.DODREAM.user.entity.StudentProfile;

public interface ClassroomTeacherRepository extends JpaRepository<ClassroomTeacher, Long> {

	// 특정 선생님이 담당하는 반 목록
	@Query("SELECT ct FROM ClassroomTeacher ct " +
		"JOIN FETCH ct.classroom c " +
		"WHERE ct.teacher.id = :teacherId")
	List<ClassroomTeacher> findByTeacherIdWithClassroom(Long teacherId);

	// 여러 반의 학생 목록
	@Query("SELECT s FROM StudentProfile s " +
		"JOIN FETCH s.user u " +
		"WHERE s.classroom.id IN :classroomIds " +
		"ORDER BY s.classroom.id, s.studentNumber")
	List<StudentProfile> findByClassroomIdsWithUser(List<Long> classroomIds);

	boolean existsByClassroomIdAndTeacherId(Long classroomId, Long teacherId);
}
