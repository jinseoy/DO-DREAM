package A704.DODREAM.report.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 학습 진행률 업데이트 요청
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MaterialProgressRequest {
    
    /** 교재 ID */
    private Long materialId;
    
    /** 챕터 ID */
    private String chapterId;
    
    /** 현재 섹션 인덱스 */
    private Integer currentSectionIndex;
    
    /** 챕터 완료 여부 */
    private Boolean isChapterCompleted;
}


