package lcian.leetcode_cheater_detector.backend.controller;

import lcian.leetcode_cheater_detector.backend.model.Contest;
import lcian.leetcode_cheater_detector.backend.repository.ContestRepository;
import lombok.RequiredArgsConstructor;
import org.hibernate.cache.spi.support.AbstractReadWriteAccess;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;

@RestController
@RequiredArgsConstructor
public class ContestController {

    private final ContestRepository repository;

    @GetMapping("/contests/bulk")
    public List<Contest> getContests(){
        return this.repository.findAll();
    }

    @GetMapping("/contest/{id}")
    public Contest getContestById(@PathVariable Integer id){
        return this.repository.findById(id).get();
    }

    @PostMapping("/contests")
    public Contest addContest(@ModelAttribute Contest contest){
        if (contest.getQuestions() == null){
            contest.setQuestions(new ArrayList<>());
        }
        this.repository.save(contest);
        return contest;
    }

}
