package A704.DODREAM.domain.quiz;

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
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import java.time.LocalDateTime;

@Entity
@Table(name = "student_answer", indexes = {
    @Index(name = "idx_attempt", columnList = "attempt_id"),
    @Index(name = "idx_student_wrong", columnList = "attempt_id, is_correct")
})
@EntityListeners(AuditingEntityListener.class)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class StudentAnswer {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "answer_id")
  private Long answerId;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "attempt_id", nullable = false)
  private QuizAttempt attempt;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "question_id", nullable = false)
  private QuizQuestion question;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "selected_option_id", nullable = false)
  private QuizOption selectedOption;

  @Column(name = "is_correct", nullable = false)
  private Boolean isCorrect;

  @CreatedDate
  @Column(name = "answered_at", updatable = false)
  private LocalDateTime answeredAt;

  @Column(name = "reviewed_at")
  private LocalDateTime reviewedAt;
}