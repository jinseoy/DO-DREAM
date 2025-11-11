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
@Table(name = "classroom_registries")
@Getter
public class ClassroomRegistry {
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(optional = false, fetch = FetchType.LAZY)
	@JoinColumn(name = "school_id")
	private SchoolRegistry school;

	@Column(nullable = false)
	private Integer year;

	/**
	 * 학년
	 */
	@Column(name = "grade_level", nullable = false)
	private Integer gradeLevel;

	/**
	 * 반
	 */
	@Column(name = "class_number", nullable = false)
	private Integer classNumber;
}
