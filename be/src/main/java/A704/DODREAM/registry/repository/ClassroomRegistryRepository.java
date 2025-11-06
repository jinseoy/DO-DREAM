package A704.DODREAM.registry.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import A704.DODREAM.registry.entity.ClassroomRegistry;

public interface ClassroomRegistryRepository extends JpaRepository<ClassroomRegistry, Long> {
}
