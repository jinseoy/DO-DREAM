package A704.DODREAM.report.repository;

import A704.DODREAM.progress.entity.StudentMaterialProgress;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StudentMaterialProgressRepository extends JpaRepository<StudentMaterialProgress, Long> {
    
    /**
     * 특정 학생의 특정 교재 진행 상태 조회
     */
    Optional<StudentMaterialProgress> findByStudentIdAndMaterialId(Long studentId, Long materialId);
    
    /**
     * 특정 학생의 모든 학습 진행 상태 조회
     */
    List<StudentMaterialProgress> findByStudentId(Long studentId);
    
    /**
     * 특정 교재의 모든 학생 진행 상태 조회
     */
    List<StudentMaterialProgress> findByMaterialId(Long materialId);
}


