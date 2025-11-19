package A704.DODREAM.user.service;

import A704.DODREAM.global.exception.CustomException;
import A704.DODREAM.global.exception.constant.ErrorCode;
import A704.DODREAM.user.dto.StudentDetailResponse;
import A704.DODREAM.user.entity.Role;
import A704.DODREAM.user.entity.StudentProfile;
import A704.DODREAM.user.entity.TeacherProfile;
import A704.DODREAM.user.entity.User;
import A704.DODREAM.user.repository.ClassroomTeacherRepository;
import A704.DODREAM.user.repository.StudentProfileRepository;
import A704.DODREAM.user.repository.TeacherProfileRepository;
import A704.DODREAM.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
@Slf4j
public class StudentService {

	private final StudentProfileRepository studentProfileRepository;
	private final UserRepository userRepository;
	private final TeacherProfileRepository teacherProfileRepository;
	private final ClassroomTeacherRepository classroomTeacherRepository;

	/**
	 * 교사가 특정 학생의 상세 정보를 조회
	 * - 교사는 자신이 담당하는 반의 학생만 조회 가능
	 */
	public StudentDetailResponse getStudentDetail(Long studentId, Long teacherId) {
		// 학생 정보 조회
		User student = userRepository.findById(studentId)
			.orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

		if (student.getRole() != Role.STUDENT) {
			throw new CustomException(ErrorCode.USER_NOT_FOUND);
		}

		StudentProfile studentProfile = studentProfileRepository.findByUserId(studentId)
			.orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

		// 교사 정보 조회
		TeacherProfile teacherProfile = teacherProfileRepository.findByUserId(teacherId)
			.orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

		// 교사가 해당 학생의 반을 담당하는지 확인
		if (studentProfile.getClassroom() != null) {
			boolean isTeacherOfStudent = classroomTeacherRepository
				.existsByClassroomIdAndTeacherId(
					studentProfile.getClassroom().getId(),
					teacherProfile.getId()
				);

			if (!isTeacherOfStudent) {
				throw new CustomException(ErrorCode.FORBIDDEN);
			}
		} else {
			// 학생이 반에 속해있지 않은 경우
			throw new CustomException(ErrorCode.CLASSROOM_NOT_FOUND);
		}

		return StudentDetailResponse.from(studentProfile);
	}

	/**
	 * 학생 본인의 정보 조회
	 */
	public StudentDetailResponse getMyInfo(Long studentId) {
		User student = userRepository.findById(studentId)
			.orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

		if (student.getRole() != Role.STUDENT) {
			throw new CustomException(ErrorCode.FORBIDDEN);
		}

		StudentProfile studentProfile = studentProfileRepository.findByUserId(studentId)
			.orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

		return StudentDetailResponse.from(studentProfile);
	}
}

