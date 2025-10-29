package A704.DODREAM.file.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;
import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class ClovaOcrResponse {
    private String version;
    private String requestId;
    private Long timestamp;
    private List<Image> images;

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Image {
        private String uid;
        private String name;
        private String inferResult;
        private String message;
        private List<Field> fields;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Field {
        private String valueType;
        private BoundingPoly boundingPoly;
        private String inferText;
        private Double inferConfidence;
        private Boolean lineBreak;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class BoundingPoly {
        private List<Vertex> vertices;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Vertex {
        private Integer x;
        private Integer y;
    }
}
