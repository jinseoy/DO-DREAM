package A704.DODREAM.file;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OcrPageRepository extends JpaRepository<OcrPage, Long> {

    // 파일 ID로 페이지 목록 조회 (페이지 순서대로)
    List<OcrPage> findByUploadedFileIdOrderByPageNumberAsc(Long fileId);

    // 파일로 페이지 목록 조회
    List<OcrPage> findByUploadedFileOrderByPageNumberAsc(UploadedFile uploadedFile);
}