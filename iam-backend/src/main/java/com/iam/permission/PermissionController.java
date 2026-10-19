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

    public PermissionController(PermissionMapper permissionMapper) {
        this.permissionMapper = permissionMapper;
    }

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
}
