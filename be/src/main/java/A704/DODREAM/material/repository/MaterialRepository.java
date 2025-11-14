package A704.DODREAM.material.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import A704.DODREAM.material.entity.Material;

import java.util.Optional;

public interface MaterialRepository extends JpaRepository<Material, Long> {
    Optional<Material> findByIdAndTeacherId(Long materialId, Long teacherId);

    Optional<Material> findByJsonS3Key(String jsonS3Key);
}