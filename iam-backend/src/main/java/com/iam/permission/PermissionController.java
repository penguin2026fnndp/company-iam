package com.iam.permission;

import com.iam.common.RequirePerm;
import com.iam.common.Result;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Tag(name = "04 权限目录", description = "权限码查询与系统下拉")
@RestController
@RequestMapping("/api/permissions")
public class PermissionController {
    private final PermissionMapper permissionMapper;
    private final PermissionService permissionService;

    public PermissionController(PermissionMapper permissionMapper, PermissionService permissionService) {
        this.permissionMapper = permissionMapper;
        this.permissionService = permissionService;
    }

    public record CreateReq(String sysCode, String sysName, String moduleName, String funcCode,
                            String funcName, String action, String permCode, Integer sortNo) {}

    @Operation(summary = "权限列表", description = "按系统筛选、按权限码或功能名搜索")
    @GetMapping
    @RequirePerm("PERM:VIEW")
    public Result list(@RequestParam(defaultValue = "") String sysCode,
                       @RequestParam(defaultValue = "") String keyword) {
        List<Map<String, Object>> list = new ArrayList<>();
        for (PermissionMapper.PermRow p : permissionMapper.list(sysCode, keyword)) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", p.getId());
            m.put("sysCode", p.getSysCode());
            m.put("sysName", p.getSysName());
            m.put("moduleName", p.getModuleName());
            m.put("funcName", p.getFuncName());
            m.put("action", p.getAction());
            m.put("permCode", p.getPermCode());
            list.add(m);
        }
        return Result.ok(list);
    }

    @Operation(summary = "系统下拉")
    @GetMapping("/systems")
    @RequirePerm("PERM:VIEW")
    public Result systems() {
        return Result.ok(permissionMapper.systems());
    }

    @Operation(summary = "新增权限点", description = "权限码唯一；新增后可在角色矩阵中勾选")
    @PostMapping
    @RequirePerm("PERM:ADD")
    public Result create(@RequestBody CreateReq req) {
        return Result.ok(permissionService.create(req.sysCode(), req.sysName(), req.moduleName(),
                req.funcCode(), req.funcName(), req.action(), req.permCode(), req.sortNo()));
    }

    @Operation(summary = "删除权限点", description = "物理删除；角色权限与用户直接权限随外键级联解除")
    @DeleteMapping("/{id}")
    @RequirePerm("PERM:DELETE")
    public Result delete(@PathVariable long id) {
        permissionService.delete(id);
        return Result.ok();
    }
}
