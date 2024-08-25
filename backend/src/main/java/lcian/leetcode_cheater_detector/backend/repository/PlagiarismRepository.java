package lcian.leetcode_cheater_detector.backend.repository;

import lcian.leetcode_cheater_detector.backend.model.Plagiarism;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PlagiarismRepository extends JpaRepository<Plagiarism, Integer> {
}
