package A704.DODREAM.material.enums;

public enum ProcessingStatus {
  PENDING("대기중"),
  PROCESSING("처리중"),
  COMPLETED("완료"),
  FAILED("실패");

  private final String description;

  ProcessingStatus(String description) {
    this.description = description;
  }

  public String getDescription() {
    return description;
  }
}