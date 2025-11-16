package A704.DODREAM.material.dto;

import A704.DODREAM.material.entity.Material;
import A704.DODREAM.material.enums.LabelColor;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PublishedMaterialListResponse {

    private List<PublishedMaterialDto> materials;
    private int totalCount;

    public static PublishedMaterialListResponse from(List<Material> materials) {
        return PublishedMaterialListResponse.builder()
                .materials(materials.stream()
                        .map(PublishedMaterialDto::from)
                        .collect(Collectors.toList()))
                .totalCount(materials.size())
                .build();
    }

    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PublishedMaterialDto {

        private Long materialId;
        private Long uploadedFileId;
        private String title;
        private String originalFileName;
        private LabelColor label;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;

        public static PublishedMaterialDto from(Material material) {
            return PublishedMaterialDto.builder()
                    .materialId(material.getId())
                    .uploadedFileId(material.getUploadedFile().getId())
                    .title(material.getTitle())
                    .originalFileName(material.getUploadedFile().getOriginalFileName())
                    .label(material.getLabel())
                    .createdAt(material.getCreatedAt())
                    .updatedAt(material.getUpdatedAt())
                    .build();
        }
    }
}