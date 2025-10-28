package A704.DODREAM.domain.material.entity;

import A704.DODREAM.domain.material.enums.ContentType;
import A704.DODREAM.domain.material.enums.ProcessingStatus;
import A704.DODREAM.domain.user.User;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "material", indexes = {
    @Index(name = "idx_teacher", columnList = "teacher_id"),
    @Index(name = "idx_status", columnList = "processing_status")
})
@EntityListeners(AuditingEntityListener.class)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class Material {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "material_id")
  private Long materialId;

  @ManyToOne(fetch = FetchType.LAZY)  // 36번째 줄: 지연 로딩
  @JoinColumn(name = "teacher_id", nullable = true)  // 테스트를 위해 nullable 허용
  private User teacher;

  @Column(nullable = false, length = 200)
  private String title;

  @Column(name = "original_file_name", nullable = false, length = 255)
  private String originalFileName;

  @Column(name = "file_url", nullable = false, length = 500)
  private String fileUrl;  // 46번째 줄: S3 URL

  @Column(name = "file_size")
  private Long fileSize;  // bytes

  @Column(length = 50)
  private String subject;  // 국어, 영어, 사회 등

  @Column(name = "grade_level", length = 20)
  private String gradeLevel;  // 초등/중등/고등/성인

  @Enumerated(EnumType.STRING)
  @Column(name = "content_type", length = 20)
  @Builder.Default  // 58번째 줄: Builder 사용 시 기본값 설정
  private ContentType contentType = ContentType.TEXT;

  @Enumerated(EnumType.STRING)
  @Column(name = "processing_status", nullable = false, length = 20)
  @Builder.Default
  private ProcessingStatus processingStatus = ProcessingStatus.PENDING;

  @CreatedDate
  @Column(name = "created_at", updatable = false)
  private LocalDateTime createdAt;

  @LastModifiedDate  // 70번째 줄: 수정 시간 자동 갱신
  @Column(name = "updated_at")
  private LocalDateTime updatedAt;

  // 양방향 관계 설정 (74번째 줄)
  @OneToMany(mappedBy = "material", cascade = CascadeType.ALL, orphanRemoval = true)
  @Builder.Default
  private List<MaterialContent> contents = new ArrayList<>();

  @OneToMany(mappedBy = "material", cascade = CascadeType.ALL, orphanRemoval = true)
  @Builder.Default
  private List<MaterialSummary> summaries = new ArrayList<>();



  public void addSummary(MaterialSummary summary) {
    summaries.add(summary);
    summary.setMaterial(this);
  }
}