package A704.DODREAM.file.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DocumentStructureResponse {
    private Long fileId;
    private String fileName;
    private Integer totalPages;
    private List<DocumentSectionResponse> sections;
    private String message;
}