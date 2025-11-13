package A704.DODREAM.file.entity;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "uploaded_files")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class UploadedFile {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(nullable = false)
	private String originalFileName;

	// For local file storage
	private String storedFileName;

	private String filePath;

	private Long fileSize;

	private String fileType;

	// For S3 storage
	private String s3Key;

	private String s3Bucket;

	private String contentType;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false)
	@Builder.Default
	private OcrStatus ocrStatus = OcrStatus.PENDING;

	private String errorMessage;

	@Column(nullable = false)
	private Long uploaderId; // 업로드한 선생님 ID

	@OneToMany(mappedBy = "uploadedFile", cascade = CascadeType.ALL, orphanRemoval = true)
	@Builder.Default
	private List<OcrPage> ocrPages = new ArrayList<>();

	@Column(nullable = false, updatable = false)
	private LocalDateTime createdAt;

	private LocalDateTime updatedAt;

	private LocalDateTime completedAt;

	// PDF 파싱 관련 필드 (PdfService용)
	private String jsonS3Key; // 파싱된 JSON의 S3 경로

	private LocalDateTime parsedAt; // 파싱 완료 시각

	@Column(columnDefinition = "TEXT")
	private String indexes; // 목차 (검색용)

	private String conceptCheckJsonS3Key; // 개념 Check JSON의 S3 경로

	// 비즈니스 메서드
	public void updateOcrStatus(OcrStatus status) {
		this.ocrStatus = status;
		this.updatedAt = LocalDateTime.now();
		if (status == OcrStatus.COMPLETED) {
			this.completedAt = LocalDateTime.now();
		}
	}

	public void setError(String errorMessage) {
		this.ocrStatus = OcrStatus.FAILED;
		this.errorMessage = errorMessage;
		this.updatedAt = LocalDateTime.now();
	}

	public void addOcrPage(OcrPage page) {
		this.ocrPages.add(page);
		page.setUploadedFile(this);
	}

	// PDF 파싱 관련 setter
	public void setJsonS3Key(String jsonS3Key) {
		this.jsonS3Key = jsonS3Key;
	}

	public void setParsedAt(LocalDateTime parsedAt) {
		this.parsedAt = parsedAt;
	}

	public void setIndexes(String indexes) {
		this.indexes = indexes;
	}

	public void setConceptCheckJsonS3Key(String conceptCheckJsonS3Key) {
		this.conceptCheckJsonS3Key = conceptCheckJsonS3Key;
	}

	@PrePersist
	protected void onCreate() {
		this.createdAt = LocalDateTime.now();
		this.updatedAt = LocalDateTime.now();
	}

	@PreUpdate
	protected void onUpdate() {
		this.updatedAt = LocalDateTime.now();
	}
}