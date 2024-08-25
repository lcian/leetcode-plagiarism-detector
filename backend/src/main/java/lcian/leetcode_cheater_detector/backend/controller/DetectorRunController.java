package lcian.leetcode_cheater_detector.backend.controller;

import lcian.leetcode_cheater_detector.backend.dto.DetectorRunDTO;
import lcian.leetcode_cheater_detector.backend.model.DetectorRun;
import lcian.leetcode_cheater_detector.backend.model.Question;
import lcian.leetcode_cheater_detector.backend.repository.DetectorRunRepository;
import lcian.leetcode_cheater_detector.backend.repository.QuestionRepository;
import lcian.leetcode_cheater_detector.backend.repository.SubmissionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Example;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class DetectorRunController {

    private final DetectorRunRepository repository;
    private final QuestionRepository questionRepository;
    private final SubmissionRepository submissionRepository;

    @GetMapping(value = "/detectorRuns", params = "questionName")
    public List<DetectorRun> getDetectorRunsByQuestion(@RequestParam String questionName) {
        Example<Question> question = Example.of(Question.builder().name(questionName).build());
        return this.questionRepository.findOne(question).get().getDetectorRuns();
    }


    @GetMapping("/detectorRuns/bulk")
    public List<DetectorRun> getDetectorRuns() {
        return this.repository.findAll();
    }


    @GetMapping("/detectorRuns/{id}")
    public DetectorRun getDetectorRun(@PathVariable Integer id) {
        return this.repository.findById(id).get();
    }

    @PostMapping("/detectorRuns")
    public ResponseEntity<DetectorRun> addDetectorRun(@RequestBody DetectorRunDTO dto) {
        Question question = this.questionRepository.getById(dto.questionId());
        DetectorRun detectorRun = DetectorRun.builder()
                .detector(dto.detector())
                .parameters(dto.parameters())
                .question(question)
                .build();
        if (dto.referenceSubmissionId() != null) {
            detectorRun.setReferenceSubmission(submissionRepository.getById(dto.referenceSubmissionId()));
        }
        detectorRun = repository.save(detectorRun);
        return new ResponseEntity<>(detectorRun, HttpStatus.OK);
    }
}
