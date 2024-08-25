package lcian.leetcode_cheater_detector.backend.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lcian.leetcode_cheater_detector.backend.model.Plagiarism;
import lcian.leetcode_cheater_detector.backend.model.Question;
import lcian.leetcode_cheater_detector.backend.model.Submission;

import java.util.ArrayList;
import java.util.List;

public record DetectorRunDTO (
        Integer id,
        @NotNull
        String detector,
        @NotNull
        String parameters,
        @NotNull
        Integer questionId,
        Integer referenceSubmissionId
) {

}
