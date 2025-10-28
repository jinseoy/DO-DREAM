package A704.DODREAM.domain.user;

public enum UserRole {
  STUDENT("학생"),
  TEACHER("선생님");

  private final String description;

  UserRole(String description) {
    this.description = description;
  }

  public String getDescription() {
    return description;
  }
}
