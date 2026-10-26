package com.iam.application;

import com.iam.common.Result;
import com.iam.common.SessionContext;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;

@Tag(name = "08 应用软件", description = "三个业务系统的个人权限说明")
@RestController
@RequestMapping("/api/applications")
public class ApplicationController {
    private final ApplicationService applicationService;

    public ApplicationController(ApplicationService applicationService) {
        this.applicationService = applicationService;
    }

    @Operation(summary = "应用软件列表", description = "固定返回 OA、IM、KM 三个系统")
    @GetMapping
    public Result list() {
        return Result.ok(applicationService.list());
    }

    @Operation(summary = "当前用户的应用权限", description = "按权限码组装自然语言描述")
    @GetMapping("/{sysCode}/my-permissions")
    public Result myPermissions(@PathVariable String sysCode) {
        return Result.ok(applicationService.myPermissions(SessionContext.userId(), sysCode));
    }
}
