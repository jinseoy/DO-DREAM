package A704.DODREAM.file.repository;

import A704.DODREAM.file.entity.PdfEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface PdfRepository extends JpaRepository<PdfEntity, Long> {

  // ===== 기본 조회 메서드 (Spring Data JPA 자동 생성) =====

  /**
   * 사용자의 모든 PDF 조회 (최신순)
   * 메서드명 규칙: findBy + 필드명 + OrderBy + 필드명 + Desc/Asc
   */
  List<PdfEntity> findByOwnerOrderByCreatedAtDesc(String owner);

  /**
   * 사용자의 PDF 페이징 조회 (관리자 페이지용)
   */
  Page<PdfEntity> findByOwner(String owner, Pageable pageable);

  /**
   * 사용자 + 상태로 조회
   * 예: status="PARSED" → 파싱 완료된 것만
   */
  List<PdfEntity> findByOwnerAndStatus(String owner, String status);

  /**
   * 파일명으로 검색 (LIKE 검색)
   * 예: filename="보고서" → "보고서.pdf", "월간보고서.pdf" 모두 검색
   */
  List<PdfEntity> findByOwnerAndFilenameContaining(String owner, String filename);

  /**
   * 사용자의 특정 PDF 조회 (권한 검증용)
   * Optional: 값이 없을 수도 있음을 명시
   */
  Optional<PdfEntity> findByIdAndOwner(Long id, String owner);

  /**
   * S3 키로 조회 (중복 업로드 방지용)
   */
  Optional<PdfEntity> findByS3Key(String s3Key);

  /**
   * JSON이 있는 PDF만 조회 (파싱 완료된 것만)
   */
  List<PdfEntity> findByOwnerAndJsonS3KeyIsNotNull(String owner);

  /**
   * 특정 기간 내 업로드된 PDF 조회
   */
  List<PdfEntity> findByOwnerAndCreatedAtBetween(
      String owner,
      LocalDateTime startDate,
      LocalDateTime endDate
  );

  // ===== 커스텀 쿼리 (@Query 사용) =====

  /**
   * 사용자의 PDF 개수 조회
   * COUNT 쿼리는 직접 작성하는게 성능 좋음
   */
  @Query("SELECT COUNT(p) FROM PdfEntity p WHERE p.owner = :owner")
  long countByOwner(@Param("owner") String owner);

  /**
   * 상태별 개수 조회 (대시보드용)
   * 예: UPLOADED(5개), PARSED(10개), ERROR(2개)
   */
  @Query("SELECT p.status, COUNT(p) FROM PdfEntity p " +
      "WHERE p.owner = :owner GROUP BY p.status")
  List<Object[]> countByStatusGrouped(@Param("owner") String owner);

  /**
   * 목차(indexes)로 검색 (텍스트 검색)
   * 예: "경제" 포함된 PDF 찾기
   */
  @Query("SELECT p FROM PdfEntity p WHERE p.owner = :owner " +
      "AND p.indexes LIKE %:keyword%")
  List<PdfEntity> searchByIndexes(
      @Param("owner") String owner,
      @Param("keyword") String keyword
  );

  /**
   * 파싱되지 않은 오래된 PDF 조회 (배치 작업용)
   * 예: 24시간 지났는데 아직 UPLOADED 상태면 에러 처리
   */
  @Query("SELECT p FROM PdfEntity p WHERE p.status = 'UPLOADED' " +
      "AND p.createdAt < :cutoffTime")
  List<PdfEntity> findStuckPdfs(@Param("cutoffTime") LocalDateTime cutoffTime);

  /**
   * 파일 크기로 정렬 (Native Query 예시)
   * S3에서 파일 크기 가져와서 DB에 저장했다고 가정
   */
  @Query(value = "SELECT * FROM pdfs WHERE owner = :owner " +
      "ORDER BY file_size DESC LIMIT :limit",
      nativeQuery = true)
  List<PdfEntity> findLargestFiles(
      @Param("owner") String owner,
      @Param("limit") int limit
  );

  /**
   * 최근 파싱된 PDF 조회 (Top N)
   */
  List<PdfEntity> findTop10ByOwnerAndStatusOrderByParsedAtDesc(String owner, String status);

  /**
   * 사용자의 모든 PDF 삭제 (회원 탈퇴시)
   * @Modifying: UPDATE/DELETE 쿼리에 필수
   * @Transactional: Service에서 붙여야 함
   */
  @Query("DELETE FROM PdfEntity p WHERE p.owner = :owner")
  void deleteAllByOwner(@Param("owner") String owner);

  /**
   * JSON이 없는 PDF 개수 (파싱 대기 중)
   */
  long countByOwnerAndJsonS3KeyIsNull(String owner);
}