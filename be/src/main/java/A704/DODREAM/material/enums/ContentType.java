package A704.DODREAM.material.enums;

public enum ContentType {
	TEXT("텍스트만"),
	IMAGE("이미지 포함"),
	MIXED("혼합");

	private final String description;

	ContentType(String description) {
		this.description = description;
	}
}