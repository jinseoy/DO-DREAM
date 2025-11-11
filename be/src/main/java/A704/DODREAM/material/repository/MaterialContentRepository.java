package A704.DODREAM.material.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import A704.DODREAM.material.entity.MaterialContent;

public interface MaterialContentRepository extends JpaRepository<MaterialContent, Long> {
}