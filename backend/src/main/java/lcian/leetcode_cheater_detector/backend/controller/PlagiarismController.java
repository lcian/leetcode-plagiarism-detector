package lcian.leetcode_cheater_detector.backend.controller;

import com.fasterxml.jackson.annotation.JsonInclude;
import lcian.leetcode_cheater_detector.backend.dto.PlagiarismDTO;
import lcian.leetcode_cheater_detector.backend.dto.PlagiarismMetadataDTO;
import lcian.leetcode_cheater_detector.backend.model.DetectorRun;
import lcian.leetcode_cheater_detector.backend.model.Plagiarism;
import lcian.leetcode_cheater_detector.backend.model.Submission;
import lcian.leetcode_cheater_detector.backend.repository.DetectorRunRepository;
import lcian.leetcode_cheater_detector.backend.repository.PlagiarismRepository;
import lcian.leetcode_cheater_detector.backend.repository.SubmissionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Example;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class PlagiarismController {

    private final PlagiarismRepository repository;
    private final DetectorRunRepository detectorRunRepository;
    private final SubmissionRepository submissionRepository;

    @GetMapping(value = "/plagiarismsMetadata", params = "detectorRunId")
    public List<PlagiarismMetadataDTO> getPlagiarismsMetadataByDetectorRunId(@RequestParam Integer detectorRunId){
        DetectorRun detectorRun = this.detectorRunRepository.findById(detectorRunId).get();
        Example<Plagiarism> example = Example.of(Plagiarism.builder().detectorRun(detectorRun).build());
        List<Plagiarism> plagiarisms = this.repository.findAll(example);
        return plagiarisms.stream().map(PlagiarismMetadataDTO::of).toList();
    }

    @GetMapping("/plagiarism/{id}")
    public Plagiarism getPlagiarism(@PathVariable Integer id){
        return this.repository.findById(id).get();
    }

    @PostMapping("/plagiarisms/bulk")
    public ResponseEntity<Void> addPlagiarisms(@RequestBody List<PlagiarismDTO> dtos){
        List<Plagiarism> plagiarisms = new ArrayList<>();
        for(PlagiarismDTO dto : dtos){
            DetectorRun detectorRun = this.detectorRunRepository.getById(dto.detectorRunId());
            List<Submission> submissions = this.submissionRepository.findAllById(dto.submissionIds());
            Plagiarism plagiarism = Plagiarism.builder()
                    .confidencePercentage(dto.confidencePercentage())
                    .submissions(submissions)
                    .detectorRun(detectorRun)
                    .language(dto.language())
                    .build();
            plagiarisms.add(plagiarism);
        }
        this.repository.saveAll(plagiarisms);
        return new ResponseEntity<>(HttpStatus.OK);
    }
}
