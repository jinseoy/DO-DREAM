package A704.DODREAM.bookmark.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@AllArgsConstructor
@Builder
public class BookmarkResponse {
    private Long bookmarkId;
    private boolean isBookmarked;
    private String message;
}