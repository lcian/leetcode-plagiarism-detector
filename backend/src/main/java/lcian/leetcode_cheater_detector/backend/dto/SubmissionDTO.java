package lcian.leetcode_cheater_detector.backend.dto;


import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lcian.leetcode_cheater_detector.backend.model.DetectorRun;
import lcian.leetcode_cheater_detector.backend.model.Plagiarism;
import lcian.leetcode_cheater_detector.backend.model.Question;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

public record SubmissionDTO(
        @NotNull
        Integer id,
        @NotNull
        String code,
        @NotNull
        String language,
        @NotNull
        Integer date,
        @NotNull
        String userSlug,
        @NotNull
        Integer page,
        @NotNull
        Integer questionId
) {
}
