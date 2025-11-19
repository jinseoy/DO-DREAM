package A704.DODREAM.quiz.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GradingResultDto {
	@JsonProperty("question_id")
	private Long quizId;

	@JsonProperty("student_answer")
	private String studentAnswer;

	@JsonProperty("is_correct")
	private boolean isCorrect;

	@JsonProperty("ai_feedback")
	private String aiFeedback;
}
