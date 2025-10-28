package A704.DODREAM.domain.quiz;

import A704.DODREAM.domain.user.User;
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
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "quiz_attempt", indexes = {
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
  @Column(name = "attempt_id")
  private Long attemptId;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "quiz_id", nullable = false)
  private Quiz quiz;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "student_id", nullable = false)
  private User student;

  @Column(name = "score")
  private Integer score;  // 44번째 줄: 맞은 개수

  @Column(name = "total_questions")
  private Integer totalQuestions;

  @CreatedDate
  @Column(name = "started_at", updatable = false)
  private LocalDateTime startedAt;

  @Column(name = "completed_at")
  private LocalDateTime completedAt;  // 54번째 줄: 완료 시간

  // 양방향 관계
  @OneToMany(mappedBy = "attempt", cascade = CascadeType.ALL, orphanRemoval = true)
  @Builder.Default
  private List<StudentAnswer> answers = new ArrayList<>();

  // 편의 메서드
  public void addAnswer(StudentAnswer answer) {
    answers.add(answer);
    answer.setAttempt(this);
  }

  // 비즈니스 로직 (67번째 줄)
  public void complete() {
    this.completedAt = LocalDateTime.now();
    this.score = (int) answers.stream()
        .filter(StudentAnswer::getIsCorrect)
        .count();
    this.totalQuestions = answers.size();
  }
}