package A704.DODREAM.file.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import A704.DODREAM.file.entity.OcrStatus;
import A704.DODREAM.file.entity.UploadedFile;

@Repository
public interface UploadedFileRepository extends JpaRepository<UploadedFile, Long> {

	// 업로더 ID로 파일 목록 조회
	List<UploadedFile> findByUploaderId(Long uploaderId);

	// 상태별 파일 목록 조회
	List<UploadedFile> findByOcrStatus(OcrStatus status);

	// 업로더 ID와 상태로 파일 목록 조회
	List<UploadedFile> findByUploaderIdAndOcrStatus(Long uploaderId, OcrStatus status);
}