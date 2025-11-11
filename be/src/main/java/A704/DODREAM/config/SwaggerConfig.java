package A704.DODREAM.config;

import java.util.List;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;

@Configuration
public class SwaggerConfig {

	@Bean
	public OpenAPI openAPI() {
		Info info = new Info()
			.title("DODREAM BACKEND API")
			.version("v1.0.0")
			.description("프로젝트 API에 대한 명세서입니다.");

		return new OpenAPI()
			.info(info)
			.addSecurityItem(new SecurityRequirement().addList("bearerAuth"))
			.components(new Components().addSecuritySchemes("bearerAuth",
				new io.swagger.v3.oas.models.security.SecurityScheme()
					.name("Authorization")
					.type(SecurityScheme.Type.HTTP)
					.scheme("bearer")
					.bearerFormat("JWT")
			))
			.servers(List.of(new Server().url("")));
	}
}
