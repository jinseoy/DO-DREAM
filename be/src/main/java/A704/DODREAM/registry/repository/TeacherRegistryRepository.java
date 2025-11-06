package A704.DODREAM.registry.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import A704.DODREAM.registry.entity.TeacherRegistry;

public interface TeacherRegistryRepository extends JpaRepository<TeacherRegistry, Long> {
	boolean existsByNameAndTeacherNumber(String name, String teacherNumber);
	@Query("""
        select tr from TeacherRegistry tr
        join fetch tr.school s
        where tr.name = :name and tr.teacherNumber = :teacherNumber
    """)
	Optional<TeacherRegistry> findByNameAndTeacherNumberFetchSchool(String name, String teacherNumber);
}
