package com.iam.user;

import com.iam.common.RequirePerm;
import com.iam.common.Result;
import com.iam.common.SessionContext;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "02 用户管理", description = "用户 CRUD、启停、重置密码、角色分配")
@RestController
@RequestMapping("/api/users")
public class UserController {
    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    public record CreateReq(String account, String name, String phone) {}
    public record UpdateReq(String name, String phone) {}
    public record StatusReq(Integer status) {}
    public record RolesReq(List<Long> roleIds) {}

    @Operation(summary = "用户列表", description = "按工号或姓名模糊搜索，分页返回")
    @GetMapping
    @RequirePerm("USER:VIEW")
    public Result list(@RequestParam(defaultValue = "") String keyword,
                       @RequestParam(defaultValue = "1") int page,
                       @RequestParam(defaultValue = "20") int size) {
        return Result.ok(userService.page(keyword, page, size));
    }

    @Operation(summary = "用户详情")
    @GetMapping("/{id}")
    @RequirePerm("USER:VIEW")
    public Result detail(@PathVariable long id) {
        return Result.ok(userService.detail(id));
    }

    @Operation(summary = "新增用户", description = "工号唯一，初始密码由配置决定，创建后无角色")
    @PostMapping
    @RequirePerm("USER:ADD")
    public Result create(@RequestBody CreateReq req) {
        return Result.ok(userService.create(req.account(), req.name(), req.phone()));
    }

    @Operation(summary = "修改用户", description = "只允许改姓名与手机号")
    @PutMapping("/{id}")
    @RequirePerm("USER:EDIT")
    public Result update(@PathVariable long id, @RequestBody UpdateReq req) {
        return Result.ok(userService.update(id, req.name(), req.phone()));
    }

    @Operation(summary = "启用 / 停用", description = "停用会立即撤销该用户全部会话，且不能停用自己")
    @PutMapping("/{id}/status")
    @RequirePerm("USER:EDIT")
    public Result status(@PathVariable long id, @RequestBody StatusReq req) {
        userService.setStatus(id, req.status() == null ? 1 : req.status(), SessionContext.userId());
        return Result.ok();
    }

    @Operation(summary = "重置密码", description = "重置为初始密码，旧会话失效")
    @PutMapping("/{id}/password")
    @RequirePerm("USER:EDIT")
    public Result resetPassword(@PathVariable long id) {
        userService.resetPassword(id);
        return Result.ok();
    }

    @Operation(summary = "删除用户", description = "不能删除自己；关联的角色关系与会话级联删除")
    @DeleteMapping("/{id}")
    @RequirePerm("USER:DELETE")
    public Result delete(@PathVariable long id) {
        userService.delete(id, SessionContext.userId());
        return Result.ok();
    }

    @Operation(summary = "查看用户角色", description = "返回全部角色及勾选状态")
    @GetMapping("/{id}/roles")
    @RequirePerm("USER:VIEW")
    public Result roles(@PathVariable long id) {
        return Result.ok(userService.rolesOf(id));
    }

    @Operation(summary = "分配角色", description = "覆盖式保存；保存后该用户会话失效")
    @PutMapping("/{id}/roles")
    @RequirePerm("USER:ASSIGN_ROLE")
    public Result assignRoles(@PathVariable long id, @RequestBody RolesReq req) {
        userService.assignRoles(id, req.roleIds());
        return Result.ok();
    }
}
