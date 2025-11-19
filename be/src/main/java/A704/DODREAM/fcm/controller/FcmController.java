package A704.DODREAM.fcm.controller;

import A704.DODREAM.auth.dto.request.UserPrincipal;
import A704.DODREAM.fcm.dto.FcmSendRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import A704.DODREAM.fcm.dto.FcmResponse;
import A704.DODREAM.fcm.dto.TokenRegisterDto;
import A704.DODREAM.fcm.dto.TokenResponseDto;
import A704.DODREAM.fcm.service.FcmService;
import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import io.swagger.v3.oas.annotations.tags.Tag;

@Tag(name = "FCM", description = "Firebase Cloud Messaging 푸시 알림 API")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/fcm")
public class FcmController {
	private final FcmService fcmService;

	@Operation(
		summary = "사용자 ID로 푸시 알림 전송",
		description = "사용자 ID를 입력하면 해당 사용자의 모든 활성 디바이스에 푸시 알림을 전송합니다."
	)
	@PostMapping("/send")
	public ResponseEntity<FcmResponse> pushMessage(
		@RequestBody FcmSendRequest fcmSendRequest) {

		FcmResponse response = fcmService.sendMessageTo(fcmSendRequest);
		return ResponseEntity.ok(response);
	}

    @Operation(
            summary = "FCM 토큰 등록/갱신",
            description = "앱 로그인 시 또는 앱 시작 시 호출해야 합니다.\n\n" +
                    "사용자의 디바이스 FCM 토큰을 DB에 저장합니다.\n\n" +
                    "기존 토큰 있음: lastUsedAt 업데이트 + 재활성화\n\n" +
                    "기존 토큰 없음: 새로 등록"
    )
    @PostMapping("/token")
    public ResponseEntity<TokenResponseDto> registerToken(
            @RequestBody TokenRegisterDto tokenRegisterDto,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        Long userId = userPrincipal.userId();
        TokenResponseDto response = fcmService.registerToken(tokenRegisterDto, userId);
        return ResponseEntity.ok(response);
    }

    @Operation(
            summary = "FCM 토큰 삭제 (로그아웃 시)",
            description = "로그아웃 시 호출해야 합니다.\n\n" +
                    "디바이스의 FCM 토큰을 비활성화하여 더 이상 알림을 받지 않도록 합니다."
    )
    @DeleteMapping("/token")
    public ResponseEntity<TokenResponseDto> deleteToken(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @RequestParam String token){
        Long userId = userPrincipal.userId();
        TokenResponseDto response = fcmService.deleteToken(token, userId);
        return ResponseEntity.ok(response);
    }
}