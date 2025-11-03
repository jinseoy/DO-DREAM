package A704.DODREAM.file.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

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