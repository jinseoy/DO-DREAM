package A704.DODREAM.report.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 챕터별 진행률 정보
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChapterProgressDto {
    
    /** 챕터 ID */
    private String chapterId;
    
    /** 챕터 제목 */
    private String chapterTitle;
    
    /** 챕터 타입 (content, quiz) */
    private String chapterType;
    
    /** 챕터 번호 (순서) */
    private int chapterNumber;
    
    /** 챕터 내 총 섹션 수 */
    private int totalSections;
    
    /** 완료된 섹션 수 */
    private int completedSections;
    
    /** 챕터 진행률 (%) */
    private double progressPercentage;
    
    /** 챕터 완료 여부 */
    private boolean isCompleted;
}


