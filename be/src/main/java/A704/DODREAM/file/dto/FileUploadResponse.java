package A704.DODREAM.file.dto;

import java.time.LocalDateTime;

import A704.DODREAM.file.entity.OcrStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FileUploadResponse {
	private Long fileId;
	private String originalFileName;
	private Long fileSize;
	private OcrStatus ocrStatus;
	private String message;
	private LocalDateTime uploadedAt;
}