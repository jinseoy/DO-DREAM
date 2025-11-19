package A704.DODREAM.global.exception.handlers;

import A704.DODREAM.global.exception.CustomException;
import A704.DODREAM.global.exception.constant.ErrorCode;
import A704.DODREAM.global.response.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@Slf4j
@RestControllerAdvice(basePackages = "A704.DODREAM")
public class GlobalExceptionHandler {

    // 1. @RequestBody 검증 실패
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleMethodArgumentNotValidException(
            MethodArgumentNotValidException ex,
            HttpServletRequest request) {

        String errorMessage = ex.getBindingResult()
                .getFieldErrors()
                .stream()
                .map(error -> error.getField() + ": " + error.getDefaultMessage())
                .findFirst()
                .orElse("입력값이 유효하지 않습니다.");

        log.warn("Validation error: {} at {}", errorMessage, request.getRequestURI());

        return ResponseEntity
                .badRequest()
                .body(ApiResponse.error(ErrorCode.INVALID_INPUT, errorMessage));
    }

    // 2. @RequestParam, @PathVariable 검증 실패
    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiResponse<Void>> handleConstraintViolationException(
            ConstraintViolationException ex,
            HttpServletRequest request) {

        String errorMessage = ex.getConstraintViolations()
                .stream()
                .map(violation -> violation.getPropertyPath() + ": " + violation.getMessage())
                .findFirst()
                .orElse("잘못된 요청입니다.");

        log.warn("Constraint violation: {} at {}", errorMessage, request.getRequestURI());

        return ResponseEntity
                .badRequest()
                .body(ApiResponse.error(ErrorCode.INVALID_INPUT, errorMessage));
    }

    // 3. 커스텀 예외
    @ExceptionHandler(CustomException.class)
    public ResponseEntity<ApiResponse<Void>> handleCustomException(CustomException e) {
        ErrorCode errorCode = e.getErrorCode();
        log.warn("Custom exception: {}", errorCode.getMessage());

        return ResponseEntity
                .status(getHttpStatus(errorCode))
                .body(ApiResponse.error(errorCode, errorCode.getMessage()));
    }

    // HTTP 상태 코드 매핑
    private HttpStatus getHttpStatus(ErrorCode errorCode) {
        String code = errorCode.getCode();
        if (code.contains("404")) return HttpStatus.NOT_FOUND;
        if (code.contains("401")) return HttpStatus.UNAUTHORIZED;
        if (code.contains("403")) return HttpStatus.FORBIDDEN;
        if (code.contains("409")) return HttpStatus.CONFLICT;
        if (code.contains("410")) return HttpStatus.GONE;
        if (code.contains("500")) return HttpStatus.INTERNAL_SERVER_ERROR;
        return HttpStatus.BAD_REQUEST;
    }

    // 4. 알 수 없는 예외 (최종 fallback)
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleException(Exception ex, HttpServletRequest request) {
        log.error("Unexpected error at {}: {}", request.getRequestURI(), ex.getMessage(), ex);

        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error(ErrorCode.INTERNAL_ERROR, "서버 내부 오류가 발생했습니다."));
    }

}