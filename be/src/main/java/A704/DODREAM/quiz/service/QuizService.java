package A704.DODREAM.quiz.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;

import A704.DODREAM.global.exception.CustomException;
import A704.DODREAM.global.exception.constant.ErrorCode;
import A704.DODREAM.material.entity.Material;
import A704.DODREAM.material.repository.MaterialRepository;
import A704.DODREAM.quiz.dto.GradingResultDto;
import A704.DODREAM.quiz.dto.QuizDto;
import A704.DODREAM.quiz.dto.QuizSaveDto;
import A704.DODREAM.quiz.dto.QuizSubmissionDto;
import A704.DODREAM.quiz.dto.StudentMaterialStatsDto;
import A704.DODREAM.quiz.dto.StudentOverallStatsDto;
import A704.DODREAM.quiz.entity.Quiz;
import A704.DODREAM.quiz.entity.StudentQuizLog;
import A704.DODREAM.quiz.repository.QuizRepository;
import A704.DODREAM.quiz.repository.StudentQuizLogRepository;
import A704.DODREAM.user.entity.User;
import A704.DODREAM.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
@RequiredArgsConstructor
public class QuizService {

	private final QuizRepository quizRepository;
	private final StudentQuizLogRepository studentQuizLogRepository;
	private final MaterialRepository materialRepository;
	private final UserRepository userRepository;
	private final WebClient webClient;

	@Value("${fastapi.url}")
	private String fastApiUrl;

	/**
	 * 교사가 검토한 퀴즈 리스트를 최종 저장 (기존 퀴즈 덮어쓰기)
	 */
	@Transactional
	public void saveQuizzes(Long materialId, Long userId, List<QuizSaveDto> quizDtos) { // (수정) 파라미터 타입 변경
		Material material = materialRepository.findById(materialId)
			.orElseThrow(() -> new CustomException(ErrorCode.FILE_NOT_FOUND));

		// 권한 체크
		if (!material.getTeacher().getId().equals(userId)) {
			throw new CustomException(ErrorCode.FORBIDDEN);
		}

		// 기존 퀴즈 삭제
		quizRepository.deleteAllByMaterialId(materialId);

		// (수정) QuizSaveDto -> Quiz Entity 변환
		List<Quiz> quizzes = quizDtos.stream()
			.map(dto -> Quiz.builder()
				.material(material)
				.questionNumber(dto.getQuestionNumber())
				.questionType(dto.getQuestionType())
				.title(dto.getTitle())
				.content(dto.getContent())
				.correctAnswer(dto.getCorrectAnswer())
				.chapterReference(dto.getChapterReference())
				.build())
			.collect(Collectors.toList());

		quizRepository.saveAll(quizzes);
		log.info("✅ 퀴즈 저장 완료: Material ID {}, 개수 {}", materialId, quizzes.size());
	}

	/**
	 * 특정 자료의 퀴즈 목록 조회 (학생/교사 공용)
	 */
	@Transactional(readOnly = true)
	public List<QuizDto> getQuizzes(Long materialId) {
		return quizRepository.findAllByMaterialIdOrderByQuestionNumber(materialId)
			.stream()
			.map(QuizDto::from)
			.collect(Collectors.toList());
	}

	/**
	 * 학생 답안 일괄 채점 및 로그 저장
	 */
	@Transactional
	public List<GradingResultDto> gradeAndLog(Long materialId, Long studentId, QuizSubmissionDto submission, String token) {
		User student = userRepository.findById(studentId)
			.orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

		List<Quiz> quizzes = quizRepository.findAllByMaterialIdOrderByQuestionNumber(materialId);
		Map<Long, Quiz> quizMap = quizzes.stream()
			.collect(Collectors.toMap(Quiz::getId, q -> q));

		List<Map<String, Object>> questionList = quizzes.stream()
			.map(q -> Map.<String, Object>of(
				"id", q.getId(),
				"content", q.getContent(),
				"correct_answer", q.getCorrectAnswer()
			))
			.collect(Collectors.toList());

		List<Map<String, Object>> studentAnswerList = submission.getAnswers().stream()
			.map(ans -> Map.<String, Object>of(
				"question_id", ans.getQuizId(),
				"student_answer", ans.getAnswer()
			))
			.collect(Collectors.toList());

		Map<String, Object> fastApiRequest = Map.of(
			"questions", questionList,
			"student_answers", studentAnswerList
		);

		log.info("🤖 FastAPI 채점 요청 중... 학생 ID: {}", studentId);
		List<GradingResultDto> results = webClient.post()
			.uri(fastApiUrl + "/rag/quiz/grade-batch")
			.header("Authorization", token)
			.bodyValue(fastApiRequest)
			.retrieve()
			.bodyToMono(new ParameterizedTypeReference<List<GradingResultDto>>() {})
			.block();

		if (results == null) {
			throw new RuntimeException("FastAPI 채점 응답이 비어있습니다.");
		}

		List<StudentQuizLog> logs = results.stream().map(res -> {
			Quiz quiz = quizMap.get(res.getQuizId());
			return StudentQuizLog.builder()
				.quiz(quiz)
				.student(student)
				.studentAnswer(res.getStudentAnswer())
				.isCorrect(res.isCorrect())
				.aiFeedback(res.getAiFeedback())
				.build();
		}).collect(Collectors.toList());

		studentQuizLogRepository.saveAll(logs);
		log.info("✅ 채점 및 로그 저장 완료: {}건", logs.size());

		return results;
	}

