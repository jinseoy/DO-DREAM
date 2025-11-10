package A704.DODREAM.material.service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

import A704.DODREAM.global.exception.CustomException;
import A704.DODREAM.global.exception.constant.ErrorCode;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import A704.DODREAM.fcm.dto.FcmResponse;
import A704.DODREAM.fcm.dto.FcmSendRequest;
import A704.DODREAM.fcm.service.FcmService;
import A704.DODREAM.material.dto.MaterialShareListResponse;
import A704.DODREAM.material.dto.MaterialShareRequest;
import A704.DODREAM.material.dto.MaterialShareResponse;
import A704.DODREAM.material.entity.Material;
import A704.DODREAM.material.entity.MaterialShare;
import A704.DODREAM.material.repository.MaterialRepository;
import A704.DODREAM.material.repository.MaterialShareRepository;
import A704.DODREAM.user.entity.Classroom;
import A704.DODREAM.user.entity.User;
import A704.DODREAM.user.repository.ClassroomRepository;
import A704.DODREAM.user.repository.UserRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class MaterialShareService {
	private final MaterialShareRepository materialShareRepository;
	private final MaterialRepository materialRepository;
	private final UserRepository userRepository;
	private final ClassroomRepository classroomRepository;

	private final FcmService fcmService;

    // 자료 공유
    @Transactional
    public MaterialShareResponse shareMaterial(MaterialShareRequest request, Long teacherId){

        User teacher = userRepository.getReferenceById(teacherId);

		// 자료 조회
		Material material = materialRepository.findByIdAndTeacherId(request.getMaterialId(), teacherId)
			.orElseThrow(() -> new CustomException(ErrorCode.MATERIAL_NOT_FOUND));


        // classroom 정보 조회
        Set<Long> classIds = request.getShares().keySet();
        Map<Long, Classroom> classroomMap = classroomRepository.findAllById(classIds)
                .stream()
                .collect(Collectors.toMap(Classroom::getId, Function.identity()));

		// 모든 학생 ID 수집
		Set<Long> studentIds = request.getShares().values().stream()
			.flatMap(info -> info.getStudentIds().stream())
			.collect(Collectors.toSet());

		// 학생 조회
		Map<Long, User> students = userRepository.findAllById(studentIds)
			.stream()
			.collect(Collectors.toMap(User::getId, Function.identity()));

		// 이미 공유된 학생 조회
		Set<Long> sharedIds = materialShareRepository.findStudentIdsByMaterialIdAndStudentIdIn(material.getId(),
			studentIds);

		List<MaterialShare> sharesToSave = new ArrayList<>();
		List<MaterialShareResponse.ShareResult> results = new ArrayList<>();

		for (Map.Entry<Long, MaterialShareRequest.ClassShareInfo> entry : request.getShares().entrySet()) {
			Long classId = entry.getKey();
			MaterialShareRequest.ClassShareInfo info = entry.getValue();

			Classroom classroom = classroomMap.get(classId);
			if (classroom == null) {
				log.error("반 정보를 찾을 수 없습니다. calssId={}", classId);
				continue;
			}

            for (Long studentId : info.getStudentIds()) {
                User student = students.get(studentId);

				// 학생을 찾을 수 없는 경우
				if (student == null) {
					results.add(MaterialShareResponse.ShareResult.builder()
						.studentId(studentId)
						.studentName("알 수 없음")
						.success(false)
						.message("학생을 찾을 수 없습니다")
						.build());
					continue;
				}

				// 이미 공유된 경우
				if (sharedIds.contains(studentId)) {
					results.add(MaterialShareResponse.ShareResult.builder()
						.studentId(studentId)
						.studentName(student.getName())
						.success(false)
						.message("이미 공유된 자료입니다")
						.build());
					continue;
				}

				// MaterialShare 생성
				MaterialShare share = MaterialShare.builder()
					.material(material)
					.teacher(teacher)
					.student(student)
					.shareType(info.getType())
					.classroom(classroom)
					.sharedAt(LocalDateTime.now())
					.build();

				sharesToSave.add(share);
			}
		}

		List<MaterialShare> savedShares = materialShareRepository.saveAll(sharesToSave);

		sendNotifications(savedShares, teacher, material);

		for (MaterialShare share : savedShares) {

			results.add(MaterialShareResponse.ShareResult.builder()
				.shareId(share.getId())
				.studentId(share.getStudent().getId())
				.studentName(share.getStudent().getName())
				.success(true)
				.message("공유 완료")
				.sharedAt(share.getSharedAt())
				.build());
		}

		long successCount = results.stream().filter(MaterialShareResponse.ShareResult::isSuccess).count();

		return MaterialShareResponse.builder()
			.materialId(material.getId())
			.materialTitle(material.getTitle())
			.teacherId(teacher.getId())
			.teacherName(teacher.getName())
			.totalShared((int)successCount)
			.results(results)
			.message(String.format("%d명의 학생에게 공유되었습니다", successCount))
			.build();
	}

	@Async
	public void sendNotifications(
		List<MaterialShare> shares,
		User teacher,
		Material material
	) {
		if (shares.isEmpty()) {
			return;
		}

		try {
			List<Long> studentIds = shares.stream()
				.map(share -> share.getStudent().getId())
				.collect(Collectors.toList());

			FcmSendRequest fcmRequest = FcmSendRequest.builder()
				.userIds(studentIds)
				.title("새 학습자료가 공유되었습니다")
				.body(String.format("%s 선생님이 '%s'를 공유했습니다",
					teacher.getName(), material.getTitle()))
				.build();

			FcmResponse fcmResponse = fcmService.sendMessageTo(fcmRequest);

			log.info("자료 공유 알림 전송 완료: 자료ID={}, {}",
				material.getId(), fcmResponse.getMessage());

		} catch (Exception e) {
			log.error("자료 공유 알림 전송 실패: 자료ID={}", material.getId(), e);
		}
	}

    public MaterialShareListResponse getSharedMaterialByStudent(Long studentId){
        User student = userRepository.getReferenceById(studentId);

		List<MaterialShare> shares = materialShareRepository.findByStudentId(studentId);

		return MaterialShareListResponse.builder()
			.studentId(student.getId())
			.studentName(student.getName())
			.totalCount(shares.size())
			.materials(toInfoList(shares))
			.build();
	}

	public MaterialShareListResponse getSharedMaterialByStudentAndTeacher(
		Long studentId, Long teacherId) {

		User student = userRepository.findById(studentId)
			.orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        List<MaterialShare> shares = materialShareRepository.findByStudentIdAndTeacherId(studentId, teacherId);

		return MaterialShareListResponse.builder()
			.studentId(student.getId())
			.studentName(student.getName())
			.totalCount(shares.size())
			.materials(toInfoList(shares))
			.build();
	}

	public MaterialShareListResponse getSharedMaterialByClass(Long classId, Long teacherId) {

		Classroom classroom = classroomRepository.findById(classId)
			.orElseThrow(() -> new CustomException(ErrorCode.CLASSROOM_NOT_FOUND));

        List<MaterialShare> shares = materialShareRepository.findByClassIdAndTeacherId(classId, teacherId);

		return MaterialShareListResponse.builder()
			.totalCount(shares.size())
			.materials(toInfoList(shares))
			.build();
	}

	private List<MaterialShareListResponse.SharedMaterialInfo> toInfoList(
		List<MaterialShare> shares) {
		return shares.stream()
			.map(MaterialShareListResponse.SharedMaterialInfo::from)
			.collect(Collectors.toList());
	}
}
