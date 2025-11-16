package A704.DODREAM.bookmark.repository;

import A704.DODREAM.bookmark.entity.Bookmark;
import A704.DODREAM.material.entity.Material;
import A704.DODREAM.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.Set;

public interface BookmarkRepository extends JpaRepository<Bookmark, Long> {

    @Query("SELECT b FROM Bookmark b " +
            "WHERE b.user = :user " +
            "AND b.material = :material " +
            "AND b.titleId = :titleId ")
    Optional<Bookmark> findByUserAndMaterialAndTitleId(
            User user, Material material, String titleId
    );

    List<Bookmark> findByUserOrderByCreatedAtDesc(User user);

    long countByUser(User user);

    List<Bookmark> findByUserAndMaterial(User user, Material material);
}
