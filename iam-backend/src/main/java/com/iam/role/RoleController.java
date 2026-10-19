package com.iam.role;

import com.iam.common.RequirePerm;
import com.iam.common.Result;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "03 角色管理", description = "角色 CRUD 与角色权限矩阵")
@RestController
@RequestMapping("/api/roles")
public class RoleController {
    private final RoleService roleService;

    public RoleController(RoleService roleService) {
        this.roleService = roleService;
    }

    public record CreateReq(String code, String name, String remark) {}
    public record UpdateReq(String name, String remark, Integer status) {}
    public record PermsReq(List<Long> permissionIds) {}

    @Operation(summary = "角色列表", description = "带成员数与权限数")
    @GetMapping
    @RequirePerm("ROLE:VIEW")
    public Result list(@RequestParam(defaultValue = "") String keyword) {
        return Result.ok(roleService.list(keyword));
    }

    @Operation(summary = "角色详情")
    @GetMapping("/{id}")
    @RequirePerm("ROLE:VIEW")
    public Result detail(@PathVariable long id) {
        return Result.ok(roleService.detail(id));
    }

    @Operation(summary = "新增角色", description = "编码唯一，大写字母开头")
    @PostMapping
    @RequirePerm("ROLE:ADD")
    public Result create(@RequestBody CreateReq req) {
        return Result.ok(roleService.create(req.code(), req.name(), req.remark()));
    }

    @Operation(summary = "修改角色", description = "停用角色会撤销其持有人会话")
    @PutMapping("/{id}")
    @RequirePerm("ROLE:EDIT")
    public Result update(@PathVariable long id, @RequestBody UpdateReq req) {
        return Result.ok(roleService.update(id, req.name(), req.remark(), req.status()));
    }

    @Operation(summary = "删除角色", description = "仍有成员时拒绝删除")
    @DeleteMapping("/{id}")
    @RequirePerm("ROLE:DELETE")
    public Result delete(@PathVariable long id) {
        roleService.delete(id);
        return Result.ok();
    }

    @Operation(summary = "查看角色权限", description = "按功能点返回勾选状态")
    @GetMapping("/{id}/permissions")
    @RequirePerm("ROLE:VIEW")
    public Result permissions(@PathVariable long id) {
        return Result.ok(roleService.permissions(id));
    }

    @Operation(summary = "保存角色权限", description = "覆盖式保存；该角色下所有用户会话失效")
    @PutMapping("/{id}/permissions")
    @RequirePerm("ROLE:ASSIGN_PERM")
    public Result savePermissions(@PathVariable long id, @RequestBody PermsReq req) {
        roleService.savePermissions(id, req.permissionIds());
        return Result.ok();
    }
}
