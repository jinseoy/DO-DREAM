package A704.DODREAM.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.cloudfront.CloudFrontClient;
import software.amazon.awssdk.services.cloudfront.CloudFrontUtilities;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

@Configuration
public class AWSConfig {

	@Value("${aws.s3.region}")
	private String region;

	@Value("${aws.access-key-id:}")
	private String accessKeyId;

	@Value("${aws.secret-access-key:}")
	private String secretAccessKey;

	@Bean
	public S3Client s3Client() {

		if (accessKeyId != null && !accessKeyId.isEmpty() && secretAccessKey != null && !secretAccessKey.isEmpty()) {
			return S3Client.builder()
				.region(Region.of(region))
				.credentialsProvider(StaticCredentialsProvider.create(
					AwsBasicCredentials.create(accessKeyId, secretAccessKey)))
				.build();
		}

		// Default credential provider chain (IAM role, environment variables, etc.)
		return S3Client.builder()
			.region(Region.of(region))
			.build();
	}

	@Bean
	public S3Presigner s3Presigner() {
		if (accessKeyId != null && !accessKeyId.isEmpty() && secretAccessKey != null && !secretAccessKey.isEmpty()) {
			return S3Presigner.builder()
				.region(Region.of(region))
				.credentialsProvider(StaticCredentialsProvider.create(
					AwsBasicCredentials.create(accessKeyId, secretAccessKey)))
				.build();
		}

		return S3Presigner.builder()
			.region(Region.of(region))
			.build();
	}

	@Bean
	public CloudFrontClient cloudFrontClient() {
		if (accessKeyId != null && !accessKeyId.isEmpty() && secretAccessKey != null && !secretAccessKey.isEmpty()) {
			return CloudFrontClient.builder()
				.region(Region.AWS_GLOBAL)
				.credentialsProvider(StaticCredentialsProvider.create(
					AwsBasicCredentials.create(accessKeyId, secretAccessKey)))
				.build();
		}

		return CloudFrontClient.builder()
			.region(Region.AWS_GLOBAL)
			.build();
	}

	@Bean
	public CloudFrontUtilities cloudFrontUtilities() {
		return CloudFrontUtilities.create();
	}
}
