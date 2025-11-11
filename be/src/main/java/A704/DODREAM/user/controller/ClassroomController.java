package A704.DODREAM.user.controller;

import A704.DODREAM.auth.dto.request.UserPrincipal;
import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import A704.DODREAM.user.dto.ClassroomResponse;
import A704.DODREAM.user.dto.StudentListResponse;
import A704.DODREAM.user.service.ClassroomService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Classroom", description = "class API")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/classes")
public class ClassroomController {

	private final ClassroomService classroomService;

    @Operation(summary = "내 담당 반 목록 조회")
    @GetMapping("/teacher")
    public ResponseEntity<ClassroomResponse> getTeacherClassrooms(
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        Long teacherId = userPrincipal.userId();
        ClassroomResponse response = classroomService.getTeacherClassrooms(teacherId);
        return ResponseEntity.ok(response);
    }

    @Operation(summary = "특정 반의 학생 목록 조회")
    @GetMapping("/{classroomId}/students")
    public ResponseEntity<StudentListResponse> getClassroomStudents(
            @PathVariable Long classroomId,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        Long teacherId = userPrincipal.userId();
        StudentListResponse response = classroomService.getClassroomStudents(classroomId, teacherId);
        return ResponseEntity.ok(response);
    }

    @Operation(summary = "담당 학생 전체 조회")
    @GetMapping("/students")
    public ResponseEntity<List<StudentListResponse>> getTeacherClassroomStudents(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @RequestParam(required = false) List<Long> classroomIds) {
        Long teacherId = userPrincipal.userId();
        List<StudentListResponse> response =
                classroomService.getTeacherClassroomStudents(teacherId, classroomIds);
        return ResponseEntity.ok(response);
    }
}
