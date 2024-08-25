package lcian.leetcode_cheater_detector.backend.dto;

import jakarta.validation.constraints.NotNull;

public record QuestionDTO(
        Integer id,
        Integer number,
        @NotNull
        Integer numberInContest,
        @NotNull
        String name,
        @NotNull
        String description,
        @NotNull
        String contestSlug
) {
}
