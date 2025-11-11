package A704.DODREAM;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
@EnableJpaAuditing
@ConfigurationPropertiesScan(basePackages = "A704.DODREAM.config.vault")
public class DodreamApplication {

	public static void main(String[] args) {
		SpringApplication.run(DodreamApplication.class, args);
	}

}