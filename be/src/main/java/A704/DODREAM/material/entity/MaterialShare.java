package A704.DODREAM.material.entity;

import A704.DODREAM.material.enums.ShareType;
import A704.DODREAM.user.entity.User;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import java.time.LocalDateTime;

@Entity
@Table(name = "material_shares",
    indexes = {
        @Index(name = "idx_student", columnList = "student_id"),
        @Index(name = "idx_material", columnList = "material_id")
    },
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_share", columnNames = {"material_id", "student_id"})
    }
)
@EntityListeners(AuditingEntityListener.class)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class MaterialShare {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "material_id", nullable = false)
  private Material material;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "teacher_id", nullable = false)
  private User teacher;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "student_id", nullable = false)
  private User student;

  @Enumerated(EnumType.STRING)
  @JoinColumn(name = "share_type", nullable = false)
  @Builder.Default
  private ShareType shareType = ShareType.INDIVIDUAL;

  @Column(name = "shared_grade")
  private Integer sharedGrade;

  @Column(name = "shared_class")
  private Integer sharedClass;

  @Column(name = "shared_year")
  private Integer sharedYear;

  @CreatedDate
  @Column(name = "shared_at", updatable = false)
  private LocalDateTime sharedAt;

  @Column(name = "accessed_at")
  private LocalDateTime accessedAt;
}