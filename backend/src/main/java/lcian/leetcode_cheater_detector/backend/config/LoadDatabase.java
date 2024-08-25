package lcian.leetcode_cheater_detector.backend.config;

import lcian.leetcode_cheater_detector.backend.model.*;
import lcian.leetcode_cheater_detector.backend.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
class LoadDatabase {

    private static final Logger log = LoggerFactory.getLogger(LoadDatabase.class);

    @Bean
    CommandLineRunner initDatabase(
            ContestRepository contestRepository,
            QuestionRepository questionRepository,
            SubmissionRepository submissionRepository,
            PlagiarismRepository plagiarismRepository,
            DetectorRunRepository detectorRunRepository
            ) {
        return args -> {
           // Contest contest = new Contest();
           // contest.setId(1057);
           // contest.setSlug("weekly-contest-x");

           // Question question = new Question();
           // question.setId(10);
           // question.setName("ciao");
           // question.setDescription("write a shellcode");
           // question.setNumberInContest(3);
           // question.setContest(contest);

           // Submission submission = new Submission();
           // submission.setId(1);
           // submission.setQuestion(question);
           // submission.setUserSlug("cianotico");
           // submission.setCode("import os\nos.system(\"/bin/sh\")\n");
           // submission.setDate(0);
           // submission.setLanguage("python3");

           // DetectorRun detectorRun = new DetectorRun();
           // detectorRun.setDetector("Lorenzo");
           // detectorRun.setParameters("intuition: 1e10");
           // detectorRun.setQuestion(question);
           // detectorRun.setReferenceSubmission(submission);

           // Plagiarism plagiarism = new Plagiarism();
           // plagiarism.setSubmission(submission);
           // plagiarism.setConfidencePercentage(50);
           // plagiarism.setDetectorRun(detectorRun);
           // plagiarismRepository.save(plagiarism);
        };
    }
}
