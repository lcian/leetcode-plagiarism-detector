package lcian.leetcode_cheater_detector.backend.model;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString
@Builder
public class Question {
    @Id
    private Integer id; // internal ID
    private Integer number; // number in question name
    private Integer numberInContest;
    private String name;
    @Column(columnDefinition = "VARCHAR")
    private String description;
    @ManyToOne(cascade = CascadeType.ALL)
    @JsonIgnore
    private Contest contest;
    @OneToMany(mappedBy = "question")
    @JsonIgnore
    private List<Submission> submissions = new ArrayList<>();
    @OneToMany(mappedBy = "question")
    @JsonIgnore
    private List<DetectorRun> detectorRuns = new ArrayList<>();

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public List<Integer> getDetectorRunIds(){
        return this.detectorRuns.stream().map(DetectorRun::getId).toList();
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public Integer getContestId() {
        return this.contest.getId();
    }
}
