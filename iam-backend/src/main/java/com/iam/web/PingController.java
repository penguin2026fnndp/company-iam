package com.iam.web;

import com.iam.common.Result;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@Tag(name = "00 健康检查")
@RestController
public class PingController {
    @Operation(summary = "存活探针")
    @GetMapping("/api/ping")
    public Result ping() {
        return Result.ok(Map.of("status", "up", "app", "iam-backend"));
    }
}
