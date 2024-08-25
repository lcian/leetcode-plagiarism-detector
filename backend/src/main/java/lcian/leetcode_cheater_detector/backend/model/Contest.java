package lcian.leetcode_cheater_detector.backend.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString
@Builder
public class Contest {
    @Id
    @NotNull
    private Integer id;
    @NotNull
    private String slug;
    @OneToMany(mappedBy = "contest")
    @JsonIgnore
    private List<Question> questions = new ArrayList<Question>();

    public Contest(Integer id, String slug) {
        this.id = id;
        this.slug = slug;
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public List<Integer> getQuestionIds(){
        return this.questions.stream().map(Question::getId).toList();
    }
}
