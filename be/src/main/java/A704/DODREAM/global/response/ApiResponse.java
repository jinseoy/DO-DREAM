package A704.DODREAM.global.response;

import A704.DODREAM.global.exception.constant.ErrorCode;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.http.HttpStatus;

import java.time.LocalDateTime;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApiResponse<T> {

    private boolean success;
    private String code;
    private String message;
    private T data;
    private LocalDateTime timestamp;

    // 성공 응답
    public static <T> ApiResponse<T> success(String message, HttpStatus httpStatus, T data) {
        return ApiResponse.<T>builder()
                .success(true)
                .code(null)
                .message(message)
                .data(data)
                .timestamp(LocalDateTime.now())
                .build();
    }

    // 에러 응답
    public static <T> ApiResponse<T> error(ErrorCode errorCode, String customMessage) {
        return ApiResponse.<T>builder()
                .success(false)
                .code(errorCode.getCode())
                .message(customMessage)
                .data(null)
                .timestamp(LocalDateTime.now())
                .build();
    }
}

