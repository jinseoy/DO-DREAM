package A704.DODREAM.material.controller;

import A704.DODREAM.auth.dto.request.UserPrincipal;
import A704.DODREAM.material.dto.PublishRequest;
import A704.DODREAM.material.dto.PublishResponseDto;
import A704.DODREAM.material.dto.PublishedMaterialListResponse;
import A704.DODREAM.material.service.PublishService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
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
		@RequestBody PublishRequest publishRequest,
		HttpServletRequest httpServletRequest // (신규) Request 주입
	){

		Long userId = userPrincipal.userId();

		// (신규) Authorization 헤더에서 "Bearer <token>" 문자열 추출
		String authorizationHeader = httpServletRequest.getHeader("Authorization");

		// (수정) 서비스 호출 시 authorizationHeader (JWT) 전달
		PublishResponseDto response = publishService.publishJsonWithIds(
			pdfId,
			userId,
			publishRequest,
			authorizationHeader
		);

		return ResponseEntity.ok(response);
	}

    @Operation(summary = "발행한 자료 목록 조회")
    @GetMapping("/published")
    public ResponseEntity<PublishedMaterialListResponse> publisedMaterialList(
            @AuthenticationPrincipal UserPrincipal userPrincipal
    ){
        Long userId = userPrincipal.userId();

        PublishedMaterialListResponse response = publishService.getPublishedMaterialList(userId);

        return ResponseEntity.ok(response);
    }
}
