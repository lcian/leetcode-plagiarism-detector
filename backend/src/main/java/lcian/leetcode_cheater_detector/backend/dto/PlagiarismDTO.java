package lcian.leetcode_cheater_detector.backend.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.persistence.CascadeType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;
import jakarta.validation.constraints.NotNull;
import lcian.leetcode_cheater_detector.backend.model.DetectorRun;
import lcian.leetcode_cheater_detector.backend.model.Submission;

import java.util.List;

public record PlagiarismDTO(
        Integer id,
        @NotNull
        Integer confidencePercentage,
        @NotNull
        List<Integer> submissionIds,
        @NotNull
        Integer detectorRunId,
        @NotNull
        String language
) {

}
