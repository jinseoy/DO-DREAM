package A704.DODREAM.user.dto;

import A704.DODREAM.user.entity.TeacherProfile;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class TeacherResponse {
	String name;
	String teacherNumber;

	public static TeacherResponse from(TeacherProfile teacherProfile) {
		return TeacherResponse.builder()
			.name(teacherProfile.getUser().getName())
			.teacherNumber(teacherProfile.getTeacherNumber())
			.build();
	}
}