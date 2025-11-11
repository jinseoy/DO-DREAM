package A704.DODREAM.file.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DownloadUrlResponse {
	private String downloadUrl;
	private Long expiresIn; // seconds
	private String fileName;
	private Long fileId;
}