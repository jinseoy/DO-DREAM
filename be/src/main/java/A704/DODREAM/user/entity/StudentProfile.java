package A704.DODREAM.user.entity;

import jakarta.persistence.*;
import lombok.*;

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

    @Column(name = "grade_level")
    private Integer gradeLevel;

    @Column(name = "class_number")
    private Integer classNumber;

    @Column(name = "student_number")
    private String studentNumber;
}
