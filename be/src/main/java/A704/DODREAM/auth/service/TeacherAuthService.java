package A704.DODREAM.auth.service;

import A704.DODREAM.auth.dto.request.TeacherLoginRequest;
import A704.DODREAM.auth.dto.request.TeacherSignupRequest;
import A704.DODREAM.auth.dto.request.TeacherVerifyRequest;
import A704.DODREAM.auth.entity.PasswordCredential;
import A704.DODREAM.auth.repository.PasswordCredentialRepository;
import A704.DODREAM.registry.repository.TeacherRegistryRepository;
import A704.DODREAM.user.entity.Role;
import A704.DODREAM.user.entity.TeacherProfile;
import A704.DODREAM.user.entity.User;
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
	private final TeacherProfileRepository teacherProfileRepository;
	private final PasswordCredentialRepository passwordCredentialRepository;
	private final TeacherRegistryRepository teacherRegistryRepository;
	private final PasswordEncoder encoder;

	@Transactional(readOnly = true)
	public void verify(TeacherVerifyRequest req) {
		boolean ok = teacherRegistryRepository.existsByNameAndTeacherNo(req.name(), req.teacherNo());
		if (!ok) throw new IllegalArgumentException("학사정보(이름/교원번호)가 일치하지 않습니다.");
	}

	@Transactional
	public Long signup(TeacherSignupRequest req) {
		// 1) 레지스트리 재검증(우회 방지)
		boolean ok = teacherRegistryRepository.existsByNameAndTeacherNo(req.name(), req.teacherNo());
		if (!ok) throw new IllegalArgumentException("학사정보(이름/교원번호)가 일치하지 않습니다.");

		// 2) 이메일 중복 검사
		if (passwordCredentialRepository.existsByEmail(req.email())) {
			throw new IllegalArgumentException("이미 사용 중인 이메일입니다.");
		}

		// 3) User 생성(교사)
		User user = User.create(req.name(), Role.TEACHER);
		user = userRepository.save(user);

		// 4) TeacherProfile 생성(최소)
		TeacherProfile profile = TeacherProfile.create(user, req.teacherNo());
		teacherProfileRepository.save(profile);

		// 5) Credential 생성
		PasswordCredential cred = PasswordCredential.create(user, req.email(), encoder.encode(req.password()));
		passwordCredentialRepository.save(cred);

		return user.getId();
	}

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
