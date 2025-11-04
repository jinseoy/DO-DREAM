package A704.DODREAM.registry.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import A704.DODREAM.registry.entity.TeacherRegistry;

public interface TeacherRegistryRepository extends JpaRepository<TeacherRegistry, Long> {
	Optional<TeacherRegistry> findByNameAndTeacherNo(String name, String teacherNo);
	boolean existsByNameAndTeacherNo(String name, String teacherNo);
}
