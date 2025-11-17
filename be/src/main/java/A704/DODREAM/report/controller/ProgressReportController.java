package A704.DODREAM.report.controller;

import A704.DODREAM.auth.dto.request.UserPrincipal;
import A704.DODREAM.global.response.ApiResponse;
import A704.DODREAM.report.dto.ProgressReportResponse;
import A704.DODREAM.report.dto.UpdateProgressRequest;
import A704.DODREAM.report.dto.UpdateProgressResponse;
import A704.DODREAM.report.service.ProgressReportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 학습 진행률 리포트 API
 * Chapter와 Section 기반 진행률 제공
 */
@Tag(name = "Progress Report", description = "학습 진행률 리포트 API")
@Slf4j
@RestController
@RequestMapping("/api/progress")
@RequiredArgsConstructor
public class ProgressReportController {

    private final ProgressReportService progressReportService;

    @Operation(
            summary = "특정 교재의 학습 진행률 조회 (학생/앱)",
            description = "학생이 특정 교재에 대한 상세 진행률을 조회합니다.\n" +
                    "- 전체 진행률 (챕터별, 섹션별)\n" +
                    "- 현재 학습 중인 챕터\n" +
                    "- 챕터별 상세 진행률"
    )
    @GetMapping("/materials/{materialId}")
    public ResponseEntity<ApiResponse<ProgressReportResponse>> getProgressReport(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @PathVariable Long materialId
    ) {
        Long studentId = userPrincipal.userId();
        log.info("진행률 조회 요청: studentId={}, materialId={}", studentId, materialId);

        ProgressReportResponse response = progressReportService.getProgressReport(studentId, materialId);
        
        return ResponseEntity.ok(
                ApiResponse.success("진행률 조회 성공", HttpStatus.OK, response)
        );
    }

    @Operation(
            summary = "모든 교재의 학습 진행률 조회 (학생/앱)",
            description = "학생이 공유받은 모든 교재의 진행률을 조회합니다."
    )
    @GetMapping("/all")
    public ResponseEntity<ApiResponse<List<ProgressReportResponse>>> getAllProgressReports(
            @AuthenticationPrincipal UserPrincipal userPrincipal
    ) {
        Long studentId = userPrincipal.userId();
        log.info("전체 진행률 조회 요청: studentId={}", studentId);

        List<ProgressReportResponse> responses = progressReportService.getAllProgressReports(studentId);
        
        return ResponseEntity.ok(
                ApiResponse.success(
                        String.format("%d개 교재의 진행률 조회 성공", responses.size()),
                        HttpStatus.OK,
                        responses)
        );
    }

    @Operation(
            summary = "특정 학생의 특정 교재 진행률 조회 (선생님/웹)",
            description = "선생님이 특정 학생의 특정 교재 학습 진행률을 조회합니다."
    )
    @GetMapping("/students/{studentId}/materials/{materialId}")
    public ResponseEntity<ApiResponse<ProgressReportResponse>> getStudentProgressReport(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @PathVariable Long studentId,
            @PathVariable Long materialId
    ) {
        Long teacherId = userPrincipal.userId();
        log.info("학생 진행률 조회 요청: teacherId={}, studentId={}, materialId={}", 
                teacherId, studentId, materialId);

        // 선생님이 해당 자료를 공유했는지는 서비스 레이어에서 검증
        ProgressReportResponse response = progressReportService.getProgressReport(studentId, materialId);
        
        return ResponseEntity.ok(
                ApiResponse.success("학생 진행률 조회 성공", HttpStatus.OK, response)
        );
    }

    @Operation(
            summary = "특정 학생의 모든 교재 진행률 조회 (선생님/웹)",
            description = "선생님이 특정 학생의 모든 학습 진행률을 조회합니다."
    )
    @GetMapping("/students/{studentId}/all")
    public ResponseEntity<ApiResponse<List<ProgressReportResponse>>> getAllStudentProgressReports(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @PathVariable Long studentId
    ) {
        Long teacherId = userPrincipal.userId();
        log.info("학생 전체 진행률 조회 요청: teacherId={}, studentId={}", teacherId, studentId);

        List<ProgressReportResponse> responses = progressReportService.getAllProgressReports(studentId);
        
        return ResponseEntity.ok(
                ApiResponse.success(
                        String.format("학생의 %d개 교재 진행률 조회 성공", responses.size()),
                        HttpStatus.OK,
                        responses)
        );
    }

    @Operation(
            summary = "학습 진행률 업데이트 (학생/앱)",
            description = "학생이 학습을 진행하면서 현재 위치를 업데이트합니다.\n" +
                    "- currentPage: 현재 섹션 번호 (1부터 시작)\n" +
                    "- totalPages: 전체 섹션 수 (optional, 서버에서 자동 계산 가능)\n" +
                    "- 완료 시 자동으로 completedAt이 설정됩니다."
    )
    @PostMapping("/update")
    public ResponseEntity<ApiResponse<UpdateProgressResponse>> updateProgress(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @RequestBody UpdateProgressRequest request
    ) {
        Long studentId = userPrincipal.userId();
        log.info("진행률 업데이트 요청: studentId={}, materialId={}, currentPage={}", 
                studentId, request.getMaterialId(), request.getCurrentPage());

        UpdateProgressResponse response = progressReportService.updateProgress(
                studentId,
                request.getMaterialId(),
                request.getCurrentPage(),
                request.getTotalPages()
        );
        
        return ResponseEntity.ok(
                ApiResponse.success(response.getMessage(), HttpStatus.OK, response)
        );
    }
}

