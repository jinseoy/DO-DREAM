package A704.DODREAM.auth.service;

import java.time.Year;
import java.time.ZoneId;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import A704.DODREAM.auth.dto.request.StudentLoginRequest;
import A704.DODREAM.auth.dto.request.StudentSignupRequest;
import A704.DODREAM.auth.dto.request.StudentVerifyRequest;
import A704.DODREAM.auth.entity.DeviceCredential;
import A704.DODREAM.auth.repository.DeviceCredentialRepository;
import A704.DODREAM.registry.entity.StudentRegistry;
import A704.DODREAM.registry.repository.StudentRegistryRepository;
import A704.DODREAM.user.entity.Classroom;
import A704.DODREAM.user.entity.Role;
import A704.DODREAM.user.entity.School;
import A704.DODREAM.user.entity.StudentProfile;
import A704.DODREAM.user.entity.User;
import A704.DODREAM.user.repository.ClassroomRepository;
import A704.DODREAM.user.repository.SchoolRepository;
import A704.DODREAM.user.repository.StudentProfileRepository;
import A704.DODREAM.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class StudentAuthService {
	private final UserRepository userRepository;
	private final SchoolRepository schoolRepository;
	private final ClassroomRepository classroomRepository;
	private final StudentRegistryRepository studentRegistryRepository;
	private final StudentProfileRepository studentProfileRepository;
	private final DeviceCredentialRepository deviceCredentialRepository;
	private final PasswordEncoder encoder; // BCrypt

	@Transactional(readOnly = true)
	public void verify(StudentVerifyRequest req) {
		studentRegistryRepository.findByNameAndStudentNumber(req.name(), req.studentNumber())
			.orElseThrow(() -> new IllegalArgumentException("학번/이름이 일치하지 않습니다."));
	}

	@Transactional
	public Long signup(StudentSignupRequest req) {

		// 1) 레지스트리 재검증 + 학교 로드
		StudentRegistry sr = studentRegistryRepository
			.findByNameAndStudentNumberFetchSchool(req.name(), req.studentNumber())
			.orElseThrow(() -> new IllegalArgumentException("학번/이름이 일치하지 않습니다."));

		// 2) 이미 같은 deviceId가 가입된 경우 방지(선택)
		if (deviceCredentialRepository.existsByDeviceId(req.deviceId())) {
			throw new IllegalArgumentException("이미 등록된 기기입니다.");
		}

		// 3) 연도 산정(Asia/Seoul 기준 현재 연도)
		int currentYear = Year.now(ZoneId.of("Asia/Seoul")).getValue();

		// 4) School upsert (이름 기준)
		String schoolName = sr.getSchool().getName();
		School school = schoolRepository.findByName(schoolName)
			.orElseGet(() -> schoolRepository.save(School.create(schoolName)));

		// 5) Classroom upsert (school + year + grade + class)
		Classroom classroom = classroomRepository
			.findBySchoolIdAndYearAndGradeLevelAndClassNumber(
				school.getId(), currentYear, sr.getGradeLevel(), sr.getClassNumber()
			)
			.orElseGet(() -> classroomRepository.save(
				Classroom.builder()
					.school(school)
					.year(currentYear)
					.gradeLevel(sr.getGradeLevel())
					.classNumber(sr.getClassNumber())
					.build()
			));

		// 6) User 생성 (학생)
		User user = User.create(req.name(), Role.STUDENT);
		user = userRepository.save(user);

		// 7) 프로필 생성(+ Classroom 연결)
		//    StudentProfile.create(...)는 classroom 세팅이 없어 setter로 연결
		StudentProfile profile = StudentProfile.create(user, schoolName, req.studentNumber(), classroom);
		studentProfileRepository.save(profile);

		// 8) 기기 크리덴셜 저장 (secret -> BCrypt)
		String hash = encoder.encode(req.deviceSecret());
		DeviceCredential cred = DeviceCredential.create(
			user, req.deviceId(), req.platform(), hash
		);
		deviceCredentialRepository.save(cred);

		return user.getId();
	}

	@Transactional(readOnly = true)
	public User authenticate(StudentLoginRequest req) {
		DeviceCredential cred = deviceCredentialRepository.findByDeviceId(req.deviceId())
			.orElseThrow(() -> new IllegalArgumentException("등록되지 않은 기기입니다."));

		// 생체인증은 "클라에서 secret을 꺼낼 권한"을 줬다는 의미. 서버는 secret 검증만 수행.
		if (!encoder.matches(req.deviceSecret(), cred.getSecretHash()))
			throw new IllegalArgumentException("기기 인증에 실패했습니다.");

		return cred.getUser();
	}
}
