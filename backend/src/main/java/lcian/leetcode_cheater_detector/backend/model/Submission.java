package lcian.leetcode_cheater_detector.backend.model;

import com.fasterxml.jackson.annotation.*;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString
@Builder(access = AccessLevel.PUBLIC)
public class Submission {
    @Id
    @NotNull
    private Integer id;
    @Column(columnDefinition = "VARCHAR")
    @NotNull
    private String code;
    @NotNull
    private String language;
    @NotNull
    private Integer date;
    @NotNull
    private String userSlug;
    @NotNull
    private Integer page;
    @ManyToOne(cascade = CascadeType.ALL)
    @NotNull
    @JsonIgnore
    private Question question;
    @ManyToMany(mappedBy = "submissions")
    @NotNull
    @JsonIgnore
    private List<Plagiarism> plagiarisms = new ArrayList<>();
    @OneToMany(mappedBy = "referenceSubmission")
    @NotNull
    @JsonIgnore
    private List<DetectorRun> detectorRuns = new ArrayList<>();

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public Integer getQuestionId(){
        return this.question.getId();
    }
}
