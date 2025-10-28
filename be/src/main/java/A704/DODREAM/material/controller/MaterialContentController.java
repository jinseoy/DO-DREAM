package A704.DODREAM.material.controller;

import A704.DODREAM.material.entity.MaterialContent;
import A704.DODREAM.material.service.MaterialContentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/test/content")
public class MaterialContentController {

  private final MaterialContentService materialContentService;

  /**
   * MaterialContent를 저장하고, createdAt이 자동 기록되었는지 응답으로 확인합니다.
   * @param page 페이지 번호
   * @param text 내용
   * @return 생성된 MaterialContent 정보 (createdAt 포함)
   */
  @PostMapping
  public ResponseEntity<MaterialContent> createMaterialContent(
      @RequestParam Integer page,
      @RequestParam String text) {

    MaterialContent createdContent = materialContentService.createContent(page, text);

    // createdContent.getCreatedAt()이 null이 아닌, 현재 시간이 기록되어 있다면 테스트 성공입니다.
    if (createdContent.getCreatedAt() != null) {
      System.out.println("✅ createdAt 필드가 성공적으로 기록되었습니다: " + createdContent.getCreatedAt());
    } else {
      System.out.println("❌ createdAt 필드가 기록되지 않았습니다.");
    }

    return ResponseEntity.ok(createdContent);
  }
}