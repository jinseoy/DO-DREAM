package A704.DODREAM.report.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 학생의 학습 진행률 리포트 응답
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProgressReportResponse {
    
    /** 학생 ID */
    private Long studentId;
    
    /** 학생 이름 */
    private String studentName;
    
    /** 교재 ID */
    private Long materialId;
    
    /** 교재 제목 */
    private String materialTitle;
    
    /** 전체 챕터 수 */
    private int totalChapters;
    
    /** 완료된 챕터 수 */
    private int completedChapters;
    
    /** 전체 섹션 수 */
    private int totalSections;
    
    /** 완료된 섹션 수 */
    private int completedSections;
    
    /** 전체 진행률 (%) */
    private double overallProgressPercentage;
    
    /** 현재 학습 중인 챕터 번호 */
    private Integer currentChapterNumber;
    
    /** 현재 학습 중인 챕터 제목 */
    private String currentChapterTitle;
    
    /** 마지막 학습 접근 시간 */
    private LocalDateTime lastAccessedAt;
    
    /** 완료 시간 (완료한 경우에만) */
    private LocalDateTime completedAt;
    
    /** 챕터별 상세 진행률 */
    private List<ChapterProgressDto> chapterProgress;
}

