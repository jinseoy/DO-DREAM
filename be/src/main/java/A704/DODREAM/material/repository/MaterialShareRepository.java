package A704.DODREAM.material.repository;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import A704.DODREAM.material.entity.MaterialShare;

@Repository
public interface MaterialShareRepository extends JpaRepository<MaterialShare, Long> {

    @Query("SELECT ms.student.id FROM MaterialShare ms " +
            "WHERE ms.material.id = :materialId " +
            "AND ms.student.id IN :studentIds " +
            "AND ms.material.deletedAt IS NULL")
    Set<Long> findStudentIdsByMaterialIdAndStudentIdIn(
            @Param("materialId") Long materialId,
            @Param("studentIds") Set<Long> studentIds
    );

    @Query("SELECT ms FROM MaterialShare ms " +
            "JOIN FETCH ms.material m " +
            "JOIN FETCH ms.teacher t " +
            "WHERE ms.student.id = :studentId " +
            "AND ms.material.deletedAt IS NULL " +
            "ORDER BY ms.sharedAt DESC")
    List<MaterialShare> findByStudentId(@Param("studentId") Long studentId);

    // 웹에서 공유한 자료 목록을 학생별로 조회 (선생님)
    @Query("SELECT ms FROM MaterialShare ms " +
            "JOIN FETCH ms.material m " +
            "JOIN FETCH ms.teacher t " +
            "WHERE ms.student.id = :studentId " +
            "AND ms.teacher.id = :teacherId " +
            "AND ms.material.deletedAt IS NULL " +
            "ORDER BY ms.sharedAt DESC")
    List<MaterialShare> findByStudentIdAndTeacherId(
            @Param("studentId") Long studentId,
            @Param("teacherId") Long teacherId
    );

    // 웹에서 공유한 자료 목록을 반별로 조회 (선생님)
    @Query("SELECT ms FROM MaterialShare ms " +
            "JOIN FETCH ms.material m " +
            "JOIN FETCH ms.teacher t " +
            "WHERE ms.classroom.id = :classId " +
            "AND ms.teacher.id = :teacherId " +
            "AND ms.material.deletedAt IS NULL " +
            "AND ms.id IN (" +
            "  SELECT MAX(ms2.id) FROM MaterialShare ms2 " +
            "  WHERE ms2.classroom.id = :classId " +
            "  AND ms2.teacher.id = :teacherId " +
            "  AND ms2.material.deletedAt IS NULL " +  // ⭐ 여기도 추가!
            "  GROUP BY ms2.material.id" +
            ") " +
            "ORDER BY ms.sharedAt DESC")
    List<MaterialShare> findByClassIdAndTeacherId(
            @Param("classId") Long classId,
            @Param("teacherId") Long teacherId
    );

    @Query("SELECT ms FROM MaterialShare ms " +
            "JOIN FETCH ms.material m " +
            "WHERE ms.student.id = :studentId " +
            "AND ms.material.id = :materialId " +
            "AND ms.material.deletedAt IS NULL")
    Optional<MaterialShare> findByStudentIdAndMaterialId(
            @Param("studentId") Long studentId,
            @Param("materialId") Long materialId
    );
}