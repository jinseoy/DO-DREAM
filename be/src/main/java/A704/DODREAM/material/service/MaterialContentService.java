package A704.DODREAM.material.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import A704.DODREAM.material.entity.Material;
import A704.DODREAM.material.entity.MaterialContent;
import A704.DODREAM.material.repository.MaterialContentRepository;
import A704.DODREAM.material.repository.MaterialRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional
public class MaterialContentService {

	private final MaterialContentRepository materialContentRepository;
	private final MaterialRepository materialRepository;

	/**
	 * 테스트를 위해 MaterialContent를 생성하고 저장합니다.
	 *
	 * @param pageNumber  페이지 번호
	 * @param textContent 내용
	 * @return 저장된 MaterialContent 엔티티
	 */
	public MaterialContent createContent(Integer pageNumber, String textContent) {
		// MaterialContent가 참조하는 Material 엔티티를 먼저 생성/가져옵니다.
		// 여기서는 단순 테스트를 위해 임의의 Material을 생성하고 저장합니다.
		Material material = Material.builder()
			.title("테스트 문서")
			.originalFileName("test.pdf")
			.fileUrl("https://example.com/test.pdf")  // 임시 URL
			// teacher는 실제로는 User 객체가 필요하지만, 테스트를 위해 null을 허용하도록 Material 엔티티를 수정하거나
			// 실제 User를 조회하여 설정해야 합니다.
			.build();
		material = materialRepository.save(material);

		// MaterialContent 엔티티를 생성합니다.
		// createdAt 필드는 명시적으로 설정하지 않습니다. (AuditingEntityListener가 처리)
		MaterialContent materialContent = MaterialContent.builder()
			.material(material)
			.pageNumber(pageNumber)
			.textContent(textContent)
			.build();

		// 저장 시점에 createdAt이 자동으로 기록되는지 확인합니다.
		return materialContentRepository.save(materialContent);
	}
}