package lcian.leetcode_cheater_detector.backend.dto;

import jakarta.validation.constraints.NotNull;
import lcian.leetcode_cheater_detector.backend.model.Plagiarism;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

@AllArgsConstructor
@Getter
@Setter
public class PlagiarismMetadataDTO {
    @NotNull
    private Integer id;
    @NotNull
    private Integer numberOfSubmissions;
    @NotNull
    private String language;
    @NotNull
    private Integer confidencePercentage;

    public static PlagiarismMetadataDTO of(Plagiarism plagiarism) {
        return new PlagiarismMetadataDTO(
                plagiarism.getId(),
                plagiarism.getSubmissions().size(),
                plagiarism.getLanguage(),
                plagiarism.getConfidencePercentage()
        );
    }
}
