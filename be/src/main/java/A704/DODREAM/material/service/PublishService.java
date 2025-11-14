package A704.DODREAM.material.service;

import A704.DODREAM.material.dto.PublishRequest;
import A704.DODREAM.material.dto.PublishResponseDto;
import A704.DODREAM.file.entity.UploadedFile;
import A704.DODREAM.file.repository.UploadedFileRepository;
import A704.DODREAM.global.exception.CustomException;
import A704.DODREAM.global.exception.constant.ErrorCode;
import A704.DODREAM.material.dto.PublishedMaterialListResponse;
import A704.DODREAM.material.entity.Material;
import A704.DODREAM.material.repository.MaterialRepository;
import A704.DODREAM.user.entity.User;
import A704.DODREAM.user.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.*;

@Service
@Slf4j
@RequiredArgsConstructor
public class PublishService {

    private final UserRepository userRepository;
    private final MaterialRepository materialRepository;
    private final UploadedFileRepository uploadedFileRepository;
    private final S3Client s3Client;
    private final ObjectMapper objectMapper;

    @Value("${aws.s3.bucket}")
    private String bucketName;

    @Transactional
    public PublishResponseDto publishJsonWithIds(Long pdfId, Long userId, PublishRequest publishRequest) {

        User teacher = userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        UploadedFile uploadedFile;

        try {
            uploadedFile = uploadedFileRepository.findById(pdfId)
                    .orElseThrow(() -> new CustomException(ErrorCode.FILE_NOT_FOUND));

            if (!uploadedFile.getUploaderId().equals(userId)) {
                throw new CustomException(ErrorCode.FORBIDDEN);
            }

            if (uploadedFile.getJsonS3Key() == null) {
                throw new CustomException(ErrorCode.FILE_PARSING_FAILED);
            }

            addIds(publishRequest.getEditedJson());

            String jsonString = objectMapper.writerWithDefaultPrettyPrinter()
                    .writeValueAsString(publishRequest.getEditedJson());

            PutObjectRequest putRequest = PutObjectRequest.builder()
                    .bucket(bucketName)
                    .key(uploadedFile.getJsonS3Key())
                    .contentType("application/json")
                    .metadata(Map.of(
                            "original-pdf", uploadedFile.getS3Key(),
                            "parsed-at", uploadedFile.getParsedAt() != null
                                    ? uploadedFile.getParsedAt().toString() : "",
                            "published-at", LocalDateTime.now().toString(),
                            "owner", userId.toString()
                    ))
                    .build();

            s3Client.putObject(
                    putRequest,
                    RequestBody.fromString(jsonString, StandardCharsets.UTF_8)
            );

            Optional<Material> materialOpt = materialRepository.findByUploadedFileId(uploadedFile.getId());

            Material material;
            if(materialOpt.isPresent()){
                material = materialOpt.get();
                material.setTitle(publishRequest.getMaterialTitle());
                material.setLabel(publishRequest.getLabelColor());
                material.setUpdatedAt(LocalDateTime.now());
            } else {
                material = Material.builder()
                        .uploadedFile(uploadedFile)
                        .teacher(teacher)
                        .title(publishRequest.getMaterialTitle())
                        .label(publishRequest.getLabelColor())
                        .build();
            }

            materialRepository.save(material);

        } catch (Exception e) {
            log.error("JSON 발행 실패: pdfId={}, error={}", pdfId, e.getMessage(), e);
            throw new RuntimeException("JSON 발행 실패: " + e.getMessage());
        }

        return PublishResponseDto.builder()
                .success(true)
                .pdfId(pdfId)
                .filename(uploadedFile.getOriginalFileName())
                .jsonS3Key(uploadedFile.getJsonS3Key())
                .publishedAt(LocalDateTime.now())
                .message("문서가 성공적으로 발행되었습니다.")
                .build();
    }

    private void addIds(Map<String, Object> jsonData) {
        Map<String, Object> parsedData = (Map<String, Object>) jsonData.get("parsedData");
        if(parsedData == null){
            return;
        }

        List<Map<String, Object>> dataList = (List<Map<String, Object>>) parsedData.get("data");
        if(dataList == null || dataList.isEmpty()) {
            return;
        }

        for(Map<String, Object> content : dataList) {
            List<Map<String, Object>> titles = (List<Map<String, Object>>) content.get("titles");

            if(titles != null){
                for(int i = 0; i < titles.size(); i++){
                    Map<String, Object> title = titles.get(i);
                    titles.set(i, addIdToTop(title));

                    List<Map<String, Object>> sTitles = (List<Map<String, Object>>) title.get("s_titles");
                    if(sTitles != null){
                        for(int j = 0; j < sTitles.size(); j++){
                            Map<String, Object> sTitle = sTitles.get(j);
                            sTitles.set(j, addIdToTop(sTitle));

                            List<Map<String, Object>> ssTitles = (List<Map<String, Object>>) sTitle.get("ss_titles");
                            if(ssTitles != null){
                                for(int k = 0; k < ssTitles.size(); k++){
                                    Map<String, Object> ssTitle = ssTitles.get(k);
                                    ssTitles.set(k, addIdToTop(ssTitle));
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    private Map<String, Object> addIdToTop(Map<String, Object> map) {
        if(map.containsKey("id") && map.get("id") != null) {
            return map;
        }
        // LinkedHashMap으로 새로운 맵 생성 (순서 보장)
        Map<String, Object> newMap = new LinkedHashMap<>();

        // id를 가장 먼저 추가
        newMap.put("id", UUID.randomUUID().toString());

        // 나머지 기존 데이터 추가
        newMap.putAll(map);

        return newMap;
    }

    public PublishedMaterialListResponse getPublishedMaterialList(Long userId) {

        User teacher = userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));


        List<Material> materials = materialRepository.findAllByTeacherIdWithUploadedFile(teacher.getId());

        return PublishedMaterialListResponse.from(materials);
    }
}
