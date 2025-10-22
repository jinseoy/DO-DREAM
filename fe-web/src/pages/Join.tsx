import { useEffect, useState, useCallback } from 'react';
import Swal from 'sweetalert2';
import './Join.css';

// 각 모드별 이미지 (요구사항)
import heroSigninImg from '../assets/join/signin.png';
import heroSignupImg from '../assets/join/signup.png';

type Mode = 'sign-in' | 'sign-up';

type JoinProps = {
  onLoginSuccess: () => void;
};

export default function Join({ onLoginSuccess }: JoinProps) {
  // 초기엔 sign-up을 보여주고, 살짝 뒤에 sign-in으로 전환하는 기존 UX 유지
  const [mode, setMode] = useState<Mode>('sign-in');

  useEffect(() => {
    const t = setTimeout(() => setMode('sign-in'), 200);
    return () => clearTimeout(t);
  }, []);

  const toggle = useCallback(() => {
    setMode((m) => (m === 'sign-in' ? 'sign-up' : 'sign-in'));
  }, []);

  const showErrorToast = (message: string) => {
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'error',
      title: message,
      showConfirmButton: false,
      timer: 2000,
    });
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const email = (form.elements.namedItem('email') as HTMLInputElement).value;
    const password = (form.elements.namedItem('password') as HTMLInputElement).value;

    if (!email) {
      showErrorToast('이메일을 입력해주세요');
      return;
    }
    if (!password) {
      showErrorToast('비밀번호를 입력해주세요');
      return;
    }

    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: '로그인 되었습니다',
      showConfirmButton: false,
      timer: 1500,
    });

    setTimeout(() => {
      onLoginSuccess();
    }, 1500);
  };

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const username = (form.elements.namedItem('username') as HTMLInputElement).value;
    const email = (form.elements.namedItem('email') as HTMLInputElement).value;
    const password = (form.elements.namedItem('password') as HTMLInputElement).value;
    const confirmPassword = (form.elements.namedItem('confirmPassword') as HTMLInputElement).value;

    if (!username) {
      showErrorToast('사용자 이름을 입력해주세요');
      return;
    }
    if (!email) {
      showErrorToast('이메일을 입력해주세요');
      return;
    }
    if (!password) {
      showErrorToast('비밀번호를 입력해주세요');
      return;
    }
    if (!confirmPassword) {
      showErrorToast('비밀번호 확인을 입력해주세요');
      return;
    }
    if (password !== confirmPassword) {
      showErrorToast('비밀번호가 일치하지 않습니다');
      return;
    }
    if (password.length < 6) {
      showErrorToast('비밀번호는 최소 6자 이상이어야 합니다');
      return;
    }

    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: '회원가입이 완료되었습니다!',
      showConfirmButton: false,
      timer: 2000,
    });

    setTimeout(() => {
      setMode('sign-in');
    }, 2000);
  };

  return (
    <div
      id="container"
      className={`container ${mode}`}
      // 이미지 URL을 CSS 변수로 주입 (모드별로 CSS에서 선택)
      style={
        {
          ['--hero-img-signin' as any]: `url(${heroSigninImg})`,
          ['--hero-img-signup' as any]: `url(${heroSignupImg})`,
        } as React.CSSProperties
      }
    >
      <div className="row">
        {/* SIGN UP */}
        <div className="col align-items-center flex-col sign-up">
          <div className="form-wrapper align-items-center">
            <form className="form sign-up" onSubmit={handleSignup}>
              <div className="input-group">
                <i className="bx bxs-user" />
                <input type="text" name="username" placeholder="사용자 이름" />
              </div>
              <div className="input-group">
                <i className="bx bx-mail-send" />
                <input type="email" name="email" placeholder="이메일" />
              </div>
              <div className="input-group">
                <i className="bx bxs-lock-alt" />
                <input type="password" name="password" placeholder="비밀번호" />
              </div>
              <div className="input-group">
                <i className="bx bxs-lock-alt" />
                <input type="password" name="confirmPassword" placeholder="비밀번호 확인" />
              </div>
              <button type="submit">회원가입</button>
              <p>
                <span>이미 계정이 있으신가요? </span>
                <b onClick={toggle} className="pointer">
                  로그인 하기
                </b>
              </p>
            </form>
          </div>
        </div>

        {/* SIGN IN */}
        <div className="col align-items-center flex-col sign-in">
          <div className="form-wrapper align-items-center">
            <form className="form sign-in" onSubmit={handleLogin}>
              <div className="input-group">
                <i className="bx bx-mail-send" />
                <input type="text" name="email" placeholder="이메일" />
              </div>
              <div className="input-group">
                <i className="bx bxs-lock-alt" />
                <input type="password" name="password" placeholder="비밀번호" />
              </div>
              <button type="submit">로그인</button>
              <p>
                <b>비밀번호를 잊어버렸나요?</b>
              </p>
              <p>
                <span>아직 계정이 없으신가요? </span>
                <b onClick={toggle} className="pointer">
                  회원가입 하기
                </b>
              </p>
            </form>
          </div>
        </div>
      </div>

      <div className="row content-row">
        <div className="col align-items-center flex-col">
          <div className="text sign-in">
            <h2>DO:DREAM</h2>
          </div>
        </div>

        <div className="col align-items-center flex-col">
          <div className="text sign-up">
            <h2>가입하기</h2>
          </div>
        </div>
      </div>
    </div>
  );
}
