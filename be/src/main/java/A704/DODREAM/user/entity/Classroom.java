package A704.DODREAM.user.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "classrooms")
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Classroom {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

	@ManyToOne(optional = false, fetch = FetchType.LAZY)
	@JoinColumn(name = "school_id")
	private School school;

    @Column(nullable = false)
    private Integer year;

    @Column(name = "grade_level", nullable = false)
    private Integer gradeLevel;

    @Column(name = "class_number", nullable = false)
    private Integer classNumber;

    @OneToMany(mappedBy = "classroom")
    @Builder.Default
    private List<ClassroomTeacher> classroomTeachers = new ArrayList<>();

    @OneToMany(mappedBy = "classroom")
    @Builder.Default
    private List<StudentProfile> students = new ArrayList<>();

    public String getDisplayName() {
        return gradeLevel + "학년 " + classNumber + "반";
    }
}
