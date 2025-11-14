package A704.DODREAM.bookmark.dto;

import A704.DODREAM.bookmark.entity.Bookmark;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
@AllArgsConstructor
public class BookmarkResponse {
    private Long id;
    private Long materialId;
    private String titleId;
    private String stitleId;
    private boolean bookmarked;
    private LocalDateTime createdAt;

    public static BookmarkResponse from(Bookmark bookmark, boolean bookmarked){
        return BookmarkResponse.builder()
                .id(bookmark.getId())
                .materialId(bookmark.getMaterial().getId())
                .titleId(bookmark.getTitleId())
                .stitleId(bookmark.getSTitleId())
                .bookmarked(bookmarked)
                .createdAt(bookmark.getCreatedAt())
                .build();
    }
}
