package A704.DODREAM.registry.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;

@Entity
@Table(name = "student_registries")
@Getter
public class StudentRegistry {
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	private String name;

	private String studentNumber;

	@ManyToOne(fetch= FetchType.LAZY)
	@JoinColumn(name="school_id")
	private SchoolRegistry school;

	private Integer gradeLevel;

	private Integer classNumber;
}

