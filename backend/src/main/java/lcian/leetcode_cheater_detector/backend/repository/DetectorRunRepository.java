package lcian.leetcode_cheater_detector.backend.repository;

import lcian.leetcode_cheater_detector.backend.model.DetectorRun;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DetectorRunRepository extends JpaRepository<DetectorRun, Integer> {
}
