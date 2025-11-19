package A704.DODREAM.report.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 학생의 평균 학습 진행률 응답
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AverageProgressResponse {
    
    /** 학생 ID */
    private Long studentId;
    
    /** 학생 이름 */
    private String studentName;
    
    /** 총 교재 수 */
    private int totalMaterials;
    
    /** 평균 진행률 (%) */
    private double averageProgressPercentage;
    
    /** 완료한 교재 수 */
    private int completedMaterials;
    
    /** 학습 중인 교재 수 */
    private int inProgressMaterials;
    
    /** 시작하지 않은 교재 수 */
    private int notStartedMaterials;
}

