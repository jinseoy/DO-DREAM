package A704.DODREAM.domain.material;

import A704.DODREAM.domain.material.entity.Material;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MaterialRepository extends JpaRepository<Material, Long> {
}