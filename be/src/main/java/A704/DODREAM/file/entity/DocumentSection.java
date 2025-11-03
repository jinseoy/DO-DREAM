package A704.DODREAM.file.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "document_sections")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class DocumentSection {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "uploaded_file_id", nullable = false)
    private UploadedFile uploadedFile;

    @Column(nullable = false)
    private String title; // "1. 미적분의 기본 개념"

    @Column(nullable = false)
    private Integer level; // 1 (대단원), 2 (중단원), 3 (소단원)

    @Column(nullable = false)
    private Integer startPage; // 시작 페이지

    @Column(nullable = false)
    private Integer endPage; // 끝 페이지 (현재는 같은 페이지)

    private Integer fontSize; // 감지된 글자 크기

    @Column(columnDefinition = "TEXT")
    private String summaryText; // AI 요약 (나중에 추가)

    @Column(nullable = false)
    private Integer sectionOrder; // 섹션 순서

}