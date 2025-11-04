package A704.DODREAM.user.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Classroom {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Integer year;

    @Column(name = "grade_level", nullable = false)
    private Integer gradeLevel;

    @Column(name = "class_number", nullable = false)
    private Integer classNumber;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "teacher_id")
    private TeacherProfile teacher;

    public String getDisplayName() {
        return gradeLevel + "학년 " + classNumber + "반";
    }
}
