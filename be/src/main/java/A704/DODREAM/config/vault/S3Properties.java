package A704.DODREAM.config.vault;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "aws")
public record S3Properties(String awsRegion, String awsS3Bucket, String cloudFrontDomain, String cloudFrontId,
						   String privateKeyPem) {
}
