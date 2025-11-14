package A704.DODREAM.material.controller;

import A704.DODREAM.auth.dto.request.UserPrincipal;
import A704.DODREAM.material.dto.PublishRequest;
import A704.DODREAM.material.dto.PublishResponseDto;
import A704.DODREAM.material.service.PublishService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@Tag(name = "Publishing API", description = "자료 발행 API")
@RestController
@RequestMapping("/api/documents")
@RequiredArgsConstructor
@Slf4j
public class PublishController {

    private final PublishService publishService;

    @Operation(summary = "자료 발행하기", description = "에디터에서 자료 수정 후 발행 버튼 클릭 시 호출해야 합니다. \n\n" +
            "기존에 있는 자료 수정 후 재발행할 때에도 사용가능합니다.")
    @PostMapping("/{pdfId}/publish")
    public ResponseEntity<PublishResponseDto> publishMaterial(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @PathVariable Long pdfId,
            @RequestBody PublishRequest publishRequest){

        Long userId = userPrincipal.userId();

        PublishResponseDto response = publishService.publishJsonWithIds(pdfId, userId, publishRequest);

        return ResponseEntity.ok(response);
    }
}
