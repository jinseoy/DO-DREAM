package A704.DODREAM.file.entity;

import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
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
@Table(name = "ocr_pages")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class OcrPage {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "uploaded_file_id", nullable = false)
	private UploadedFile uploadedFile;

	@Column(nullable = false)
	private Integer pageNumber;

	@Column(columnDefinition = "TEXT")
	private String fullText; // 페이지 전체 텍스트

	@OneToMany(mappedBy = "ocrPage", cascade = CascadeType.ALL, orphanRemoval = true)
	@Builder.Default
	private List<OcrWord> words = new ArrayList<>();

	// 비즈니스 메서드
	public void setUploadedFile(UploadedFile uploadedFile) {
		this.uploadedFile = uploadedFile;
	}

	public void addWord(OcrWord word) {
		this.words.add(word);
		word.setOcrPage(this);
	}

	public void setFullText(String fullText) {
		this.fullText = fullText;
	}
}