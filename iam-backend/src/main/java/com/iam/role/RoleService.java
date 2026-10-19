package com.iam.role;

import com.iam.common.BizException;
import com.iam.common.SessionContext;
import com.iam.common.SessionMapper;
import com.iam.permission.PermissionMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.regex.Pattern;

@Service
public class RoleService {
    private static final Pattern CODE = Pattern.compile("^[A-Z][A-Z0-9_]{1,31}$");
    private static final Logger log = LoggerFactory.getLogger(RoleService.class);

    private final RoleMapper roleMapper;
    private final PermissionMapper permissionMapper;
    private final SessionMapper sessionMapper;

    public RoleService(RoleMapper roleMapper, PermissionMapper permissionMapper, SessionMapper sessionMapper) {
        this.roleMapper = roleMapper;
        this.permissionMapper = permissionMapper;
        this.sessionMapper = sessionMapper;
    }

    public List<Map<String, Object>> list(String keyword) {
        return roleMapper.list(keyword == null ? "" : keyword.trim());
    }

    public Map<String, Object> detail(long id) {
        Map<String, Object> role = roleMapper.findById(id);
        if (role == null) { throw new BizException(404, "角色不存在"); }
        Map<String, Object> data = new LinkedHashMap<>(role);
        data.put("members", roleMapper.members(id));
        return data;
    }

    public Map<String, Object> create(String code, String name, String remark) {
        code = code == null ? "" : code.trim().toUpperCase();
        name = name == null ? "" : name.trim();
        if (!CODE.matcher(code).matches()) { throw new BizException(400, "角色编码需大写字母开头，2–32 位"); }
        if (name.isEmpty()) { throw new BizException(400, "角色名称不能为空"); }
        if (roleMapper.findByCode(code) != null) { throw new BizException(409, "角色编码已存在"); }

        roleMapper.insert(code, name, remark);
        Map<String, Object> created = roleMapper.findByCode(code);
        return detail(((Number) created.get("id")).longValue());
    }

    public Map<String, Object> update(long id, String name, String remark, Integer status) {
        Map<String, Object> role = roleMapper.findById(id);
        if (role == null) { throw new BizException(404, "角色不存在"); }
        String newName = name == null ? String.valueOf(role.get("name")) : name.trim();
        int st = status == null ? ((Number) role.get("status")).intValue() : (status == 0 ? 0 : 1);
        roleMapper.update(id, newName, remark, st);
        if (st == 0) { sessionMapper.revokeByRole(id); }
        return detail(id);
    }

    public void delete(long id) {
        if (roleMapper.findById(id) == null) { throw new BizException(404, "角色不存在"); }
        if (roleMapper.memberCount(id) > 0) { throw new BizException(409, "仍有成员使用该角色，不能删除"); }
        roleMapper.delete(id);
    }

    public Map<String, Object> permissions(long roleId) {
        Map<String, Object> role = roleMapper.findById(roleId);
        if (role == null) { throw new BizException(404, "角色不存在"); }

        Set<Long> checked = new HashSet<>(roleMapper.permIds(roleId));
        List<Map<String, Object>> list = new ArrayList<>();
        for (PermissionMapper.PermRow p : permissionMapper.list("", "")) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", p.getId());
            m.put("sysCode", p.getSysCode());
            m.put("sysName", p.getSysName());
            m.put("moduleName", p.getModuleName());
            m.put("funcName", p.getFuncName());
            m.put("permCode", p.getPermCode());
            m.put("action", p.getAction());
            m.put("checked", checked.contains(p.getId()));
            list.add(m);
        }
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("role", role);
        data.put("permissions", list);
        return data;
    }

    @Transactional
    public void savePermissions(long roleId, List<Long> permissionIds) {
        if (roleMapper.findById(roleId) == null) { throw new BizException(404, "角色不存在"); }
        List<Long> ids = permissionIds == null ? List.of() : permissionIds;
        for (Long pid : ids) {
            if (pid != null && permissionMapper.countById(pid) == 0) {
                throw new IllegalArgumentException("权限不存在：" + pid);
            }
        }
        roleMapper.clearPermissions(roleId);
        for (Long pid : ids) {
            if (pid != null) { roleMapper.addPermission(roleId, pid); }
        }
        sessionMapper.revokeByRole(roleId);
        log.info("AUDIT role-perm operator={} roleId={} permIds={}", SessionContext.userId(), roleId, ids);
    }
}
