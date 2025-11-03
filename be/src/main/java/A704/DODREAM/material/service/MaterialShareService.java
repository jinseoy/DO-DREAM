package A704.DODREAM.material.service;

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
import A704.DODREAM.user.entity.User;
import A704.DODREAM.user.repository.UserRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class MaterialShareService {
    private final MaterialShareRepository materialShareRepository;
    private final MaterialRepository materialRepository;
    private final UserRepository userRepository;
    private final FcmService fcmService;

    //자료 공유
    @Transactional
    public MaterialShareResponse shareMaterial(MaterialShareRequest request){

        //자료 조회
        Material material = materialRepository.findById(request.getMaterialId())
                .orElseThrow(() -> new IllegalArgumentException("자료를 찾을 수 없습니다."));

        //선생님 조회
        User teacher = userRepository.findById(request.getTeacherId())
                .orElseThrow(() -> new IllegalArgumentException("선생님을 찾을 수 없습니다."));

        //학생 조회
        List<User> students = userRepository.findAllById(request.getStudentIds());
        Map<Long, User> studentMap = students.stream()
                .collect(Collectors.toMap(User::getId, Function.identity()));

        //이미 공유된 학생 조회
        Set<Long> sharedIds = materialShareRepository.findStudentIdsByMaterialIdAndStudentIdIn(material.getId(), request.getStudentIds());

        List<MaterialShare> sharesToSave = new ArrayList<>();
        List<MaterialShareResponse.ShareResult> results = new ArrayList<>();

        for (Long studentId : request.getStudentIds()) {
            User student = studentMap.get(studentId);

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

            // 공유할 데이터 추가
            MaterialShare share = MaterialShare.builder()
                    .material(material)
                    .teacher(teacher)
                    .student(student)
                    .shareMessage(request.getShareMessage())
                    .build();
            sharesToSave.add(share);
        }

        List<MaterialShare> savedShares = materialShareRepository.saveAll(sharesToSave);

        sendNotifications(savedShares, teacher, material);

        for(MaterialShare share : savedShares){

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
                .shareMessage(request.getShareMessage())
                .totalShared((int) successCount)
                .results(results)
                .message(String.format("%d명의 학생에게 공유되었습니다", successCount))
                .build();
    }

    @Async
    public void sendNotifications(
            List<MaterialShare> shares,
            User teacher,
            Material material
    ){
        if(shares.isEmpty()){
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
        User student = userRepository.findById(studentId)
                .orElseThrow(() -> new IllegalArgumentException("학생을 찾을 수 없습니다."));

        List<MaterialShare> shares = materialShareRepository.findByStudentId(studentId);

        return MaterialShareListResponse.builder()
                .studentId(student.getId())
                .studentName(student.getName())
                .totalCount(shares.size())
                .materials(toInfoList(shares))
                .build();
    }

    public MaterialShareListResponse getSharedMaterialByStudentAndTeacher(
            Long studentId, Long teacherId){

        User student = userRepository.findById(studentId)
                .orElseThrow(() -> new IllegalArgumentException("학생을 찾을 수 없습니다."));

        User teacher = userRepository.findById(teacherId)
                .orElseThrow(() -> new IllegalArgumentException("선생님을 찾을 수 없습니다."));

        List<MaterialShare> shares = materialShareRepository.findByStudentIdAndTeacherId(studentId, teacherId);

        return MaterialShareListResponse.builder()
                .studentId(student.getId())
                .studentName(student.getName())
                .teacherId(teacher.getId())
                .teacherName(teacher.getName())
                .totalCount(shares.size())
                .materials(toInfoList(shares))
                .build();
    }

    private List<MaterialShareListResponse.SharedMaterialInfo> toInfoList(
            List<MaterialShare> shares){
        return shares.stream()
                .map(MaterialShareListResponse.SharedMaterialInfo::from)
                .collect(Collectors.toList());
    }
}
