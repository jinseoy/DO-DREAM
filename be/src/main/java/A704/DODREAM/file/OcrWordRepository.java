package A704.DODREAM.file;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OcrWordRepository extends JpaRepository<OcrWord, Long> {

    // 페이지 ID로 단어 목록 조회 (순서대로)
    List<OcrWord> findByOcrPageIdOrderByWordOrderAsc(Long pageId);

    // 페이지로 단어 목록 조회
    List<OcrWord> findByOcrPageOrderByWordOrderAsc(OcrPage ocrPage);
}