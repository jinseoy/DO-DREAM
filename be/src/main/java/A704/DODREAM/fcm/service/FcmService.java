package A704.DODREAM.fcm.service;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.FirebaseMessagingException;
import com.google.firebase.messaging.Message;
import com.google.firebase.messaging.Notification;

import A704.DODREAM.fcm.dto.FcmResponse;
import A704.DODREAM.fcm.dto.FcmSendRequest;
import A704.DODREAM.fcm.dto.TokenRegisterDto;
import A704.DODREAM.fcm.dto.TokenResponseDto;
import A704.DODREAM.fcm.entity.UserDevices;
import A704.DODREAM.fcm.repository.UserDevicesRepository;
import A704.DODREAM.user.entity.User;
import A704.DODREAM.user.repository.UserRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class FcmService {

	private final UserRepository userRepository;
	private final UserDevicesRepository userDevicesRepository;

	@Value("${firebase-credentials-file}")
	private String firebaseCredentials;

	@PostConstruct
	public void initialize() {
		try {
			if (FirebaseApp.getApps().isEmpty()) {
				ByteArrayInputStream serviceAccount = new ByteArrayInputStream(
					firebaseCredentials.getBytes(StandardCharsets.UTF_8)
				);

				FirebaseOptions options = FirebaseOptions.builder()
					.setCredentials(GoogleCredentials.fromStream(serviceAccount))
					.build();

				FirebaseApp.initializeApp(options);
			}
		} catch (IOException e) {
			throw new RuntimeException("Firebase 초기화 실패", e);
		}
	}

	public FcmResponse sendMessageTo(FcmSendRequest fcmSendRequest) {

		if (fcmSendRequest.getUserIds() == null || fcmSendRequest.getUserIds().isEmpty()) {
			return FcmResponse.builder()
				.success(false)
				.message("사용자 ID 목록이 비어있습니다.")
				.build();
		}

		//사용자 정보 조회
		List<User> users = userRepository.findAllById(fcmSendRequest.getUserIds());
		Map<Long, User> userMap = users.stream()
			.collect(Collectors.toMap(User::getId, Function.identity()));

		List<FcmResponse.UserResult> userResults = new ArrayList<>();
		int totalSuccess = 0;

		for (Long userId : fcmSendRequest.getUserIds()) {
			User user = userMap.get(userId);

			if (user == null) {
				userResults.add(FcmResponse.UserResult.builder()
					.userId(userId)
					.userName("알 수 없음")
					.devices(List.of())
					.build());
				continue;
			}

			//사용자의 모든 활성 디바이스 조회
			List<UserDevices> devices = userDevicesRepository.findByUserIdAndIsActiveTrue(userId);

			if (devices.isEmpty()) {
				return FcmResponse.builder()
					.success(false)
					.message("등록된 디바이스가 없습니다")
					.build();
			}

			//각 디바이스에 전송
			List<FcmResponse.FcmResult> results = new ArrayList<>();

			for (UserDevices device : devices) {
				try {
					Message message = Message.builder()
						.setToken(device.getFcmToken())
						.setNotification(Notification.builder()
							.setTitle(fcmSendRequest.getTitle())
							.setBody(fcmSendRequest.getBody())
							.build())
						.build();

					String response = FirebaseMessaging.getInstance().send(message);

					results.add(FcmResponse.FcmResult.builder()
						.deviceId(device.getId())
						.deviceType(device.getDeviceType())
						.success(true)
						.build());

					totalSuccess++;

					device.setLastUsedAt(LocalDateTime.now());
				} catch (FirebaseMessagingException e) {
					// 실패
					results.add(FcmResponse.FcmResult.builder()
						.deviceId(device.getId())
						.deviceType(device.getDeviceType())
						.success(false)
						.build());
				}
			}
			userResults.add(FcmResponse.UserResult.builder()
				.userId(userId)
				.userName(user.getName())
				.devices(results)
				.build());
		}

		return FcmResponse.builder()
			.success(totalSuccess > 0)
			.message(String.format("%d개 디바이스에 전송 성공",
				totalSuccess))
			.result(userResults)
			.build();
	}

    @Transactional
    public TokenResponseDto registerToken(TokenRegisterDto dto, Long userId){
        // 사용자 확인
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

		// 이미 등록된 Token인지 확인
		Optional<UserDevices> existingDevice =
			userDevicesRepository.findByFcmToken(dto.getToken());

		UserDevices device;

		if (existingDevice.isPresent()) {
			device = existingDevice.get();
			device.setLastUsedAt(LocalDateTime.now());
			device.setActive(true);
		} else {
			device = UserDevices.builder()
				.user(user)
				.fcmToken(dto.getToken())
				.deviceType(dto.getDeviceType())
				.registeredAt(LocalDateTime.now())
				.lastUsedAt(LocalDateTime.now())
				.isActive(true)
				.build();
		}

		UserDevices savedDevice = userDevicesRepository.save(device);

		return TokenResponseDto.builder()
			.success(true)
			.message("토큰 등록 완료")
			.tokenInfo(TokenResponseDto.TokenInfo.builder()
				.deviceId(savedDevice.getId())
				.userId(user.getId())
				.deviceType(savedDevice.getDeviceType().name())
				.registeredAt(savedDevice.getRegisteredAt())
				.lastUsedAt(savedDevice.getLastUsedAt())
				.build())
			.build();
	}

    @Transactional
    public TokenResponseDto deleteToken(String token, Long userId){
        Optional<UserDevices> device = userDevicesRepository.findByFcmToken(token);
        if (device.isPresent()) {
            UserDevices userDevice = device.get();

            if(!userDevice.getUser().getId().equals(userId)){
                throw new IllegalArgumentException("해당 토큰을 삭제할 권한이 없습니다.");
            }

			userDevice.setActive(false);
			userDevicesRepository.save(userDevice);

			return TokenResponseDto.builder()
				.success(true)
				.message("토큰 삭제 완료")
				.tokenInfo(TokenResponseDto.TokenInfo.builder()
					.deviceId(userDevice.getId())
					.userId(userDevice.getUser().getId())
					.build())
				.build();
		}
        return TokenResponseDto.builder()
                .success(false)
                .message("토큰을 찾을 수 없습니다")
                .build();
    }

    public List<UserDevices> getUserDevices(Long userId){
        return userDevicesRepository.findByUserIdAndIsActiveTrue(userId);
    }
}