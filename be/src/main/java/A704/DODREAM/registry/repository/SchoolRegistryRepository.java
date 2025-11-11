package A704.DODREAM.registry.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import A704.DODREAM.registry.entity.SchoolRegistry;

public interface SchoolRegistryRepository extends JpaRepository<SchoolRegistry, Long> {
}
