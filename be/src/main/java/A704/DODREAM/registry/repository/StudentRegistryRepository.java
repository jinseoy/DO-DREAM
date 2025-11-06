package A704.DODREAM.registry.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import A704.DODREAM.registry.entity.StudentRegistry;

public interface StudentRegistryRepository extends JpaRepository<StudentRegistry, Long> {
	Optional<StudentRegistry> findByNameAndStudentNumber(String name, String studentNumber);

	@Query("""
        select sr from StudentRegistry sr
        join fetch sr.school s
        where sr.name = :name and sr.studentNumber = :studentNumber
    """)
	Optional<StudentRegistry> findByNameAndStudentNumberFetchSchool(String name, String studentNumber);
}
