package A704.DODREAM.file.service;

import A704.DODREAM.file.dto.PresignedUrlRequest;
import A704.DODREAM.file.dto.PresignedUrlResponse;
import A704.DODREAM.file.entity.OcrStatus;
import A704.DODREAM.file.entity.UploadedFile;
import A704.DODREAM.file.repository.UploadedFileRepository;
import java.time.Duration;
import java.util.UUID;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

@Slf4j
@Service
@RequiredArgsConstructor
public class S3Service {

  private final S3Presigner s3Presigner;
  private final UploadedFileRepository uploadedFileRepository;

  @Value("${aws.s3.bucket}")
  private String bucketName;

  @Value("${aws.s3.upload-prefix}")
  private String uploadPrefix;

  @Value("${aws.s3.presign-exp-minutes}")
  private long presignExpMinutes;

  @Transactional
  public PresignedUrlResponse generatePresignedUrl(PresignedUrlRequest request) {
    // Generate unique S3 key
    String s3Key = generateS3Key(request.getFileName());

    // Create file record in DB with PENDING status
    UploadedFile uploadedFile = UploadedFile.builder()
        .originalFileName(request.getFileName())
        .s3Key(s3Key)
        .s3Bucket(bucketName)
        .contentType(request.getContentType())
        .ocrStatus(OcrStatus.PENDING)
        .uploaderId(1L) // TODO: Get from authentication context
        .build();

    UploadedFile savedFile = uploadedFileRepository.save(uploadedFile);

    // Generate presigned URL
    PutObjectRequest putObjectRequest = PutObjectRequest.builder()
        .bucket(bucketName)
        .key(s3Key)
        .contentType(request.getContentType())
        .contentDisposition("attachment; filename=\"" + request.getFileName() + "\"")
        .build();

    PutObjectPresignRequest presignRequest = PutObjectPresignRequest.builder()
        .signatureDuration(Duration.ofMinutes(presignExpMinutes))
        .putObjectRequest(putObjectRequest)
        .build();

    PresignedPutObjectRequest presignedRequest = s3Presigner.presignPutObject(presignRequest);

    log.info("Generated presigned URL for file: {} with key: {}", request.getFileName(), s3Key);

    return PresignedUrlResponse.builder()
        .presignedUrl(presignedRequest.url().toString())
        .s3Key(s3Key)
        .fileId(savedFile.getId().toString())
        .expiresIn(presignExpMinutes * 60)
        .build();
  }

  private String generateS3Key(String originalFileName) {
    String uuid = UUID.randomUUID().toString();
    String extension = "";

    int lastDotIndex = originalFileName.lastIndexOf('.');
    if (lastDotIndex > 0) {
      extension = originalFileName.substring(lastDotIndex);
    }

    return uploadPrefix + "/" + uuid + extension;
  }
}