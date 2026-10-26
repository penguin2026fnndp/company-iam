package com.iam.auth;

import com.iam.common.BizException;
import com.iam.common.LoginGuard;
import com.iam.common.SessionMapper;
import com.iam.permission.PermissionMapper;
import com.iam.user.UserMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("AuthService 登录")
class AuthServiceTest {

    @Mock private UserMapper userMapper;
    @Mock private SessionMapper sessionMapper;
    @Mock private PermissionMapper permissionMapper;
    @Mock private PasswordEncoder passwordEncoder;

    private AuthService authService;

    @BeforeEach
    void setUp() {
        authService = new AuthService(userMapper, sessionMapper, permissionMapper,
                passwordEncoder, new LoginGuard());
    }

    private UserMapper.UserRow user() {
        UserMapper.UserRow u = new UserMapper.UserRow();
        u.setId(7L);
        u.setAccount("SG000198");
        u.setName("蒋祯");
        u.setStatus(1);
        u.setDepartmentId(14L);
        u.setDepartmentName("道路工程分公司-综合办公室");
        u.setDepartmentPath("总公司 / 道路工程分公司 / 道路工程分公司-综合办公室");
        u.setPasswordHash("$2a$10$storedHash");
        return u;
    }

    private List<String> fill(String prefix, int count) {
        List<String> codes = new java.util.ArrayList<>();
        for (int i = 1; i <= count; i++) {
            codes.add(prefix + i);
        }
        return codes;
    }

    @Test
    @DisplayName("账号不存在 → 401")
    void accountNotFound() {
        when(userMapper.findByAccount("SG000999")).thenReturn(null);

        BizException ex = assertThrows(BizException.class,
                () -> authService.login("SG000999", "123456", "127.0.0.1", "junit"));

        assertEquals(401, ex.getCode());
        verify(sessionMapper, never()).create(anyString(), anyLong(), any(), any(), any());
    }

    @Test
    @DisplayName("密码错误 → 401，且不创建会话")
    void wrongPassword() {
        when(userMapper.findByAccount("SG000198")).thenReturn(user());
        when(passwordEncoder.matches("wrong", "$2a$10$storedHash")).thenReturn(false);

        BizException ex = assertThrows(BizException.class,
                () -> authService.login("SG000198", "wrong", "127.0.0.1", "junit"));

        assertEquals(401, ex.getCode());
        assertTrue(ex.getMessage().contains("还可尝试"));
        verify(sessionMapper, never()).create(anyString(), anyLong(), any(), any(), any());
    }

    @Test
    @DisplayName("正常登录 → 返回 sessionId 与权限菜单")
    void loginSuccess() {
        UserMapper.UserRow u = user();
        when(userMapper.findByAccount("SG000198")).thenReturn(u);
        when(passwordEncoder.matches("123456", "$2a$10$storedHash")).thenReturn(true);
        when(userMapper.findById(7L)).thenReturn(u);

        Map<String, Object> role = new HashMap<>();
        role.put("id", 7L);
        role.put("code", "EMP");
        role.put("name", "普通员工");
        when(userMapper.rolesOf(7L)).thenReturn(List.of(role));
        List<String> permissions = new java.util.ArrayList<>();
        permissions.add("ME:VIEW");
        permissions.addAll(fill("EMP:TEST:", 43));
        when(permissionMapper.codesOf(7L)).thenReturn(permissions);

        Map<String, Object> data = authService.login("SG000198", "123456", "127.0.0.1", "junit");

        assertNotNull(data.get("sessionId"));
        assertNotNull(data.get("expireAt"));
        assertEquals(44, ((List<?>) data.get("permissions")).size());
        assertEquals(2, ((List<?>) data.get("menus")).size(), "ME:VIEW 的权限菜单 + 始终存在的我的申请");
        Map<?, ?> profileUser = (Map<?, ?>) data.get("user");
        assertEquals(14L, profileUser.get("departmentId"));
        assertEquals("总公司 / 道路工程分公司 / 道路工程分公司-综合办公室",
                profileUser.get("departmentPath"));

        verify(sessionMapper).create(anyString(), eq(7L), any(), any(), any());
    }

    @Test
    @DisplayName("卢晓超 MGR 按 Excel 矩阵合并后 73 枚")
    void managerHasSeventyThreeEffectivePermissions() {
        UserMapper.UserRow u = new UserMapper.UserRow();
        u.setId(6L);
        u.setAccount("SG000197");
        u.setName("卢晓超");
        u.setStatus(1);

        when(userMapper.findById(6L)).thenReturn(u);
        when(userMapper.rolesOf(6L)).thenReturn(List.of(
                Map.of("id", 5L, "code", "MGR", "name", "部门经理")));
        List<String> permissions = new java.util.ArrayList<>(List.of(
                "ME:VIEW", "USER:VIEW", "ROLE:VIEW", "PERM:VIEW",
                "DEPT:VIEW", "APPLY:APPROVE"));
        permissions.addAll(fill("MGR:TEST:", 67));
        when(permissionMapper.codesOf(6L)).thenReturn(permissions);

        Map<String, Object> data = authService.profile(6L);

        assertEquals(73, ((List<?>) data.get("permissions")).size());
        assertTrue(((List<?>) data.get("permissions")).contains("APPLY:APPROVE"));
        assertTrue(((List<Map<String, Object>>) data.get("menus")).stream()
                .anyMatch(menu -> "/approvals".equals(menu.get("path"))));
        assertEquals(6, ((List<?>) data.get("menus")).size());
    }

    @Test
    @DisplayName("袁国智超级管理员拥有全部 274 枚权限")
    void superAdminHasAllPermissions() {
        UserMapper.UserRow u = new UserMapper.UserRow();
        u.setId(2L);
        u.setAccount("SG000011");
        u.setName("袁国智");
        u.setStatus(1);

        List<String> permissions = new java.util.ArrayList<>(List.of(
                "ME:VIEW", "USER:VIEW", "ROLE:VIEW", "PERM:VIEW",
                "DEPT:VIEW", "APPLY:APPROVE"));
        permissions.addAll(fill("ALL:TEST:", 268));

        when(userMapper.findById(2L)).thenReturn(u);
        when(userMapper.rolesOf(2L)).thenReturn(List.of(
                Map.of("id", 8L, "code", "SUPER_ADMIN", "name", "超级管理员")));
        when(permissionMapper.codesOf(2L)).thenReturn(permissions);

        Map<String, Object> data = authService.profile(2L);

        assertEquals(274, ((List<?>) data.get("permissions")).size());
        assertEquals(6, ((List<?>) data.get("menus")).size());
    }
}
