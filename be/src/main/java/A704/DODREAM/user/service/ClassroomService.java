package A704.DODREAM.user.service;

import A704.DODREAM.global.exception.CustomException;
import A704.DODREAM.global.exception.constant.ErrorCode;
import A704.DODREAM.material.repository.MaterialShareRepository;
import A704.DODREAM.user.dto.StudentListResponse;
import A704.DODREAM.user.dto.ClassroomResponse;
import A704.DODREAM.user.repository.ClassroomRepository;
import A704.DODREAM.user.repository.ClassroomTeacherRepository;
import A704.DODREAM.user.entity.Classroom;
import A704.DODREAM.user.entity.ClassroomTeacher;
import A704.DODREAM.user.entity.StudentProfile;
import A704.DODREAM.user.entity.TeacherProfile;
import A704.DODREAM.user.repository.StudentProfileRepository;
import A704.DODREAM.user.repository.TeacherProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ClassroomService {

	private final ClassroomTeacherRepository classroomTeacherRepository;
	private final StudentProfileRepository studentProfileRepository;
	private final ClassroomRepository classroomRepository;
	private final TeacherProfileRepository teacherProfileRepository;
	private final MaterialShareRepository materialShareRepository;

    // 선생님의 담당 반 목록
    public ClassroomResponse getTeacherClassrooms(Long teacherId) {

        TeacherProfile teacherProfile = teacherProfileRepository.findByUserId(teacherId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        TeacherProfile teacher = teacherProfileRepository.findById(teacherProfile.getId())
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        List<ClassroomTeacher> classroomTeachers =
                classroomTeacherRepository.findByTeacherIdWithClassroom(teacherProfile.getId());

		List<ClassroomResponse.ClassroomInfo> classroomInfos =
			classroomTeachers.stream()
				.map(ct -> {
					int studentCount = studentProfileRepository
						.findByClassroomIdWithUser(ct.getClassroom().getId())
						.size();
					int materialCount = materialShareRepository
						.findByClassIdAndTeacherId(ct.getClassroom().getId(), ct.getTeacher().getId())
						.size();

					return ClassroomResponse.ClassroomInfo.from(ct, studentCount, materialCount);
				})
				.toList();

		return ClassroomResponse.builder()
			.teacherId(teacherId)
			.teacherName(teacher.getUser().getName())
			.totalCount(classroomInfos.size())
			.classrooms(classroomInfos)
			.build();
	}

    // 반별 학생 목록
    public StudentListResponse getClassroomStudents(Long classroomId, Long teacherId) {
        Classroom classroom = classroomRepository.findById(classroomId)
                .orElseThrow(() -> new CustomException(ErrorCode.CLASSROOM_NOT_FOUND));

        TeacherProfile teacher = teacherProfileRepository.findByUserId(teacherId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        if(!classroomTeacherRepository.existsByClassroomIdAndTeacherId(classroomId, teacher.getId())){
            throw new CustomException(ErrorCode.FORBIDDEN);
        }

        List<StudentProfile> students =
                studentProfileRepository.findByClassroomIdWithUser(classroomId);

		return StudentListResponse.of(classroom, students);
	}

    // 선생님의 담당 반별 학생 목록
    public List<StudentListResponse> getTeacherClassroomStudents(Long teacherId, List<Long> classroomIds){
        TeacherProfile teacher = teacherProfileRepository.findByUserId(teacherId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        List<ClassroomTeacher> classroomTeachers =
                classroomTeacherRepository.findByTeacherIdWithClassroom(teacher.getId());

		List<Classroom> targetClassrooms;
		if (classroomIds == null || classroomIds.isEmpty()) {
			targetClassrooms = classroomTeachers.stream()
				.map(ClassroomTeacher::getClassroom)
				.toList();
		} else {
			targetClassrooms = classroomTeachers.stream()
				.map(ClassroomTeacher::getClassroom)
				.filter(c -> classroomIds.contains(c.getId()))
				.toList();
		}

		List<Long> targetClassroomIds = targetClassrooms.stream()
			.map(Classroom::getId)
			.toList();

		List<StudentProfile> allStudents =
			studentProfileRepository.findByClassroomIdsWithUser(targetClassroomIds);

		Map<Long, List<StudentProfile>> studentsByClassroom = allStudents.stream()
			.collect(Collectors.groupingBy(s -> s.getClassroom().getId()));

		List<StudentListResponse> responses = new ArrayList<>();
		for (Classroom classroom : targetClassrooms) {
			List<StudentProfile> students = studentsByClassroom.getOrDefault(classroom.getId(), List.of());
			responses.add(StudentListResponse.of(classroom, students));
		}

		return responses;
	}
}