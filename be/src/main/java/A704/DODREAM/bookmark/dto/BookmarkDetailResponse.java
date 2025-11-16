package A704.DODREAM.bookmark.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@AllArgsConstructor
public class BookmarkDetailResponse {
    private Long bookmarkId;
    private Long materialId;
    private String materialTitle;
    private String titleId;
    private String title;
    private String contents;
    private LocalDateTime createdAt;
}