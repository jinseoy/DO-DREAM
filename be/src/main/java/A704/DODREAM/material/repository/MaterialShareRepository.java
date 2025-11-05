package A704.DODREAM.material.repository;

import A704.DODREAM.material.entity.MaterialShare;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Set;

@Repository
public interface MaterialShareRepository extends JpaRepository<MaterialShare, Long> {
    @Query("SELECT ms.student.id FROM MaterialShare ms " +
            "WHERE ms.material.id = :materialId AND ms.student.id IN :studentIds")
    Set<Long> findStudentIdsByMaterialIdAndStudentIdIn(Long materialId, List<Long> studentIds
    );

    // 앱에서 공유받은 자료 목록 조회 (학생)
    @Query("SELECT ms FROM MaterialShare ms " +
            "JOIN FETCH ms.material m " +
            "JOIN FETCH ms.teacher t " +
            "WHERE ms.student.id = :studentId " +
            "ORDER BY ms.sharedAt DESC")
    List<MaterialShare> findByStudentId(Long studentId);

    // 웹에서 공유한 자료 목록을 학생별로 조회 (선생님)
    @Query("SELECT ms FROM MaterialShare ms " +
            "JOIN FETCH ms.material m " +
            "JOIN FETCH ms.teacher t " +
            "WHERE ms.student.id = :studentId " +
            "AND ms.teacher.id = :teacherId " +
            "ORDER BY ms.sharedAt DESC")
    List<MaterialShare> findByStudentIdAndTeacherId(Long studentId, Long teacherId);

}
