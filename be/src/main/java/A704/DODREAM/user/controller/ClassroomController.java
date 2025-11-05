package A704.DODREAM.user.controller;

import A704.DODREAM.user.dto.ClassroomResponse;
import A704.DODREAM.user.dto.StudentListResponse;
import A704.DODREAM.user.service.ClassroomService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Classroom", description = "class API")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/classes")
public class ClassroomController {

    private final ClassroomService classroomService;

    @Operation(summary = "특정 선생님의 담당 반 목록 조회")
    @GetMapping("/teacher/{teacherId}")
    public ResponseEntity<ClassroomResponse> getTeacherClassrooms(
            @PathVariable Long teacherId) {
        ClassroomResponse response = classroomService.getTeacherClassrooms(teacherId);
        return ResponseEntity.ok(response);
    }

    @Operation(summary = "특정 반의 학생 목록 조회")
    @GetMapping("/{classroomId}/students")
    public ResponseEntity<StudentListResponse> getClassroomStudents(
            @PathVariable Long classroomId) {
        StudentListResponse response = classroomService.getClassroomStudents(classroomId);
        return ResponseEntity.ok(response);
    }

    @Operation(summary = "전체 담당 학생 조회")
    @GetMapping("/teacher/{teacherId}/students")
    public ResponseEntity<List<StudentListResponse>> getTeacherClassroomStudents(
            @PathVariable Long teacherId,
            @RequestParam(required = false) List<Long> classroomIds) {
        List<StudentListResponse> response =
                classroomService.getTeacherClassroomStudents(teacherId, classroomIds);
        return ResponseEntity.ok(response);
    }
}
