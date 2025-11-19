package A704.DODREAM.bookmark.service;

import A704.DODREAM.bookmark.dto.BookmarkDetailResponse;
import A704.DODREAM.bookmark.dto.BookmarkRequest;
import A704.DODREAM.bookmark.dto.BookmarkResponse;
import A704.DODREAM.bookmark.dto.MaterialBookmarksResponse;
import A704.DODREAM.bookmark.entity.Bookmark;
import A704.DODREAM.bookmark.repository.BookmarkRepository;
import A704.DODREAM.file.entity.UploadedFile;
import A704.DODREAM.file.repository.UploadedFileRepository;
import A704.DODREAM.file.service.PdfService;
import A704.DODREAM.global.exception.CustomException;
import A704.DODREAM.global.exception.constant.ErrorCode;
import A704.DODREAM.material.entity.Material;
import A704.DODREAM.material.repository.MaterialRepository;
import A704.DODREAM.user.entity.User;
import A704.DODREAM.user.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class BookmarkService {

    private final BookmarkRepository bookmarkRepository;
    private final MaterialRepository materialRepository;
    private final UserRepository userRepository;
    private final UploadedFileRepository uploadedFileRepository;
    private final PdfService pdfService;
    private final ObjectMapper objectMapper;
    private final S3Client s3Client;

    @Value("${aws.s3.bucket}")
    private String bucketName;

    @Transactional
    public BookmarkResponse toggleBookmark(Long userId, BookmarkRequest request){

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        Material material = materialRepository.findById(request.getMaterialId())
                .orElseThrow(() -> new CustomException(ErrorCode.MATERIAL_NOT_FOUND));

        Optional<Bookmark> existing = bookmarkRepository.findByUserAndMaterialAndTitleId(user, material, request.getTitleId());

        if(existing.isPresent()){
            bookmarkRepository.delete(existing.get());
            return BookmarkResponse.builder()
                    .bookmarkId(existing.get().getId())
                    .isBookmarked(false)
                    .build();
        }
        else {
            //S3에서 JSON 내용 가져오기
            Map<String, Object> content = getContentById(
                    material.getUploadedFile().getId(),
                    request.getTitleId()
            );

            //북마크 생성
            Bookmark bookmark = Bookmark.builder()
                    .user(user)
                    .material(material)
                    .titleId(request.getTitleId())
                    .title((String)content.get("title"))
                    .contents((String)content.get("contents"))
                    .build();

            Bookmark saved = bookmarkRepository.save(bookmark);

            return BookmarkResponse.builder()
                    .bookmarkId(saved.getId())
                    .isBookmarked(true)
                    .build();
        }

    }

    @Transactional
    public List<BookmarkDetailResponse> getBookmarks(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<Bookmark> bookmarks = bookmarkRepository.findByUserOrderByCreatedAtDesc(user);

        return bookmarks.stream()
                .map(bookmark -> new BookmarkDetailResponse(
                        bookmark.getId(),
                        bookmark.getMaterial().getId(),
                        bookmark.getMaterial().getTitle(),
                        bookmark.getTitleId(),
                        bookmark.getTitle(),
                        bookmark.getContents(),
                        bookmark.getCreatedAt()
                ))
                .collect(Collectors.toList());
    }

    public Map<String, Object> getJsonFromS3(Long pdfId) {
        UploadedFile uploadedFile = uploadedFileRepository.findById(pdfId)
                .orElseThrow(() -> new RuntimeException("PDF not found"));

        if (uploadedFile.getJsonS3Key() == null) {
            throw new RuntimeException("파싱된 JSON이 없습니다.");
        }

        try {
            GetObjectRequest getRequest = GetObjectRequest.builder()
                    .bucket(bucketName)
                    .key(uploadedFile.getJsonS3Key())
                    .build();

            ResponseInputStream<GetObjectResponse> response = s3Client.getObject(getRequest);
            String jsonString = new String(response.readAllBytes());

            return objectMapper.readValue(jsonString, Map.class);

        } catch (Exception e) {
            throw new RuntimeException("JSON 조회 실패: " + e.getMessage());
        }
    }

    private Map<String, Object> getContentById(Long pdfId, String titleId){

        Map<String, Object> fullJson = getJsonFromS3(pdfId);

        List<Map<String, Object>> chapters = (List<Map<String, Object>>) fullJson.get("chapters");

        if(chapters == null || chapters.isEmpty()) {
            throw new CustomException(ErrorCode.INVALID_JSON_STRUCTURE);
        }

        for (Map<String, Object> chapter : chapters) {
            String chapterId = String.valueOf(chapter.get("id"));

            if (titleId.equals(chapterId)) {
                String type = (String) chapter.get("type");
                String title = (String) chapter.getOrDefault("title", "");
                String contents = "";

                if("quiz".equals(type)) {
                    List<Map<String, Object>> qaList = (List<Map<String, Object>>) chapter.get("qa");
                    if(qaList != null && !qaList.isEmpty()) {
                        StringBuilder sb = new StringBuilder();
                        for(int i = 0; i < qaList.size(); i++) {
                            Map<String, Object> qa = qaList.get(i);
                            sb.append("Q").append(i+1).append(". ")
                                    .append(qa.getOrDefault("question", ""))
                                    .append("\n\n정답: ")
                                    .append(qa.getOrDefault("answer", ""))
                                    .append("\n\n---\n\n");
                        }
                        contents = sb.toString().trim();
                    }
                } else if("content".equals(type)) {
                    // content 타입
                    contents = (String) chapter.getOrDefault("content", "");
                } else {
                    // 기타 타입
                    contents = (String) chapter.getOrDefault("content", "");
                }

                return Map.of(
                        "title", title,
                        "contents", contents
                );
            }
        }

        throw new CustomException(ErrorCode.CONTENT_NOT_FOUND);
    }

    @Transactional
    public MaterialBookmarksResponse getMaterialBookmarks(Long userId, Long materialId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Material material = materialRepository.findById(materialId)
                .orElseThrow(() -> new RuntimeException("Material not found"));

        List<Bookmark> bookmarks = bookmarkRepository.findByUserAndMaterial(user, material);

        Set<String> bookmarkedSTitleIds = bookmarks.stream()
                .map(Bookmark::getTitleId)
                .collect(Collectors.toSet());

        return new MaterialBookmarksResponse(materialId, bookmarkedSTitleIds);
    }
}
