package A704.DODREAM.material.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import A704.DODREAM.material.entity.Material;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface MaterialRepository extends JpaRepository<Material, Long> {
    Optional<Material> findByIdAndTeacherId(Long materialId, Long teacherId);

    Optional<Material> findByUploadedFileId(Long pdfId);

    @Query("SELECT m FROM Material m " +
            "JOIN FETCH m.uploadedFile " +
            "WHERE m.teacher.id = :id " +
            "ORDER BY m.createdAt DESC")
    List<Material> findAllByTeacherIdWithUploadedFile(Long id);
}