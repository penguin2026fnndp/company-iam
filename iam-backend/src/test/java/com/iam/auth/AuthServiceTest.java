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
        u.setId(3L);
        u.setAccount("SG000102");
        u.setName("李四");
        u.setStatus(1);
        u.setPasswordHash("$2a$10$storedHash");
        return u;
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
        when(userMapper.findByAccount("SG000102")).thenReturn(user());
        when(passwordEncoder.matches("wrong", "$2a$10$storedHash")).thenReturn(false);

        BizException ex = assertThrows(BizException.class,
                () -> authService.login("SG000102", "wrong", "127.0.0.1", "junit"));

        assertEquals(401, ex.getCode());
        assertTrue(ex.getMessage().contains("还可尝试"));
        verify(sessionMapper, never()).create(anyString(), anyLong(), any(), any(), any());
    }

    @Test
    @DisplayName("正常登录 → 返回 sessionId 与权限菜单")
    void loginSuccess() {
        UserMapper.UserRow u = user();
        when(userMapper.findByAccount("SG000102")).thenReturn(u);
        when(passwordEncoder.matches("123456", "$2a$10$storedHash")).thenReturn(true);
        when(userMapper.findById(3L)).thenReturn(u);

        Map<String, Object> role = new HashMap<>();
        role.put("id", 3L);
        role.put("code", "EMP");
        role.put("name", "普通员工");
        when(userMapper.rolesOf(3L)).thenReturn(List.of(role));
        when(permissionMapper.codesOf(3L)).thenReturn(List.of("ME:VIEW", "OA:DOC:VIEW"));

        Map<String, Object> data = authService.login("SG000102", "123456", "127.0.0.1", "junit");

        assertNotNull(data.get("sessionId"));
        assertNotNull(data.get("expireAt"));
        assertEquals(2, ((List<?>) data.get("permissions")).size());
        assertEquals(2, ((List<?>) data.get("menus")).size(), "ME:VIEW 的权限菜单 + 始终存在的我的申请");

        verify(sessionMapper).create(anyString(), eq(3L), any(), any(), any());
    }

    @Test
    @DisplayName("张伟角色 8 枚 + 直接权限 1 枚 → 9 枚")
    void zhangWeiHasNineEffectivePermissions() {
        UserMapper.UserRow u = new UserMapper.UserRow();
        u.setId(2L);
        u.setAccount("SG000101");
        u.setName("张伟");
        u.setStatus(1);

        when(userMapper.findById(2L)).thenReturn(u);
        when(userMapper.rolesOf(2L)).thenReturn(List.of(
                Map.of("id", 2L, "code", "MGR", "name", "部门主管")));
        when(permissionMapper.codesOf(2L)).thenReturn(List.of(
                "ME:VIEW",
                "USER:VIEW",
                "ROLE:VIEW",
                "PERM:VIEW",
                "OA:DOC:VIEW",
                "OA:DOC:ADD",
                "FIN:RPT:VIEW",
                "PM:COST:VIEW",
                "APPLY:APPROVE"));

        Map<String, Object> data = authService.profile(2L);

        assertEquals(9, ((List<?>) data.get("permissions")).size());
        assertTrue(((List<?>) data.get("permissions")).contains("APPLY:APPROVE"));
        assertTrue(((List<Map<String, Object>>) data.get("menus")).stream()
                .anyMatch(menu -> "/approvals".equals(menu.get("path"))));
    }

    @Test
    @DisplayName("超级管理员拥有 20 枚权限和 7 个菜单")
    void adminHasTwentyPermissions() {
        UserMapper.UserRow u = new UserMapper.UserRow();
        u.setId(1L);
        u.setAccount("SG900001");
        u.setName("系统管理员");
        u.setStatus(1);

        List<String> allPermissions = List.of(
                "ME:VIEW", "USER:VIEW", "USER:ADD", "USER:EDIT", "USER:DELETE",
                "USER:ASSIGN_ROLE", "ROLE:VIEW", "ROLE:ADD", "ROLE:EDIT", "ROLE:DELETE",
                "ROLE:ASSIGN_PERM", "PERM:VIEW", "OA:DOC:VIEW", "OA:DOC:ADD",
                "FIN:RPT:VIEW", "FIN:RPT:EXPORT", "PM:COST:VIEW", "APPLY:APPROVE",
                "PERM:ADD", "PERM:DELETE");

        when(userMapper.findById(1L)).thenReturn(u);
        when(userMapper.rolesOf(1L)).thenReturn(List.of(
                Map.of("id", 1L, "code", "ADMIN", "name", "系统管理员")));
        when(permissionMapper.codesOf(1L)).thenReturn(allPermissions);

        Map<String, Object> data = authService.profile(1L);

        assertEquals(20, ((List<?>) data.get("permissions")).size());
        assertEquals(7, ((List<?>) data.get("menus")).size());
    }
}
