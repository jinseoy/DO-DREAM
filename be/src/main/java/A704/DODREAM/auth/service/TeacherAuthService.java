package A704.DODREAM.auth.service;

import A704.DODREAM.auth.dto.request.TeacherLoginRequest;
import A704.DODREAM.auth.dto.request.TeacherSignupRequest;
import A704.DODREAM.auth.entity.PasswordCredential;
import A704.DODREAM.auth.repository.PasswordCredentialRepository;
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
	private final PasswordEncoder encoder;

	@Transactional
	public Long signup(TeacherSignupRequest teacherSignupRequest) {

		// 2) 이메일 중복 방지 (DB 제약이 없으므로 서비스 레벨에서 체크)
		if (passwordCredentialRepository.existsByEmail(teacherSignupRequest.email()))
			throw new IllegalArgumentException("이미 사용 중인 이메일입니다.");

		// 3) User 생성 (교사)
		User user = User.create(teacherSignupRequest.name(), Role.TEACHER);
		// BaseTimeEntity는 Auditing으로 자동세팅된다고 가정
		user = userRepository.save(user);

		// 4) TeacherProfile 생성 (최소)
		TeacherProfile profile = TeacherProfile.create(user);
		// 필요하다면 reg의 다른 필드도 복사
		teacherProfileRepository.save(profile);

		// 5) 교사용 Credential 생성
		PasswordCredential cred = PasswordCredential.create(user, teacherSignupRequest.email(), encoder.encode(teacherSignupRequest.password()));
		passwordCredentialRepository.save(cred);

		return user.getId();
	}

	@Transactional(readOnly = true)
	public User authenticate(TeacherLoginRequest teacherLoginRequest) {
		PasswordCredential cred = passwordCredentialRepository.findByEmail(teacherLoginRequest.email())
			.orElseThrow(() -> new IllegalArgumentException("이메일 혹은 비밀번호가 올바르지 않습니다."));

		if (!encoder.matches(teacherLoginRequest.password(), cred.getPasswordHash()))
			throw new IllegalArgumentException("이메일 혹은 비밀번호가 올바르지 않습니다.");

		User user = cred.getUser();
		if (user.getRole() != Role.TEACHER) throw new IllegalStateException("교사 계정이 아닙니다.");
		return user;
	}


}
