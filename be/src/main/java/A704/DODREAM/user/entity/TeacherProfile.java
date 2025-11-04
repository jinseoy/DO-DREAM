package A704.DODREAM.user.entity;

import jakarta.persistence.*;
import lombok.Builder;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "teacher_profiles")
public class TeacherProfile {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private long id;

	@OneToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "user_id")
	private User user;

    @OneToMany(mappedBy = "teacher")
    private List<Classroom> classrooms = new ArrayList<>();

	public static TeacherProfile create(User user) {
		TeacherProfile teacherProfile = new TeacherProfile();
		teacherProfile.user = user;
		return teacherProfile;
	}
}
