package A704.DODREAM.material.controller;

import A704.DODREAM.auth.dto.request.UserPrincipal;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import A704.DODREAM.material.dto.MaterialShareListResponse;
import A704.DODREAM.material.dto.MaterialShareRequest;
import A704.DODREAM.material.dto.MaterialShareResponse;
import A704.DODREAM.material.service.MaterialShareService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.annotation.AuthenticationPrincipal;

import java.util.Map;

@Tag(name = "Material Share", description = "학습 자료 공유 API")
@Slf4j
@RestController
@RequestMapping("/api/materials")
@RequiredArgsConstructor
public class MaterialShareController {

	private final MaterialShareService materialShareService;

    @Operation(
            summary = "학습 자료 공유 + 푸시 알림",
            description = "선생님이 학생들에게 학습 자료를 공유하면 학생의 등록된 디바이스로 푸시 알림이 전송됩니다.\n\n" +
                    "additionalProp에는 classroomId를 넣어주세요"
    )
    @PostMapping("/share")
    public ResponseEntity<MaterialShareResponse> shareMaterial(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @RequestBody MaterialShareRequest request){
        Long teacherId = userPrincipal.userId();
        MaterialShareResponse response = materialShareService.shareMaterial(request, teacherId);
        return ResponseEntity.ok(response);
    }

    @Operation(
            summary = "공유받은 자료 목록 조회 (학생/앱)",
            description = "특정 학생이 공유받은 모든 학습 자료를 최신순으로 조회합니다."
    )
    @GetMapping("/shared")
    public ResponseEntity<MaterialShareListResponse> getSharedMaterialByStudent(
            @AuthenticationPrincipal UserPrincipal userPrincipal
    ){
        Long studentId = userPrincipal.userId();
        MaterialShareListResponse response = materialShareService.getSharedMaterialByStudent(studentId);
        return ResponseEntity.ok(response);
    }

    @Operation(
            summary = "내가 특정 학생에게 공유한 자료 목록 조회 (선생님/웹)",
            description = "특정 학생이 특정 선생님으로부터 공유받은 학습 자료를 최신순으로 조회합니다."
    )
    @GetMapping("/shared/student/{studentId}")
    public ResponseEntity<MaterialShareListResponse> getSharedMaterialsByStudent(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @PathVariable Long studentId
    )
    {
        Long teacherId = userPrincipal.userId();

        MaterialShareListResponse response = materialShareService
                .getSharedMaterialByStudentAndTeacher(studentId, teacherId);
        return ResponseEntity.ok(response);
    }

    @Operation( summary = "공유된 자료 반별 조회")
    @GetMapping("/shared/class/{classId}")
    public ResponseEntity<MaterialShareListResponse> getSharedMaterialsByClass(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @PathVariable Long classId
    ){
        Long teacherId = userPrincipal.userId();

        MaterialShareListResponse response = materialShareService
                .getSharedMaterialByClass(classId, teacherId);
		return ResponseEntity.ok(response);
	}

    @Operation(
            summary = "공유받은 자료 JSON 조회 (학생/앱)",
            description = "공유받은 학습 자료의 JSON 데이터를 조회합니다."
    )
    @GetMapping("/shared/{materialId}/json")
    public ResponseEntity<Map<String, Object>> getSharedMaterialJson(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @PathVariable Long materialId
    ) {
        Long studentId = userPrincipal.userId();
        Map<String, Object> jsonData = materialShareService.getSharedMaterialJson(studentId, materialId);
        return ResponseEntity.ok(jsonData);
    }
}
