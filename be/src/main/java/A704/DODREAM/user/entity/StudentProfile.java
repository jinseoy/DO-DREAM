package A704.DODREAM.user.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "student_profiles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StudentProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long Id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(length = 100)
    private String schoolName;

    @Column(name = "student_number")
    private String studentNumber;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "classroom_id")
    private Classroom classroom;

	public static StudentProfile create(User user, String schoolName, String studentNumber) {
		StudentProfile studentProfile = new StudentProfile();
		studentProfile.user = user;
		studentProfile.schoolName = schoolName;
		studentProfile.studentNumber = studentNumber;
		return studentProfile;
	}
}
