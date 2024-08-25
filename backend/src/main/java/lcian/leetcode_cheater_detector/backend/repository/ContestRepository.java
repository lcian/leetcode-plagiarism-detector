package lcian.leetcode_cheater_detector.backend.repository;

import lcian.leetcode_cheater_detector.backend.model.Contest;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ContestRepository extends JpaRepository<Contest, Integer> {
}
