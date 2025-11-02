package A704.DODREAM.file.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PresignedUrlResponse {
    private String presignedUrl;
    private String s3Key;
    private String fileId;  // 나중에 OCR 처리 시작할 때 사용
    private Long expiresIn; // 초 단위
}