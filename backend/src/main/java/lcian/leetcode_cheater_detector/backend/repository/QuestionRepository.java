package lcian.leetcode_cheater_detector.backend.repository;

import lcian.leetcode_cheater_detector.backend.model.Question;
import org.springframework.data.jpa.repository.JpaRepository;

public interface QuestionRepository extends JpaRepository<Question, Integer> {
}