	/**
	 * 학생 퀴즈 풀이 기록 조회
	 */
	@Transactional(readOnly = true)
	public List<GradingResultDto> getStudentLogs(Long materialId, Long studentId) {
		return studentQuizLogRepository.findByStudentIdAndQuizMaterialId(studentId, materialId).stream()
			.map(log -> GradingResultDto.builder()
				.quizId(log.getQuiz().getId())
				.studentAnswer(log.getStudentAnswer())
				.isCorrect(log.isCorrect())
				.aiFeedback(log.getAiFeedback())
				.build())
			.collect(Collectors.toList());
	}

	/**
	 * [API 1 수정] 특정 학생의 '모든 자료별' 퀴즈 성적 통계 리스트 조회
	 */
	@Transactional(readOnly = true)
	public List<StudentMaterialStatsDto> getStudentStatsByMaterialList(Long studentId) {
		List<StudentQuizLog> logs = studentQuizLogRepository.findAllByStudentIdWithMaterial(studentId);

		if (logs.isEmpty()) {
			return new ArrayList<>();
		}

		Map<Long, List<StudentQuizLog>> logsByMaterial = logs.stream()
			.collect(Collectors.groupingBy(log -> log.getQuiz().getMaterial().getId()));

		List<StudentMaterialStatsDto> resultList = new ArrayList<>();

		for (Map.Entry<Long, List<StudentQuizLog>> entry : logsByMaterial.entrySet()) {
			Long materialId = entry.getKey();
			List<StudentQuizLog> materialLogs = entry.getValue();
			Material material = materialLogs.get(0).getQuiz().getMaterial();
			int totalQuizCount = quizRepository.countByMaterialId(materialId);

			if (totalQuizCount > 0) {
				// [로직 변경] 퀴즈 ID별로 가장 최근(Latest) 로그만 필터링
				Map<Long, StudentQuizLog> latestLogsByQuiz = materialLogs.stream()
					.collect(Collectors.toMap(
						log -> log.getQuiz().getId(), // Key: Quiz ID
						log -> log,                   // Value: Log 객체
						// Merge Function: 기존값과 새로운값 중 solvedAt이 더 늦은(큰) 것을 선택
						(existing, replacement) -> existing.getSolvedAt().isAfter(replacement.getSolvedAt()) ? existing : replacement
					));

				// 필터링된 최신 로그들 중에서 정답 개수 카운트
				long correctCount = latestLogsByQuiz.values().stream()
					.filter(StudentQuizLog::isCorrect)
					.count();

				double correctRate = (double) correctCount / totalQuizCount * 100.0;

				resultList.add(StudentMaterialStatsDto.builder()
					.materialId(materialId)
					.materialTitle(material.getTitle())
					.correctCount((int) correctCount)
					.tryCount(materialLogs.size()) // 시도 횟수는 전체 로그 수 그대로 유지 (노력 지표)
					.totalQuizCount(totalQuizCount)
					.correctRate(Math.round(correctRate * 10) / 10.0)
					.build());
			}
		}

		return resultList;
	}

	/**
	 * [API 2] 특정 학생의 종합 평균 정답률 조회
	 * (각 자료별 정답률을 구하고, 그 정답률들의 평균을 계산)
	 */
	@Transactional(readOnly = true)
	public StudentOverallStatsDto getStudentOverallStats(Long studentId) {
		List<StudentQuizLog> logs = studentQuizLogRepository.findAllByStudentIdWithMaterial(studentId);

		if (logs.isEmpty()) {
			return StudentOverallStatsDto.builder()
				.studentId(studentId)
				.solvedMaterialCount(0)
				.averageCorrectRate(0.0)
				.build();
		}

		Map<Long, List<StudentQuizLog>> logsByMaterial = logs.stream()
			.collect(Collectors.groupingBy(log -> log.getQuiz().getMaterial().getId()));

		double sumOfRates = 0.0;
		int materialCount = 0;

		for (Long materialId : logsByMaterial.keySet()) {
			int totalQuizInMaterial = quizRepository.countByMaterialId(materialId);

			if (totalQuizInMaterial > 0) {
				List<StudentQuizLog> materialLogs = logsByMaterial.get(materialId);

				// [로직 변경] 퀴즈 ID별로 가장 최근 로그만 필터링
				long correctCount = materialLogs.stream()
					.collect(Collectors.toMap(
						log -> log.getQuiz().getId(),
						log -> log,
						(existing, replacement) -> existing.getSolvedAt().isAfter(replacement.getSolvedAt()) ? existing : replacement
					))
					.values().stream()
					.filter(StudentQuizLog::isCorrect)
					.count();

				double materialRate = (double) correctCount / totalQuizInMaterial * 100.0;
				sumOfRates += materialRate;
				materialCount++;
			}
		}

		double averageRate = materialCount > 0 ? sumOfRates / materialCount : 0.0;

		return StudentOverallStatsDto.builder()
			.studentId(studentId)
			.solvedMaterialCount(materialCount)
			.averageCorrectRate(Math.round(averageRate * 10) / 10.0)
			.build();
	}
}