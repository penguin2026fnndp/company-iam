package com.iam.auth;

import com.iam.common.Result;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

@Tag(name = "01 认证", description = "登录、登出、当前用户与权限菜单")
@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    public record LoginReq(String account, String password) {}

    @Operation(summary = "登录", description = "工号 + 密码；连续失败 5 次锁定 15 分钟；会话当日 23:59:59 到期")
    @PostMapping("/login")
    public Result login(@RequestBody LoginReq req, HttpServletRequest http) {
        String ip = http.getRemoteAddr();
        String ua = http.getHeader("User-Agent");
        return Result.ok(authService.login(req.account(), req.password(), ip, ua));
    }

    @Operation(summary = "登出", description = "撤销当前会话")
    @PostMapping("/logout")
    public Result logout() {
        authService.logout();
        return Result.ok();
    }

    @Operation(summary = "当前用户", description = "返回用户、角色、权限码与菜单")
    @GetMapping("/me")
    public Result me() {
        return Result.ok(authService.me());
    }
}
