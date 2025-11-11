package A704.DODREAM.quiz.entity;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import A704.DODREAM.user.entity.User;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "quiz_attempts", indexes = {
	@Index(name = "idx_student", columnList = "student_id"),
	@Index(name = "idx_quiz", columnList = "quiz_id")
})
@EntityListeners(AuditingEntityListener.class)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class QuizAttempt {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "quiz_id", nullable = false)
	private Quiz quiz;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "student_id", nullable = false)
	private User student;

	@Column(name = "score")
	private Integer score;

	@Column(name = "total_questions")
	private Integer totalQuestions;

	@CreatedDate
	@Column(name = "started_at", updatable = false)
	private LocalDateTime startedAt;

	@Column(name = "completed_at")
	private LocalDateTime completedAt;

	// 양방향 관계
	@OneToMany(mappedBy = "attempt", cascade = CascadeType.ALL, orphanRemoval = true)
	@Builder.Default
	private List<StudentAnswer> answers = new ArrayList<>();

	public void complete() {
		this.completedAt = LocalDateTime.now();
		this.score = (int)answers.stream()
			.filter(StudentAnswer::getIsCorrect)
			.count();
		this.totalQuestions = answers.size();
	}
}