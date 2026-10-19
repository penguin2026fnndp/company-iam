package com.iam.user;

import com.iam.common.BizException;
import com.iam.common.SessionContext;
import com.iam.common.SessionMapper;
import com.iam.role.RoleMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.regex.Pattern;

@Service
public class UserService {
    private static final Pattern ACCOUNT = Pattern.compile("^[A-Za-z0-9]{6,32}$");
    private static final Logger log = LoggerFactory.getLogger(UserService.class);

    private final UserMapper userMapper;
    private final SessionMapper sessionMapper;
    private final PasswordEncoder passwordEncoder;
    private final RoleMapper roleMapper;

    @Value("${iam.password.initial:123456}")
    private String initialPassword;

    public UserService(UserMapper userMapper, SessionMapper sessionMapper,
                       PasswordEncoder passwordEncoder, RoleMapper roleMapper) {
        this.userMapper = userMapper;
        this.sessionMapper = sessionMapper;
        this.passwordEncoder = passwordEncoder;
        this.roleMapper = roleMapper;
    }

    public Map<String, Object> page(String keyword, int page, int size) {
        String kw = keyword == null ? "" : keyword.trim();
        int p = Math.max(page, 1);
        int s = Math.min(Math.max(size, 1), 100);
        long total = userMapper.count(kw);
        List<Map<String, Object>> list = new ArrayList<>();
        for (UserMapper.UserRow u : userMapper.page(kw, (p - 1) * s, s)) {
            list.add(view(u));
        }
        return ResultMap.of(total, p, s, list);
    }

    public Map<String, Object> detail(long id) {
        UserMapper.UserRow u = userMapper.findById(id);
        if (u == null) { throw new BizException(404, "用户不存在"); }
        Map<String, Object> data = view(u);
        data.put("roles", userMapper.rolesOf(id));
        return data;
    }

    public Map<String, Object> create(String account, String name, String phone) {
        account = account == null ? "" : account.trim();
        name = name == null ? "" : name.trim();
        if (!ACCOUNT.matcher(account).matches()) { throw new BizException(400, "工号需为 6–32 位字母或数字"); }
        if (name.isEmpty()) { throw new BizException(400, "姓名不能为空"); }
        if (userMapper.findByAccount(account) != null) { throw new BizException(409, "工号已存在"); }

        UserMapper.UserRow row = new UserMapper.UserRow();
        row.setAccount(account);
        row.setName(name);
        row.setPhone(emptyToNull(phone));
        row.setPasswordHash(passwordEncoder.encode(initialPassword));
        row.setStatus(1);
        userMapper.insert(row);

        return detail(userMapper.findByAccount(account).getId());
    }

    public Map<String, Object> update(long id, String name, String phone) {
        if (userMapper.findById(id) == null) { throw new BizException(404, "用户不存在"); }
        if (name == null || name.isBlank()) { throw new BizException(400, "姓名不能为空"); }
        userMapper.update(id, name.trim(), emptyToNull(phone));
        return detail(id);
    }

    public void setStatus(long id, int status, long operatorId) {
        if (id == operatorId) { throw new BizException(400, "不能停用自己的账号"); }
        if (userMapper.findById(id) == null) { throw new BizException(404, "用户不存在"); }
        userMapper.updateStatus(id, status == 0 ? 0 : 1);
        if (status == 0) { sessionMapper.revokeByUser(id); }
        log.info("AUDIT user-status operator={} target={} status={}", operatorId, id, status);
    }

    public void resetPassword(long id) {
        if (userMapper.findById(id) == null) { throw new BizException(404, "用户不存在"); }
        userMapper.updatePassword(id, passwordEncoder.encode(initialPassword));
        sessionMapper.revokeByUser(id);
        log.info("AUDIT password-reset operator={} target={}", SessionContext.userId(), id);
    }

    public void delete(long id, long operatorId) {
        if (id == operatorId) { throw new BizException(400, "不能删除当前登录账号"); }
        if (userMapper.findById(id) == null) { throw new BizException(404, "用户不存在"); }
        userMapper.delete(id);
    }

    @Transactional
    public void assignRoles(long userId, List<Long> roleIds) {
        if (userMapper.findById(userId) == null) { throw new BizException(404, "用户不存在"); }
        List<Long> ids = roleIds == null ? List.of() : roleIds;
        for (Long rid : ids) {
            if (rid != null && roleMapper.countById(rid) == 0) {
                throw new IllegalArgumentException("角色不存在：" + rid);
            }
        }
        userMapper.clearRoles(userId);
        for (Long rid : ids) {
            if (rid != null) { userMapper.addRole(userId, rid); }
        }
        sessionMapper.revokeByUser(userId);
        log.info("AUDIT role-assign operator={} target={} roleIds={}", SessionContext.userId(), userId, ids);
    }

    /** 用户角色勾选列表；用户不存在时返回 404，而不是全 false */
    public List<Map<String, Object>> rolesOf(long userId) {
        if (userMapper.findById(userId) == null) { throw new BizException(404, "用户不存在"); }
        List<Map<String, Object>> all = roleMapper.list("");
        List<Long> owned = userMapper.roleIdsOf(userId);
        for (Map<String, Object> r : all) {
            Number n = (Number) r.get("id");
            r.put("checked", n != null && owned.contains(n.longValue()));
        }
        return all;
    }

    private Map<String, Object> view(UserMapper.UserRow u) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", u.getId());
        m.put("account", u.getAccount());
        m.put("name", u.getName());
        m.put("phone", u.getPhone());
        m.put("status", u.getStatus());
        m.put("roleNames", u.getRoleNames() == null ? "—" : u.getRoleNames());
        m.put("permCount", u.getPermCount() == null ? 0 : u.getPermCount());
        m.put("createdAt", u.getCreatedAt() == null ? null : u.getCreatedAt().toString().replace('T', ' '));
        return m;
    }

    private String emptyToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }

    private static final class ResultMap {
        static Map<String, Object> of(long total, int page, int size, List<Map<String, Object>> list) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("total", total);
            m.put("page", page);
            m.put("size", size);
            m.put("list", list);
            return m;
        }
    }
}
