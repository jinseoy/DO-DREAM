package A704.DODREAM.report.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 학습 진행률 업데이트 응답
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateProgressResponse {
    
    /** 학생 ID */
    private Long studentId;
    
    /** 교재 ID */
    private Long materialId;
    
    /** 현재 페이지 */
    private Integer currentPage;
    
    /** 총 페이지 */
    private Integer totalPages;
    
    /** 진행률 (%) */
    private Integer progressPercentage;
    
    /** 완료 여부 */
    private boolean isCompleted;
    
    /** 업데이트 시간 */
    private LocalDateTime lastAccessedAt;
    
    /** 완료 시간 (완료한 경우에만) */
    private LocalDateTime completedAt;
    
    /** 메시지 */
    private String message;
}


