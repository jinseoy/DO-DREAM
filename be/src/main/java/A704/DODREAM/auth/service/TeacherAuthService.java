package A704.DODREAM.auth.service;

import java.util.List;

import A704.DODREAM.auth.dto.request.TeacherLoginRequest;
import A704.DODREAM.auth.dto.request.TeacherSignupRequest;
import A704.DODREAM.auth.dto.request.TeacherVerifyRequest;
import A704.DODREAM.auth.entity.PasswordCredential;
import A704.DODREAM.auth.repository.PasswordCredentialRepository;
import A704.DODREAM.registry.entity.ClassroomRegistry;
import A704.DODREAM.registry.entity.ClassroomTeacherRegistry;
import A704.DODREAM.registry.entity.SchoolRegistry;
import A704.DODREAM.registry.entity.TeacherRegistry;
import A704.DODREAM.registry.repository.ClassroomTeacherRegistryRepository;
import A704.DODREAM.registry.repository.SchoolRegistryRepository;
import A704.DODREAM.registry.repository.TeacherRegistryRepository;
import A704.DODREAM.user.entity.Classroom;
import A704.DODREAM.user.entity.ClassroomTeacher;
import A704.DODREAM.user.entity.Role;
import A704.DODREAM.user.entity.School;
import A704.DODREAM.user.entity.TeacherProfile;
import A704.DODREAM.user.entity.User;
import A704.DODREAM.user.repository.ClassroomRepository;
import A704.DODREAM.user.repository.ClassroomTeacherRepository;
import A704.DODREAM.user.repository.SchoolRepository;
import A704.DODREAM.user.repository.TeacherProfileRepository;
import A704.DODREAM.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class TeacherAuthService {

	private final UserRepository userRepository;
	private final SchoolRepository schoolRepository;
	private final ClassroomRepository classroomRepository;
	private final ClassroomTeacherRepository classroomTeacherRepository;
	private final TeacherProfileRepository teacherProfileRepository;
	private final PasswordCredentialRepository passwordCredentialRepository;
	private final TeacherRegistryRepository teacherRegistryRepository;
	private final ClassroomTeacherRegistryRepository classroomTeacherRegistryRepository;
	private final PasswordEncoder encoder;

	@Transactional(readOnly = true)
	public void verify(TeacherVerifyRequest req) {
		boolean ok = teacherRegistryRepository.existsByNameAndTeacherNumber(req.name(), req.teacherNumber());
		if (!ok) throw new IllegalArgumentException("학사정보(이름/교원번호)가 일치하지 않습니다.");
	}

	@Transactional
	public Long signup(TeacherSignupRequest req) {
		// 1) 레지스트리 재검증
		boolean ok = teacherRegistryRepository.existsByNameAndTeacherNumber(req.name(), req.teacherNumber());
		if (!ok) throw new IllegalArgumentException("학사정보(이름/교원번호)가 일치하지 않습니다.");

		// 2) 이메일 중복 검사
		if (passwordCredentialRepository.existsByEmail(req.email())) {
			throw new IllegalArgumentException("이미 사용 중인 이메일입니다.");
		}

		// 3) User 생성(교사)
		User user = User.create(req.name(), Role.TEACHER);
		user = userRepository.save(user);

		// 4) TeacherProfile 생성(최소)
		TeacherProfile profile = TeacherProfile.create(user, req.teacherNumber());
		profile = teacherProfileRepository.save(profile);

		// 5) Credential 생성
		PasswordCredential cred = PasswordCredential.create(user, req.email(), encoder.encode(req.password()));
		passwordCredentialRepository.save(cred);

		// 6) 레지스트리 → 운영 테이블 승격(학교/반/교사-반 매핑)
		// 6-1) 교사 레지스트리 with 학교 로드
		TeacherRegistry teacherRegistry = teacherRegistryRepository
			.findByNameAndTeacherNumberFetchSchool(req.name(), req.teacherNumber())
			.orElseThrow(() -> new IllegalStateException("교사 레지스트리를 찾을 수 없습니다."));

		// 6-2) School upsert (현재는 이름 기준)
		School school = schoolRepository.findByName(teacherRegistry.getSchool().getName())
			.orElseGet(() -> {
				School s = School.create(teacherRegistry.getSchool().getName());
				return schoolRepository.save(s);
			});

		// 6-3) 교사-반 레지스트리들 조회
		List<ClassroomTeacherRegistry> mappings =
			classroomTeacherRegistryRepository.findAllByTeacherRegistryId(teacherRegistry.getId());

		// 6-4) 각 매핑에 대해 Classroom upsert & ClassroomTeacher upsert
		for (ClassroomTeacherRegistry ctr : mappings) {
			ClassroomRegistry cr = ctr.getClassroomRegistry();

			// Classroom upsert
			Classroom classroom = classroomRepository
				.findBySchoolIdAndYearAndGradeLevelAndClassNumber(
					school.getId(), cr.getYear(), cr.getGradeLevel(), cr.getClassNumber()
				)
				.orElseGet(() -> classroomRepository.save(
					Classroom.builder()
						.school(school)
						.year(cr.getYear())
						.gradeLevel(cr.getGradeLevel())
						.classNumber(cr.getClassNumber())
						.build()
				));

			// ClassroomTeacher upsert(중복 방지)
			boolean has = classroomTeacherRepository
				.existsByClassroomIdAndTeacherId(classroom.getId(), profile.getId());

			if (!has) {
				classroomTeacherRepository.save(
					ClassroomTeacher.builder()
						.classroom(classroom)
						.teacher(profile)
						.build()
				);
			}
		}

		return user.getId();
	}

	// @Transactional
	// public Long signup(TeacherSignupRequest req) {
	// 	// 1) 레지스트리 재검증(우회 방지)
	// 	boolean ok = teacherRegistryRepository.existsByNameAndTeacherNumber(req.name(), req.teacherNumber());
	// 	if (!ok) throw new IllegalArgumentException("학사정보(이름/교원번호)가 일치하지 않습니다.");
	//
	// 	// 2) 이메일 중복 검사
	// 	if (passwordCredentialRepository.existsByEmail(req.email())) {
	// 		throw new IllegalArgumentException("이미 사용 중인 이메일입니다.");
	// 	}
	//
	// 	// 3) User 생성(교사)
	// 	User user = User.create(req.name(), Role.TEACHER);
	// 	user = userRepository.save(user);
	//
	// 	// 4) TeacherProfile 생성(최소)
	// 	TeacherProfile profile = TeacherProfile.create(user, req.teacherNumber());
	// 	teacherProfileRepository.save(profile);
	//
	// 	// 5) Credential 생성
	// 	PasswordCredential cred = PasswordCredential.create(user, req.email(), encoder.encode(req.password()));
	// 	passwordCredentialRepository.save(cred);
	//
	// 	return user.getId();
	// }

	@Transactional(readOnly = true)
	public User authenticate(TeacherLoginRequest req) {
		PasswordCredential cred = passwordCredentialRepository.findByEmail(req.email())
			.orElseThrow(() -> new IllegalArgumentException("이메일 혹은 비밀번호가 올바르지 않습니다."));
		if (!encoder.matches(req.password(), cred.getPasswordHash()))
			throw new IllegalArgumentException("이메일 혹은 비밀번호가 올바르지 않습니다.");

		User user = cred.getUser();
		if (user.getRole() != Role.TEACHER) throw new IllegalStateException("교사 계정이 아닙니다.");
		return user;
	}
}
