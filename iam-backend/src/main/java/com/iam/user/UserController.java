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
    public record UpdateReq(String name, String phone, Long departmentId) {}
    public record StatusReq(Integer status) {}
    public record RolesReq(List<Long> roleIds) {}
    public record DirectPermsReq(List<Long> permissionIds) {}

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

    @Operation(summary = "修改用户", description = "可修改姓名、手机号与所属部门；部门 ID 必须真实存在")
    @PutMapping("/{id}")
    @RequirePerm("USER:EDIT")
    public Result update(@PathVariable long id, @RequestBody UpdateReq req) {
        return Result.ok(userService.update(id, req.name(), req.phone(), req.departmentId()));
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

    @Operation(summary = "分配角色", description = "覆盖式保存；仅 ROLE:ASSIGN 可调用")
    @PostMapping("/{id}/roles")
    @RequirePerm("ROLE:ASSIGN")
    public Result assignRoles(@PathVariable long id, @RequestBody RolesReq req) {
        userService.assignRoles(id, req.roleIds(), SessionContext.userId());
        return Result.ok();
    }

    @Operation(summary = "分配角色（兼容旧调用）", description = "覆盖式保存；仅 ROLE:ASSIGN 可调用")
    @PutMapping("/{id}/roles")
    @RequirePerm("ROLE:ASSIGN")
    public Result replaceRoles(@PathVariable long id, @RequestBody RolesReq req) {
        userService.assignRoles(id, req.roleIds(), SessionContext.userId());
        return Result.ok();
    }

    @Operation(summary = "剥夺单个角色", description = "仅 ROLE:ASSIGN 可调用；成功后踢会话并写审计")
    @DeleteMapping("/{id}/roles/{roleId}")
    @RequirePerm("ROLE:ASSIGN")
    public Result removeRole(@PathVariable long id, @PathVariable long roleId) {
        userService.revokeRole(id, roleId, SessionContext.userId());
        return Result.ok();
    }

    @Operation(summary = "查看用户直接权限", description = "只返回 sys_user_permission 中的直接授权，不含角色权限")
    @GetMapping("/{id}/permissions")
    @RequirePerm("USER:EDIT")
    public Result directPermissions(@PathVariable long id) {
        return Result.ok(userService.directPermissions(id));
    }

    @Operation(summary = "全量覆盖用户直接权限", description = "先清空再写入；成功后强制该用户下线")
    @PostMapping("/{id}/permissions")
    @RequirePerm("USER:EDIT")
    public Result replaceDirectPermissions(@PathVariable long id, @RequestBody DirectPermsReq req) {
        userService.replaceDirectPermissions(id, req.permissionIds());
        return Result.ok();
    }

    @Operation(summary = "剥夺单条直接权限", description = "成功后强制该用户下线")
    @DeleteMapping("/{id}/permissions/{permId}")
    @RequirePerm("USER:EDIT")
    public Result revokeDirectPermission(@PathVariable long id, @PathVariable long permId) {
        userService.revokeDirectPermission(id, permId);
        return Result.ok();
    }
}
