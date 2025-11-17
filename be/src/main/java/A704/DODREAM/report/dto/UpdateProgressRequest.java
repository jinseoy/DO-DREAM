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
public class UpdateProgressRequest {
    
    /** 교재 ID */
    private Long materialId;
    
    /** 현재 페이지 (섹션 번호) */
    private Integer currentPage;
    
    /** 총 페이지 수 (optional - 자동 계산 가능) */
    private Integer totalPages;
}


