package A704.DODREAM.global.exception.constant;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum ErrorCode {
    // 사용자 관련 (USER)
    USER_NOT_FOUND("USER_404", "사용자를 찾을 수 없습니다."),
    USER_WITHDRAWN("USER_410", "탈퇴한 사용자입니다."),

    //선생님 관련 (TEACHER)
    TEACHER_INFO_MISMATCH("TEACHER_400", "학사정보(이름/교원번호)가 일치하지 않습니다."),
    DUPLICATED_EMAIL("TEACHER_409", "이미 사용 중인 이메일입니다."),
    TEACHER_INVALID_CREDENTIALS("TEACHER_401", "이메일 혹은 비밀번호가 올바르지 않습니다."),
    NOT_TEACHER_ACCOUNT("TEACHER_403", "교사 계정이 아닙니다."),

    // 학생 관련 (STUDENT)
    STUDENT_INFO_MISMATCH("STUDENT_400", "학번/이름이 일치하지 않습니다."),

    // 학급 관련 (CLASSROOM)
    CLASSROOM_NOT_FOUND("CLASSSROOM_404", "학급을 찾을 수 없습니다."),

    // 기기 관련 (DEVICE)
    DUPLICATE_DEVICE("DEVICE_409", "이미 등록된 기기입니다."),
    DEVICE_NOT_FOUND("DEVICE_404", "등록되지 않은 기기입니다."),
    DEVICE_AUTHENTICATION_FAILED("DEVICE_401", "기기 인증에 실패했습니다."),

    // 인증 관련 (AUTH)
    UNAUTHENTICATED_USER("AUTH_401", "인증되지 않은 사용자입니다."),
    ACCESS_TOKEN_EXPIRED("AUTH_401", "액세스 토큰이 만료되었습니다."),
    ACCESS_TOKEN_INVALID("AUTH_401", "유효하지 않은 액세스 토큰입니다."),
    REFRESH_TOKEN_EXPIRED("AUTH_403", "리프레시 토큰이 만료되었습니다."),
    REFRESH_TOKEN_INVALID("AUTH_403", "유효하지 않은 리프레시 토큰입니다."),
    FORBIDDEN("AUTH_401", "권한이 없습니다."),

    // 파일 관련 (FILE)
    FILE_NOT_FOUND("FILE_404", "파일을 찾을 수 없습니다."),
    FILE_UPLOAD_FAILED("FILE_500", "파일 업로드에 실패했습니다."),
    INVALID_FILE_EXTENSION("FILE_400", "잘못된 형식의 파일입니다."),
    FILE_PARSING_FAILED("FILE_400", "파싱된 JSON이 없습니다."),

    //자료 관련 (MATERIAL)
    MATERIAL_NOT_FOUND("MATERIAL_404", "자료를 찾을 수 없습니다."),

    // 일반 입력/서버 오류 (COMMON)
    INVALID_INPUT("COMMON_400", "잘못된 입력입니다."),
    DUPLICATED_VALUE("COMMON_409", "중복되는 입력값입니다."),
    INTERNAL_ERROR("COMMON_500", "서버 오류가 발생했습니다.");

    private final String code;
    private final String message;

}