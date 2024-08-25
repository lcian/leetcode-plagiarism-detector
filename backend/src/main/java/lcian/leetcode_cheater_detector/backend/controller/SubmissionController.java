package lcian.leetcode_cheater_detector.backend.controller;

import lcian.leetcode_cheater_detector.backend.dto.SubmissionDTO;
import lcian.leetcode_cheater_detector.backend.model.Question;
import lcian.leetcode_cheater_detector.backend.model.Submission;
import lcian.leetcode_cheater_detector.backend.repository.QuestionRepository;
import lcian.leetcode_cheater_detector.backend.repository.SubmissionRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Example;
import org.springframework.data.domain.ExampleMatcher;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;

@RestController
@RequiredArgsConstructor
public class SubmissionController {

    private final SubmissionRepository repository;
    private final QuestionRepository questionRepository;

    @GetMapping("/submissions/bulk")
    public List<Submission> getSubmissions(){
        return this.repository.findAll();
    }

    @GetMapping(value = "/submissions/bulk", params = "questionId")
    public List<Submission> getSubmissionsByQuestion(@RequestParam Integer questionId){
        return questionRepository.getById(questionId).getSubmissions();
    }

    @PostMapping("/submissions/bulk")
    public ResponseEntity<Void> addSubmissions(@RequestBody List<SubmissionDTO> submissionDTOs){
        List<Submission> submissions = new ArrayList<>();
        for (SubmissionDTO dto : submissionDTOs){
            Submission submission = Submission.builder()
                    .id(dto.id())
                    .date(dto.date())
                    .code(dto.code())
                    .language(dto.language())
                    .page(dto.page())
                    .userSlug(dto.userSlug())
                    .question(this.questionRepository.findById(dto.questionId()).get())
                    .build();
            submissions.add(submission);
        }
        this.repository.saveAll(submissions);
        return new ResponseEntity<>(HttpStatus.OK);
    }
}
