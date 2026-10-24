package com.iam.permission;

import com.iam.common.BizException;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;

@Service
public class PermissionService {
    private final PermissionMapper permissionMapper;

    public PermissionService(PermissionMapper permissionMapper) {
        this.permissionMapper = permissionMapper;
    }

    public Map<String, Object> create(String sysCode, String sysName, String moduleName,
                                      String funcCode, String funcName, String action,
                                      String permCode, Integer sortNo) {
        if (blank(sysCode) || blank(sysName) || blank(moduleName) || blank(funcCode)
                || blank(funcName) || blank(action) || blank(permCode)) {
            throw new IllegalArgumentException("系统、模块、功能点、动作、权限码均不能为空");
        }

        String code = permCode.trim().toUpperCase(Locale.ROOT);
        if (!code.matches("^[A-Z0-9_]+(:[A-Z0-9_]+){1,3}$")) {
            throw new IllegalArgumentException("权限码格式应为 资源:动作，例如 USER:ADD");
        }
        if (permissionMapper.findByCode(code) != null) {
            throw new BizException(409, "权限码已存在：" + code);
        }

        permissionMapper.insert(sysCode.trim().toUpperCase(Locale.ROOT), sysName.trim(), moduleName.trim(),
                funcCode.trim(), funcName.trim(), action.trim().toUpperCase(Locale.ROOT), code,
                sortNo == null ? 999 : sortNo);

        PermissionMapper.PermRow p = permissionMapper.findByCode(code);
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", p.getId());
        m.put("sysCode", p.getSysCode());
        m.put("sysName", p.getSysName());
        m.put("moduleName", p.getModuleName());
        m.put("funcName", p.getFuncName());
        m.put("action", p.getAction());
        m.put("permCode", p.getPermCode());
        return m;
    }

    public void delete(long id) {
        if (permissionMapper.findById(id) == null) {
            throw new BizException(404, "权限不存在");
        }
        // 外键级联：删除后角色权限、用户直接权限一并解除
        permissionMapper.delete(id);
    }

    private boolean blank(String s) { return s == null || s.trim().isEmpty(); }
}
