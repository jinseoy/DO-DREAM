package A704.DODREAM.domain.progress;

import A704.DODREAM.domain.material.entity.Material;
import A704.DODREAM.domain.user.User;
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
import jakarta.persistence.UniqueConstraint;
import lombok.*;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import java.time.LocalDateTime;

@Entity
@Table(name = "student_material_progress",
    indexes = {
        @Index(name = "idx_student", columnList = "student_id")
    },
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_progress", columnNames = {"student_id", "material_id"})  // 22번째 줄
    }
)
@EntityListeners(AuditingEntityListener.class)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class StudentMaterialProgress {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "progress_id")
  private Long progressId;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "student_id", nullable = false)
  private User student;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "material_id", nullable = false)
  private Material material;

  @Column(name = "current_page")
  @Builder.Default
  private Integer currentPage = 1;  // 47번째 줄: 현재 읽는 페이지

  @Column(name = "total_pages")
  private Integer totalPages;

  @Column(name = "progress_percentage")
  @Builder.Default
  private Integer progressPercentage = 0;  // 0~100

  @LastModifiedDate
  @Column(name = "last_accessed_at")
  private LocalDateTime lastAccessedAt;

  @Column(name = "completed_at")
  private LocalDateTime completedAt;

  public void updateProgress(int page) {
    this.currentPage = page;
    if (this.totalPages != null && this.totalPages > 0) {
      this.progressPercentage = (int) ((page * 100.0) / totalPages);

      if (page >= totalPages) {
        this.completedAt = LocalDateTime.now();
      }
    }
  }
}