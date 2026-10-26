package com.iam.user;

import com.iam.common.SessionMapper;
import com.iam.common.SessionContext;
import com.iam.audit.AuditService;
import com.iam.department.DepartmentMapper;
import com.iam.permission.PermissionMapper;
import com.iam.role.RoleMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("UserService 编辑部门")
class UserServiceTest {

    @Mock private UserMapper userMapper;
    @Mock private SessionMapper sessionMapper;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private RoleMapper roleMapper;
    @Mock private PermissionMapper permissionMapper;
    @Mock private DepartmentMapper departmentMapper;
    @Mock private AuditService auditService;

    private UserService service;

    @BeforeEach
    void setUp() {
        service = new UserService(userMapper, sessionMapper, passwordEncoder,
                roleMapper, permissionMapper, departmentMapper, auditService);
    }

    private UserMapper.UserRow user() {
        UserMapper.UserRow row = new UserMapper.UserRow();
        row.setId(7L);
        row.setAccount("SG000198");
        row.setName("蒋祯");
        row.setPhone("18299242816");
        row.setStatus(1);
        row.setDepartmentId(15L);
        row.setDepartmentName("道路工程分公司-综合办公室");
        return row;
    }

    @Test
    @DisplayName("部门存在时更新 department_id")
    void updatesExistingDepartment() {
        when(userMapper.findById(7L)).thenReturn(user());
        when(departmentMapper.countById(16L)).thenReturn(1L);

        try (MockedStatic<SessionContext> context = mockStatic(SessionContext.class)) {
            context.when(SessionContext::userId).thenReturn(1L);
            service.update(7L, "蒋祯", "18299242816", 16L);
        }

        verify(userMapper).update(7L, "蒋祯", "18299242816", 16L);
    }

    @Test
    @DisplayName("部门不存在时拒绝更新")
    void rejectsUnknownDepartment() {
        when(userMapper.findById(7L)).thenReturn(user());
        when(departmentMapper.countById(9999L)).thenReturn(0L);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> service.update(7L, "蒋祯", "18299242816", 9999L));

        assertEquals("所属部门不存在，请核实", ex.getMessage());
        verify(userMapper, never()).update(anyLong(), any(), any(), any());
    }

    @Test
    @DisplayName("全量角色更新会踢会话并写审计")
    void assignsRolesAndAudits() {
        when(userMapper.findById(7L)).thenReturn(user());
        when(roleMapper.countById(7L)).thenReturn(1L);
        when(roleMapper.countById(8L)).thenReturn(1L);
        when(roleMapper.findById(7L)).thenReturn(java.util.Map.of("name", "普通员工"));
        when(roleMapper.findById(8L)).thenReturn(java.util.Map.of("name", "超级管理员"));

        service.assignRoles(7L, java.util.List.of(7L, 8L), 2L);

        verify(userMapper).clearRoles(7L);
        verify(userMapper).addRole(7L, 7L);
        verify(userMapper).addRole(7L, 8L);
        verify(sessionMapper).revokeByUser(7L);
        verify(auditService).record(eq(2L), eq("ROLE_ASSIGN"), eq(7L), contains("超级管理员"));
    }

    @Test
    @DisplayName("单独剥夺角色会踢会话并写审计")
    void revokesRoleAndAudits() {
        when(userMapper.findById(7L)).thenReturn(user());
        when(roleMapper.findById(8L)).thenReturn(java.util.Map.of("name", "超级管理员"));
        when(userMapper.countRole(7L, 8L)).thenReturn(1L);

        service.revokeRole(7L, 8L, 2L);

        verify(userMapper).removeRole(7L, 8L);
        verify(sessionMapper).revokeByUser(7L);
        verify(auditService).record(eq(2L), eq("ROLE_REMOVE"), eq(7L), contains("超级管理员"));
    }
}
