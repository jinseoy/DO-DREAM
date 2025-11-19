package A704.DODREAM.config;

import java.time.Duration;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.web.reactive.function.client.WebClient;

import reactor.netty.http.client.HttpClient;

@Configuration
public class WebClientConfig {

	@Bean
	public WebClient webClient() {
		HttpClient httpClient = HttpClient.create()
			.responseTimeout(Duration.ofMinutes(10));  // PDF 파싱은 시간이 오래 걸릴 수 있음 (Gemini API)

		return WebClient.builder()
			.clientConnector(new ReactorClientHttpConnector(httpClient))
			.build();
	}

	@Bean
	public WebClient branchWebClient() {
		return WebClient.builder()
			.baseUrl("https://api2.branch.io")
			.defaultHeader("Content-Type", "application/json")
			.build();
	}
}