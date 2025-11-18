package A704.DODREAM.user.dto;

import java.util.List;

import A704.DODREAM.user.entity.Classroom;
import A704.DODREAM.user.entity.StudentProfile;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentListResponse {

	private Long classroomId;
	private Integer year;
	private Integer gradeLevel;
	private Integer classNumber;
	private String displayName;
	private String schoolName;
	private int totalCount;
	private List<StudentInfo> students;

	@Getter
	@Builder
	@NoArgsConstructor
	@AllArgsConstructor
	public static class StudentInfo {
		private Long studentId;
		private String studentName;
		private String studentNumber;
        private String gender;

		public static StudentInfo from(StudentProfile student) {
			return StudentInfo.builder()
				.studentId(student.getUser().getId())
				.studentName(student.getUser().getName())
				.studentNumber(student.getStudentNumber())
                .gender(student.getGender())
				.build();
		}
	}

	public static StudentListResponse of(Classroom classroom, List<StudentProfile> students) {
		return StudentListResponse.builder()
			.classroomId(classroom.getId())
			.year(classroom.getYear())
			.gradeLevel(classroom.getGradeLevel())
			.classNumber(classroom.getClassNumber())
			.displayName(classroom.getDisplayName())
			.totalCount(students.size())
			.students(students.stream()
				.map(StudentInfo::from)
				.toList())
			.build();
	}
}