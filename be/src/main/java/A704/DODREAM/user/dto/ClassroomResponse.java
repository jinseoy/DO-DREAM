package A704.DODREAM.user.dto;

import java.util.List;

import A704.DODREAM.user.entity.Classroom;
import A704.DODREAM.user.entity.ClassroomTeacher;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClassroomResponse {
	private Long teacherId;
	private String teacherName;
	private int totalCount;
	private List<ClassroomInfo> classrooms;

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
		private int studentCount;
		private int materialCount;

		public static ClassroomInfo from(ClassroomTeacher ct, int studentCount, int materialCount) {
			Classroom classroom = ct.getClassroom();
			return ClassroomInfo.builder()
				.classroomId(classroom.getId())
				.year(classroom.getYear())
				.gradeLevel(classroom.getGradeLevel())
				.classNumber(classroom.getClassNumber())
				.displayName(classroom.getDisplayName())
				.studentCount(studentCount)
				.materialCount(materialCount)
				.build();
		}
	}
}