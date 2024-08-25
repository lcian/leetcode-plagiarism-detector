package lcian.leetcode_cheater_detector.backend.repository;

import lcian.leetcode_cheater_detector.backend.model.Submission;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SubmissionRepository extends JpaRepository<Submission, Integer> {
}
