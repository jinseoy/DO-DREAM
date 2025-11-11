package A704.DODREAM.file.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import A704.DODREAM.file.entity.DocumentSection;

@Repository
public interface DocumentSectionRepository extends JpaRepository<DocumentSection, Long> {

	List<DocumentSection> findByUploadedFileIdOrderBySectionOrder(Long uploadedFileId);

	List<DocumentSection> findByUploadedFileIdAndLevel(Long uploadedFileId, Integer level);

	void deleteByUploadedFileId(Long uploadedFileId);
}