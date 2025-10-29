package A704.DODREAM;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@SpringBootApplication
@EnableJpaAuditing
public class DodreamApplication {

	public static void main(String[] args) {
		SpringApplication.run(DodreamApplication.class, args);
	}

}
