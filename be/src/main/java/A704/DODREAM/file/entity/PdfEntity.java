package A704.DODREAM.file.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;

@Getter
@Entity
@Setter
@Table(name = "pdfs")
public class PdfEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  private String owner;  // 사용자 ID

  private String filename;  // abc123.pdf

  @Column(name = "s3_key")
  private String s3Key;  // pdfs/user123/2024/01/abc123.pdf

  @Column(name = "json_s3_key")
  private String jsonS3Key;  // parsed-json/user123/2024/01/abc123.json (새로 추가)

  @Column(name = "parsed_at")
  private LocalDateTime parsedAt;

  private String status;  // UPLOADED, PARSING, PARSED, ERROR

  @Column(columnDefinition = "TEXT")
  private String indexes;  // 목차만 DB에 저장 (검색용)

  @Column(name = "created_at")
  private LocalDateTime createdAt;
}