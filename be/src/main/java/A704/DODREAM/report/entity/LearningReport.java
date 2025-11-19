package A704.DODREAM.report.entity;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import A704.DODREAM.material.entity.Material;
import A704.DODREAM.user.entity.User;
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
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "learning_reports", indexes = {
	@Index(name = "idx_student", columnList = "student_id"),
	@Index(name = "idx_period", columnList = "report_period_start, report_period_end")
})
@EntityListeners(AuditingEntityListener.class)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class LearningReport {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "student_id", nullable = false)
	private User student;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "material_id")
	private Material material;

	@Column(name = "report_period_start", nullable = false)
	private LocalDate reportPeriodStart;

	@Column(name = "report_period_end", nullable = false)
	private LocalDate reportPeriodEnd;

	@Column(name = "total_study_time_minutes")
	@Builder.Default
	private Integer totalStudyTimeMinutes = 0;

	@Column(name = "materials_completed")
	@Builder.Default
	private Integer materialsCompleted = 0;

	@Column(name = "quizzes_attempted")
	@Builder.Default
	private Integer quizzesAttempted = 0;

	@Column(name = "quiz_average_score", precision = 5, scale = 2)
	private BigDecimal quizAverageScore;

	@Column(name = "ai_conversations_count")
	@Builder.Default
	private Integer aiConversationsCount = 0;

	@CreatedDate
	@Column(name = "created_at", updatable = false)
	private LocalDateTime createdAt;
}