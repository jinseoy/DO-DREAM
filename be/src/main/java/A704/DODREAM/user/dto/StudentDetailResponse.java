package A704.DODREAM.user.dto;

import A704.DODREAM.user.entity.StudentProfile;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentDetailResponse {

	private Long studentId;
	private String studentName;
	private String studentNumber;
	private String gender;
	private String schoolName;
	
	private ClassroomInfo classroom;
	
	@Getter
	@Builder
	@NoArgsConstructor
	@AllArgsConstructor
	public static class ClassroomInfo {
		private Long classroomId;
		private Integer year;
		private Integer gradeLevel;
		private Integer classNumber;
		private String displayName;
	}
	
	public static StudentDetailResponse from(StudentProfile studentProfile) {
		ClassroomInfo classroomInfo = null;
		
		if (studentProfile.getClassroom() != null) {
			classroomInfo = ClassroomInfo.builder()
				.classroomId(studentProfile.getClassroom().getId())
				.year(studentProfile.getClassroom().getYear())
				.gradeLevel(studentProfile.getClassroom().getGradeLevel())
				.classNumber(studentProfile.getClassroom().getClassNumber())
				.displayName(studentProfile.getClassroom().getDisplayName())
				.build();
		}
		
		return StudentDetailResponse.builder()
			.studentId(studentProfile.getUser().getId())
			.studentName(studentProfile.getUser().getName())
			.studentNumber(studentProfile.getStudentNumber())
			.gender(studentProfile.getGender())
			.schoolName(studentProfile.getSchoolName())
			.classroom(classroomInfo)
			.build();
	}
}

