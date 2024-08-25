package lcian.leetcode_cheater_detector.backend.model;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import org.springframework.boot.autoconfigure.condition.NoneNestedConditions;

import java.util.ArrayList;
import java.util.List;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString
@Builder
public class Plagiarism {
    @Id @GeneratedValue
    private Integer id;
    private Integer confidencePercentage;
    private String language;
    @ManyToMany(cascade = CascadeType.ALL)
    @NotNull
    private List<Submission> submissions = new ArrayList<>();
    @ManyToOne(cascade = CascadeType.ALL)
    @NotNull
    @JsonIgnore
    private DetectorRun detectorRun;

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public Integer getDetectorRunId(){
        return this.detectorRun.getId();
    }

}
