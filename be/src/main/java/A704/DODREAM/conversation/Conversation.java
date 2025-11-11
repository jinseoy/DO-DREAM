package A704.DODREAM.conversation;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import A704.DODREAM.material.entity.Material;
import A704.DODREAM.user.entity.User;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "conversation", indexes = {
	@Index(name = "idx_student", columnList = "student_id"),
	@Index(name = "idx_material", columnList = "material_id")
})
@EntityListeners(AuditingEntityListener.class)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class Conversation {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(name = "conversation_id")
	private Long conversationId;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "student_id", nullable = false)
	private User student;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "material_id")  // 40번째 줄: nullable (자료 없이도 대화 가능)
	private Material material;

	@Column(length = 200)
	private String title;

	@CreatedDate
	@Column(name = "created_at", updatable = false)
	private LocalDateTime createdAt;

	@Column(name = "ended_at")
	private LocalDateTime endedAt;

	// 양방향 관계
	@OneToMany(mappedBy = "conversation", cascade = CascadeType.ALL, orphanRemoval = true)
	@Builder.Default
	private List<Message> messages = new ArrayList<>();
}