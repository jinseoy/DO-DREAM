package A704.DODREAM.user.service;

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

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ClassroomService {

    private final ClassroomTeacherRepository classroomTeacherRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final ClassroomRepository classroomRepository;
    private final TeacherProfileRepository teacherProfileRepository;

    // 선생님의 담당 반 목록
    public ClassroomResponse getTeacherClassrooms(Long teacherId) {
        TeacherProfile teacher = teacherProfileRepository.findById(teacherId)
                .orElseThrow(() -> new IllegalArgumentException("Teacher not found"));

        List<ClassroomTeacher> classroomTeachers =
                classroomTeacherRepository.findByTeacherIdWithClassroom(teacherId);

        List<ClassroomResponse.ClassroomInfo> classroomInfos =
                classroomTeachers.stream()
                        .map(ct -> {
                            int studentCount = studentProfileRepository
                                    .findByClassroomIdWithUser(ct.getClassroom().getId())
                                    .size();
                            return ClassroomResponse.ClassroomInfo.from(ct, studentCount);
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
    public StudentListResponse getClassroomStudents(Long classroomId) {
        Classroom classroom = classroomRepository.findById(classroomId)
                .orElseThrow(() -> new IllegalArgumentException("Classroom not found"));

        List<StudentProfile> students =
                studentProfileRepository.findByClassroomIdWithUser(classroomId);

        return StudentListResponse.of(classroom, students);
    }

    // 선생님의 담당 반별 학생 목록
//    public List<StudentListResponse> getTeacherClassroomStudents(Long teacherId, List<Long> classroomIds){
//        List<ClassroomTeacher> classroomTeachers =
//                classroomTeacherRepository.findByTeacherIdWithClassroom(teacherId);
//
//        List<Classroom> targetClassrooms;
//
//
//    }
}