package A704.DODREAM.material.entity;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import A704.DODREAM.file.entity.UploadedFile;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import A704.DODREAM.material.enums.ContentType;
import A704.DODREAM.material.enums.LabelColor;
import A704.DODREAM.material.enums.ProcessingStatus;
import A704.DODREAM.user.entity.User;

@Entity
@Table(name = "materials", indexes = {
	@Index(name = "idx_teacher", columnList = "teacher_id")
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

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "uploaded_file_id", nullable = false)
    private UploadedFile uploadedFile;

	@Column(nullable = false, length = 200)
	private String title;

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