package com.iam.audit;

import com.iam.common.RequirePerm;
import com.iam.common.Result;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;

@Tag(name = "09 审计日志", description = "角色变更与权限审批留痕")
@RestController
@RequestMapping("/api/audits")
public class AuditController {
    private final AuditService auditService;

    public AuditController(AuditService auditService) {
        this.auditService = auditService;
    }

    @Operation(summary = "分页查询审计日志")
    @GetMapping
    @RequirePerm("AUDIT:VIEW")
    public Result page(@RequestParam(defaultValue = "1") int page,
                       @RequestParam(defaultValue = "20") int size) {
        return Result.ok(auditService.page(page, size));
    }
}
