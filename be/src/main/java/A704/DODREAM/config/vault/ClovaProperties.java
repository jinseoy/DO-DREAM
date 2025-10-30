package A704.DODREAM.config.vault;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "clova")
public record ClovaProperties(String CLOVA_API_URL, String CLOVA_SECRET_KEY) {
}