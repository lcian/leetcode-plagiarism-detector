package lcian.leetcode_cheater_detector.backend.controller;

import jakarta.websocket.server.PathParam;
import lcian.leetcode_cheater_detector.backend.dto.QuestionDTO;
import lcian.leetcode_cheater_detector.backend.model.Contest;
import lcian.leetcode_cheater_detector.backend.model.Question;
import lcian.leetcode_cheater_detector.backend.repository.ContestRepository;
import lcian.leetcode_cheater_detector.backend.repository.QuestionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Example;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class QuestionController {

    private final QuestionRepository repository;
    private final ContestRepository contestRepository;

    @GetMapping("/questions/bulk")
    public List<Question> getQuestions() {
        return this.repository.findAll();
    }

    @GetMapping(value = "/question/{id}")
    public Question getQuestionsById(@PathVariable Integer id) {
        return this.repository.findById(id).get();
    }

    @GetMapping(value = "/questions", params = "contestSlug")
    public List<Question> getQuestionsByContest(@RequestParam String contestSlug) {
        Example<Contest> example = Example.of(Contest.builder().slug(contestSlug).build());
        return contestRepository.findOne(example).get().getQuestions();
    }

    @PostMapping("/question")
    public ResponseEntity<Void> addQuestion(@RequestBody QuestionDTO dto) {
        Example<Contest> contestExample = Example.of(Contest.builder().slug(dto.contestSlug()).build());
        Question question = Question.builder()
                .name(dto.name())
                .description(dto.description())
                .numberInContest(dto.numberInContest())
                .contest(this.contestRepository.findOne(contestExample).get())
                .build();
        if (dto.id() != null){
            question.setId(dto.id());
        }
        if (dto.number() != null){
            question.setNumber(dto.number());
        }
        this.repository.save(question);
        return new ResponseEntity<>(HttpStatus.OK);
    }

    @PatchMapping("/question")
    public ResponseEntity<Void> editQuestion(@RequestBody QuestionDTO dto) {
        Example<Question> example = Example.of(Question.builder().name(dto.name()).build());
        Question question = this.repository.findOne(example).get();
        if (dto.number() != null) {
            question.setNumber(dto.number());
        }
        question.setNumberInContest(dto.numberInContest());
        question.setName(dto.name());
        question.setDescription(dto.description());
        Example<Contest> contestExample = Example.of(Contest.builder().slug(dto.contestSlug()).build());
        question.setContest(this.contestRepository.findOne(contestExample).get());
        this.repository.save(question);
        return new ResponseEntity<>(HttpStatus.OK);
    }
}
