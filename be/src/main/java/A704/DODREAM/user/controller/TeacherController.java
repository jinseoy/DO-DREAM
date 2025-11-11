package A704.DODREAM.user.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import A704.DODREAM.auth.dto.request.UserPrincipal;
import A704.DODREAM.user.dto.TeacherResponse;
import A704.DODREAM.user.entity.TeacherProfile;
import A704.DODREAM.user.repository.TeacherProfileRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

@Tag(name = "Teacher API", description = "교사 정보 API")
@RestController
@RequestMapping("/api/teacher")
@RequiredArgsConstructor
public class TeacherController {

	private final TeacherProfileRepository teacherProfileRepository;

	@Operation(
		summary = "교사 정보 조회",
		description = "로그인한 교사의 교사번호와 이름을 조회합니다"
	)
	@GetMapping("/me")
	@PreAuthorize("hasRole('TEACHER')")
	public ResponseEntity<TeacherResponse> me(@AuthenticationPrincipal UserPrincipal userPrincipal) {
		TeacherProfile profile = teacherProfileRepository.findByUserId(userPrincipal.userId())
			.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "교사 프로필이 없습니다."));
		TeacherResponse teacherResponse = TeacherResponse.from(profile);
		return ResponseEntity.ok(teacherResponse);
	}
}