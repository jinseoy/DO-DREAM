package A704.DODREAM.registry.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import A704.DODREAM.registry.entity.ClassroomTeacherRegistry;

public interface ClassroomTeacherRegistryRepository extends JpaRepository<ClassroomTeacherRegistry, Long> {
	List<ClassroomTeacherRegistry> findAllByTeacherRegistryId(Long teacherRegistryId);
}
