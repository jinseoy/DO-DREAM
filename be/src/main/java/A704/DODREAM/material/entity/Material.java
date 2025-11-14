package A704.DODREAM.material.entity;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import A704.DODREAM.material.enums.ContentType;
import A704.DODREAM.material.enums.LabelColor;
import A704.DODREAM.material.enums.ProcessingStatus;
import A704.DODREAM.user.entity.User;
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

@Entity
@Table(name = "materials", indexes = {
	@Index(name = "idx_teacher", columnList = "teacher_id"),
	@Index(name = "idx_status", columnList = "processing_status")
})
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class Material {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "teacher_id", nullable = false)
	private User teacher;

	@Column(nullable = false, length = 200)
	private String title;

	@Column(name = "original_file_name", nullable = false, length = 255)
	private String originalFileName;

	@Column(name = "file_url", nullable = false, length = 500)
	private String fileUrl;

    @Column(name = "json_s3_key")
    private String jsonS3Key;

	@Column(name = "file_size")
	private Long fileSize;

	@Column(length = 50)
	private String subject;

	@Column(name = "grade_level", length = 20)
	private String gradeLevel;

//	@Enumerated(EnumType.STRING)
//	@Column(name = "content_type", length = 20)
//	@Builder.Default
//	private ContentType contentType = ContentType.TEXT;
//
//	@Enumerated(EnumType.STRING)
//	@Column(name = "processing_status", nullable = false, length = 20)
//	@Builder.Default
//	private ProcessingStatus processingStatus = ProcessingStatus.PENDING;

	@Enumerated(EnumType.STRING)
	@Column(length = 20)
	private LabelColor label;

	@CreatedDate
	@Column(name = "created_at", updatable = false)
	private LocalDateTime createdAt;

	@LastModifiedDate
	@Column(name = "updated_at")
	private LocalDateTime updatedAt;

//	@OneToMany(mappedBy = "material", cascade = CascadeType.ALL, orphanRemoval = true)
//	@Builder.Default
//	private List<MaterialContent> contents = new ArrayList<>();

	@OneToMany(mappedBy = "material", cascade = CascadeType.ALL, orphanRemoval = true)
	@Builder.Default
	private List<MaterialSummary> summaries = new ArrayList<>();
}