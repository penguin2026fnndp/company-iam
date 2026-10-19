package com.iam.apply;

import com.iam.common.RequirePerm;
import com.iam.common.Result;
import com.iam.common.SessionContext;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;

@Tag(name = "06 权限申请", description = "提交申请、待办、审批（通过后自动授权）")
@RestController
@RequestMapping("/api/applies")
public class ApplyController {
    private final ApplyService applyService;

    public ApplyController(ApplyService applyService) {
        this.applyService = applyService;
    }

    public record SubmitReq(String targetType, Long targetId, String reason) {}
    public record DecideReq(String action, String comment) {}

    @Operation(summary = "提交申请", description = "targetType=ROLE 申请角色；targetType=PERM 申请单个权限。登录即可调用")
    @PostMapping
    public Result submit(@RequestBody SubmitReq req) {
        return Result.ok(applyService.submit(SessionContext.userId(), req.targetType(), req.targetId(), req.reason()));
    }

    @Operation(summary = "我的申请", description = "当前登录人的全部申请记录")
    @GetMapping("/mine")
    public Result mine() {
        return Result.ok(applyService.mine(SessionContext.userId()));
    }

    @Operation(summary = "待审批列表", description = "默认查 status=0；需要 APPLY:APPROVE")
    @GetMapping
    @RequirePerm("APPLY:APPROVE")
    public Result pending(@RequestParam(defaultValue = "0") int status) {
        return Result.ok(applyService.byStatus(status));
    }

    @Operation(summary = "审批", description = "APPROVE 通过并自动授权；REJECT 驳回必须填原因")
    @PutMapping("/{id}/decide")
    @RequirePerm("APPLY:APPROVE")
    public Result decide(@PathVariable long id, @RequestBody DecideReq req) {
        return Result.ok(applyService.decide(id, req.action(), req.comment(), SessionContext.userId()));
    }
}
