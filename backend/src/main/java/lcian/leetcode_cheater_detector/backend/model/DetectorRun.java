package lcian.leetcode_cheater_detector.backend.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.persistence.*;
import lcian.leetcode_cheater_detector.backend.dto.PlagiarismMetadataDTO;
import lombok.*;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;

import java.util.ArrayList;
import java.util.List;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString
@Builder
public class DetectorRun {
    @Id @GeneratedValue
    private Integer id;
    private String detector;
    private String parameters;
    @ManyToOne(cascade = CascadeType.ALL)
    @JsonIgnore
    private Question question;
    @OneToMany(mappedBy = "detectorRun")
    @JsonIgnore
    private List<Plagiarism> plagiarisms = new ArrayList<>();
    @ManyToOne(cascade = CascadeType.ALL)
    @JsonIgnore
    private Submission referenceSubmission;

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public Integer getReferenceSubmissionId(){
        if (this.referenceSubmission == null){
            return null;
        }
        return this.referenceSubmission.getId();
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public Integer getQuestionId(){
        return this.question.getId();
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public Integer getPlagiarismGroupsCount() {
        return this.plagiarisms.size();
    }
}
