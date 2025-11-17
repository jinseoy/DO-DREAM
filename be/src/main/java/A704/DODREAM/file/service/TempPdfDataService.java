package A704.DODREAM.file.service;

import A704.DODREAM.file.entity.UploadedFile;
import A704.DODREAM.file.enums.PostStatus;
import A704.DODREAM.file.repository.UploadedFileRepository;
import A704.DODREAM.global.exception.CustomException;
import A704.DODREAM.global.exception.constant.ErrorCode;
import A704.DODREAM.material.dto.PublishRequest;
import A704.DODREAM.material.entity.Material;
import A704.DODREAM.material.repository.MaterialRepository;
import A704.DODREAM.user.entity.User;
import A704.DODREAM.user.repository.UserRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class TempPdfDataService {

    private final UserRepository userRepository;
    private final UploadedFileRepository uploadedFileRepository;
    private final MaterialRepository materialRepository;

  private final StringRedisTemplate redis;
  private final ObjectMapper objectMapper;

  private static final Duration TTL = Duration.ofHours(24); // 24시간 보관

  /**
   * Redis 키 생성: temp-pdf:{pdfId}:{userId}
   */
  private String key(Long pdfId, Long userId) {
    return "temp-pdf:%d:%d".formatted(pdfId, userId);
  }

  /**
   * 임시 저장 데이터를 Redis에 저장
   * @param pdfId PDF ID
   * @param userId 사용자 ID
   */
  public void save(Long pdfId, Long userId, PublishRequest request) {
    try {
        User teacher = userRepository.findById(userId)
                .orElseThrow(()-> new CustomException(ErrorCode.USER_NOT_FOUND));

        UploadedFile uploadedFile = uploadedFileRepository.findById(pdfId)
                .orElseThrow(() -> new CustomException(ErrorCode.FILE_NOT_FOUND));

        Optional<Material> materialOpt = materialRepository.findByUploadedFileId(uploadedFile.getId());

         Material material;
        if(materialOpt.isPresent()){
            material = materialOpt.get();
            material.setTitle(request.getMaterialTitle());
            material.setLabel(request.getLabelColor());
            material.setUpdatedAt(LocalDateTime.now());
            material.setPostStatus(PostStatus.DRAFT);
        } else {
            material = Material.builder()
                    .uploadedFile(uploadedFile)
                    .teacher(teacher)
                    .title(request.getMaterialTitle())
                    .label(request.getLabelColor())
                    .postStatus(PostStatus.DRAFT)
                    .build();
        }

        materialRepository.save(material);
      String jsonString = objectMapper.writeValueAsString(request.getEditedJson());
      redis.opsForValue().set(key(pdfId, userId), jsonString, TTL);
      log.info("임시 저장 완료: pdfId={}, userId={}", pdfId, userId);
    } catch (JsonProcessingException e) {
      log.error("임시 저장 실패: pdfId={}, userId={}, error={}", pdfId, userId, e.getMessage());
      throw new RuntimeException("임시 저장 중 JSON 변환 실패: " + e.getMessage());
    }
  }

  /**
   * Redis에서 임시 저장 데이터 조회
   * @param pdfId PDF ID
   * @param userId 사용자 ID
   * @return 임시 저장된 JSON 데이터 (없으면 null)
   */
  public Map<String, Object> get(Long pdfId, Long userId) {
    try {
      String jsonString = redis.opsForValue().get(key(pdfId, userId));
      if (jsonString == null) {
        log.info("임시 저장 데이터 없음: pdfId={}, userId={}", pdfId, userId);
        return null;
      }
      log.info("임시 저장 데이터 조회: pdfId={}, userId={}", pdfId, userId);
      return objectMapper.readValue(jsonString, Map.class);
    } catch (JsonProcessingException e) {
      log.error("임시 저장 데이터 조회 실패: pdfId={}, userId={}, error={}", pdfId, userId, e.getMessage());
      throw new RuntimeException("임시 저장 데이터 읽기 실패: " + e.getMessage());
    }
  }

  /**
   * Redis에서 임시 저장 데이터 삭제
   * @param pdfId PDF ID
   * @param userId 사용자 ID
   */
  public void delete(Long pdfId, Long userId) {
    Boolean deleted = redis.delete(key(pdfId, userId));
    if (Boolean.TRUE.equals(deleted)) {
      log.info("임시 저장 데이터 삭제 완료: pdfId={}, userId={}", pdfId, userId);
    } else {
      log.warn("임시 저장 데이터 삭제 실패 (데이터 없음): pdfId={}, userId={}", pdfId, userId);
    }
  }

  /**
   * 임시 저장 데이터 존재 여부 확인
   * @param pdfId PDF ID
   * @param userId 사용자 ID
   * @return 존재 여부
   */
  public boolean exists(Long pdfId, Long userId) {
    Boolean exists = redis.hasKey(key(pdfId, userId));
    return Boolean.TRUE.equals(exists);
  }
}
