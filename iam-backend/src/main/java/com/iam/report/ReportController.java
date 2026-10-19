package com.iam.report;

import com.iam.common.RequirePerm;
import com.iam.common.Result;
import com.iam.common.SessionContext;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Tag(name = "05 业务演示", description = "证明业务菜单与按钮同样由权限码驱动")
@RestController
@RequestMapping("/api/report")
public class ReportController {
    @Operation(summary = "项目成本报表", description = "需要 FIN:RPT:VIEW；canExport 由 FIN:RPT:EXPORT 决定")
    @GetMapping("/cost")
    @RequirePerm("FIN:RPT:VIEW")
    public Result cost() {
        List<Map<String, Object>> rows = List.of(
                row("城北道路改造", 1200, 860, "71.7%", "正常"),
                row("跨江桥梁加固", 800, 905, "113.1%", "超支"),
                row("老城区管网更新", 560, 310, "55.4%", "正常"),
                row("主干道绿化提升", 300, 268, "89.3%", "预警"),
                row("智慧交通一期", 1500, 720, "48.0%", "正常"));
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("rows", rows);
        data.put("canExport", SessionContext.get() != null
                && SessionContext.get().perms().contains("FIN:RPT:EXPORT"));
        return Result.ok(data);
    }

    private Map<String, Object> row(String name, int budget, int actual, String rate, String status) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("name", name);
        m.put("budget", budget);
        m.put("actual", actual);
        m.put("rate", rate);
        m.put("status", status);
        return m;
    }
}
