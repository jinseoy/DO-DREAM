package A704.DODREAM.bookmark.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.Set;

@Getter
@AllArgsConstructor
public class MaterialBookmarksResponse {
    private Long materialId;
    private Set<String> bookmarkedTitleIds;
}