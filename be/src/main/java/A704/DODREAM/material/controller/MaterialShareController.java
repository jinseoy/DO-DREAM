package A704.DODREAM.material.controller;

import A704.DODREAM.material.dto.MaterialShareListResponse;
import A704.DODREAM.material.dto.MaterialShareRequest;
import A704.DODREAM.material.dto.MaterialShareResponse;
import A704.DODREAM.material.service.MaterialShareService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Material Share", description = "학습자료 공유 API")
@Slf4j
@RestController
@RequestMapping("/api/materials")
@RequiredArgsConstructor
public class MaterialShareController {

    private final MaterialShareService materialShareService;

    @Operation(
            summary = "학습 자료 공유 + 푸시 알림",
            description = "선생님이 학생들에게 학습 자료를 공유하면 학생의 등록된 디바이스로 푸시 알림이 전송됩니다."
    )
    @PostMapping("/share")
    public ResponseEntity<MaterialShareResponse> shareMaterial(
            @RequestBody MaterialShareRequest request){
        MaterialShareResponse response = materialShareService.shareMaterial(request);
        return ResponseEntity.ok(response);
    }

    @Operation(
            summary = "학생이 공유받은 자료 목록 조회",
            description = "특정 학생이 공유받은 모든 학습 자료를 최신순으로 조회합니다."
    )
    @GetMapping("/shared/student/{studentId}")
    public ResponseEntity<MaterialShareListResponse> getSharedMaterialByStudent(
            @PathVariable Long studentId
    ){
        MaterialShareListResponse response = materialShareService.getSharedMaterialByStudent(studentId);
        return ResponseEntity.ok(response);
    }

    @Operation(
            summary = "학생이 특정 선생님으로부터 공유받은 자료 목록 조회",
            description = "특정 학생이 특정 선생님으로부터 공유받은 학습 자료를 최신순으로 조회합니다."
    )
    @GetMapping("/shared/student/{studentId}/teacher/{teacherId}")
    public ResponseEntity<MaterialShareListResponse> getSharedMaterialsByStudent(
            @PathVariable Long studentId,
            @PathVariable Long teacherId
    )
    {
        MaterialShareListResponse response = materialShareService
                .getSharedMaterialByStudentAndTeacher(studentId, teacherId);
        return ResponseEntity.ok(response);
    }
}
