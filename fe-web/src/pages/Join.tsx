// src/Join.tsx
import { useEffect, useState, useCallback } from 'react';
import "./Join.css";

type Mode = 'sign-in' | 'sign-up';

export default function Join() {
  const [mode, setMode] = useState<Mode>('sign-up');

  useEffect(() => {
    const t = setTimeout(() => setMode('sign-in'), 200);
    return () => clearTimeout(t);
  }, []);

  const toggle = useCallback(() => {
    setMode((m) => (m === 'sign-in' ? 'sign-up' : 'sign-in'));
  }, []);

  return (
    <div id="container" className={`container ${mode}`}>
      <div className="row">
        {/* SIGN UP */}
        <div className="col align-items-center flex-col sign-up">
          <div className="form-wrapper align-items-center">
            <div className="form sign-up">
              <div className="input-group">
                <i className="bx bxs-user" />
                <input type="text" placeholder="사용자 이름" />
              </div>
              <div className="input-group">
                <i className="bx bx-mail-send" />
                <input type="email" placeholder="이메일" />
              </div>
              <div className="input-group">
                <i className="bx bxs-lock-alt" />
                <input type="password" placeholder="비밀번호" />
              </div>
              <div className="input-group">
                <i className="bx bxs-lock-alt" />
                <input type="password" placeholder="비밀번호 확인" />
              </div>
              <button>회원가입</button>
              <p>
                <span>이미 계정이 있으신가요? </span>
                <b onClick={toggle} className="pointer">
                  로그인 하기
                </b>
              </p>
            </div>
          </div>
        </div>

        {/* SIGN IN */}
        <div className="col align-items-center flex-col sign-in">
          <div className="form-wrapper align-items-center">
            <div className="form sign-in">
              <div className="input-group">
                <i className="bx bx-mail-send" />
                <input type="text" placeholder="이메일" />
              </div>
              <div className="input-group">
                <i className="bx bxs-lock-alt" />
                <input type="password" placeholder="비밀번호" />
              </div>
              <button>로그인</button>
              <p>
                <b>비밀번호를 잊어버렸나요?</b>
              </p>
              <p>
                <span>아직 계정이 없으신가요? </span>
                <b onClick={toggle} className="pointer">
                  회원가입 하기
                </b>
              </p>
            </div>
          </div>
          <div className="form-wrapper"></div>
        </div>
      </div>

      <div className="row content-row">
        <div className="col align-items-center flex-col">
          <div className="text sign-in">
            <h2>Do!dream</h2>
          </div>
          <div className="img sign-in"></div>
        </div>

        {/* SIGN UP CONTENT */}
        <div className="col align-items-center flex-col">
          <div className="img sign-up"></div>
          <div className="text sign-up">
            <h2>가입하기</h2>
          </div>
        </div>
      </div>
    </div>
  );
}
