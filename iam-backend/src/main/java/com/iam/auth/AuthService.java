package com.iam.auth;

import com.iam.common.*;
import com.iam.permission.PermissionMapper;
import com.iam.user.UserMapper;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.*;

@Service
public class AuthService {
    private final UserMapper userMapper;
    private final SessionMapper sessionMapper;
    private final PermissionMapper permissionMapper;
    private final PasswordEncoder passwordEncoder;
    private final LoginGuard loginGuard;

    public AuthService(UserMapper userMapper, SessionMapper sessionMapper,
                       PermissionMapper permissionMapper, PasswordEncoder passwordEncoder,
                       LoginGuard loginGuard) {
        this.userMapper = userMapper;
        this.sessionMapper = sessionMapper;
        this.permissionMapper = permissionMapper;
        this.passwordEncoder = passwordEncoder;
        this.loginGuard = loginGuard;
    }

    public Map<String, Object> login(String account, String password, String ip, String ua) {
        if (account == null || account.isBlank() || password == null || password.isEmpty()) {
            throw new BizException(400, "请输入工号和密码");
        }
        String acc = account.trim();
        long locked = loginGuard.lockedMillis(acc);
        if (locked > 0) {
            throw new BizException(429, "账号已锁定，请 " + Math.max(1, locked / 60000) + " 分钟后重试");
        }

        UserMapper.UserRow user = userMapper.findByAccount(acc);
        if (user == null || !passwordEncoder.matches(password, user.getPasswordHash())) {
            int left = loginGuard.fail(acc);
            if (left < 0) {
                throw new BizException(429, "连续失败 5 次，账号锁定 15 分钟");
            }
            throw new BizException(401, "账号或密码不正确，还可尝试 " + left + " 次");
        }
        if (user.getStatus() == null || user.getStatus() == 0) {
            throw new BizException(403, "账号已停用");
        }
        loginGuard.success(acc);

        String token = UUID.randomUUID().toString();
        LocalDateTime expireAt = LocalDate.now(ZoneId.of("Asia/Shanghai")).atTime(23, 59, 59);
        sessionMapper.create(token, user.getId(), expireAt, ip, ua);

        Map<String, Object> data = profile(user.getId());
        data.put("sessionId", token);
        data.put("expireAt", expireAt.toString().replace('T', ' '));
        return data;
    }

    public Map<String, Object> me() {
        return profile(SessionContext.userId());
    }

    public void logout() {
        SessionContext.Current c = SessionContext.get();
        if (c != null && c.token() != null) {
            sessionMapper.revoke(c.token());
        }
    }

    public Map<String, Object> profile(long userId) {
        UserMapper.UserRow user = userMapper.findById(userId);
        if (user == null) { throw new BizException(404, "用户不存在"); }

        Set<String> perms = new LinkedHashSet<>(permissionMapper.codesOf(userId));
        List<Map<String, Object>> roles = userMapper.rolesOf(userId);

        Map<String, Object> data = new LinkedHashMap<>();
        Map<String, Object> u = new LinkedHashMap<>();
        u.put("id", user.getId());
        u.put("account", user.getAccount());
        u.put("name", user.getName());
        u.put("phone", user.getPhone());
        u.put("status", user.getStatus());
        data.put("user", u);
        data.put("roles", roles);
        data.put("permissions", new ArrayList<>(perms));
        data.put("menus", menus(perms));
        return data;
    }

    /** 菜单只由权限码派生，前端不再写死 */
    private List<Map<String, Object>> menus(Set<String> perms) {
        List<Map<String, Object>> list = new ArrayList<>();
        add(list, perms, "ME:VIEW", "/perms", "我的权限");
        addPlain(list, "/applies", "我的申请");
        if (perms.contains("APPLY:APPROVE")) {
            addPlain(list, "/approvals", "待我审批");
        }
        add(list, perms, "USER:VIEW", "/users", "用户管理");
        add(list, perms, "ROLE:VIEW", "/roles", "角色管理");
        add(list, perms, "PERM:VIEW", "/permissions", "权限目录");
        add(list, perms, "FIN:RPT:VIEW", "/report", "财务报表");
        return list;
    }

    private void addPlain(List<Map<String, Object>> list, String path, String label) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("path", path);
        m.put("label", label);
        m.put("perm", "");
        list.add(m);
    }

    private void add(List<Map<String, Object>> list, Set<String> perms, String perm, String path, String label) {
        if (!perms.contains(perm)) { return; }
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("path", path);
        m.put("label", label);
        m.put("perm", perm);
        list.add(m);
    }
}
