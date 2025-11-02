package A704.DODREAM.user.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import A704.DODREAM.user.entity.User;

public interface UserRepository extends JpaRepository<User, Long> {
}
