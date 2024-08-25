package lcian.leetcode_cheater_detector.backend.controller;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
public class SPAController {

    @RequestMapping(value = { "/", "/{x:[\\w\\-]+}", "/{x:^(?!api$).*$}/*/{y:[\\w\\-]+}","/error"  })
    public String getIndex(HttpServletRequest request) {
        return "index.html";
    }
}
