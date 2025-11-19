package A704.DODREAM.user.controller;

import A704.DODREAM.auth.dto.request.UserPrincipal;
import A704.DODREAM.user.dto.StudentDetailResponse;
import A704.DODREAM.user.service.StudentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Student", description = "학생 API")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/students")
public class StudentController {

	private final StudentService studentService;

	@Operation(summary = "특정 학생 상세 정보 조회", description = "교사가 자신의 담당 학생의 상세 정보를 조회합니다.")
	@GetMapping("/{studentId}")
	public ResponseEntity<StudentDetailResponse> getStudentDetail(
		@PathVariable Long studentId,
		@AuthenticationPrincipal UserPrincipal userPrincipal) {
		
		Long teacherId = userPrincipal.userId();
		StudentDetailResponse response = studentService.getStudentDetail(studentId, teacherId);
		return ResponseEntity.ok(response);
	}

	@Operation(summary = "내 정보 조회 (학생)", description = "학생이 본인의 정보를 조회합니다.")
	@GetMapping("/me")
	public ResponseEntity<StudentDetailResponse> getMyInfo(
		@AuthenticationPrincipal UserPrincipal userPrincipal) {
		
		Long studentId = userPrincipal.userId();
		StudentDetailResponse response = studentService.getMyInfo(studentId);
		return ResponseEntity.ok(response);
	}
}

