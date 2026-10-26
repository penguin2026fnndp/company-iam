package com.iam.apply;

import com.iam.common.BizException;
import com.iam.common.SessionMapper;
import com.iam.audit.AuditService;
import com.iam.permission.PermissionMapper;
import com.iam.role.RoleMapper;
import com.iam.user.UserMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("ApplyService 部门数据隔离")
class ApplyServiceTest {

    @Mock private ApplyMapper applyMapper;
    @Mock private UserMapper userMapper;
    @Mock private RoleMapper roleMapper;
    @Mock private PermissionMapper permissionMapper;
    @Mock private SessionMapper sessionMapper;
    @Mock private AuditService auditService;

    private ApplyService service;

    @BeforeEach
    void setUp() {
        service = new ApplyService(applyMapper, userMapper, roleMapper, permissionMapper,
                sessionMapper, auditService);
    }

    private ApplyMapper.ApplyRow pending(long applicantId, String type, long targetId) {
        ApplyMapper.ApplyRow row = new ApplyMapper.ApplyRow();
        row.setId(1L);
        row.setApplicantId(applicantId);
        row.setTargetType(type);
        row.setTargetId(targetId);
        row.setApplyReason("unit test");
        row.setStatus(0);
        row.setCreatedAt(LocalDateTime.now());
        return row;
    }

    @Test
    @DisplayName("申请不存在的角色编号 → 400 业务异常")
    void rejectsUnknownRoleTarget() {
        when(roleMapper.findById(9999L)).thenReturn(null);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> service.submit(7L, "ROLE", 9999L, "需要角色权限"));

        assertEquals("申请的角色编号不存在，请核实", ex.getMessage());
        verify(applyMapper, never()).insert(any());
    }

    @Test
    @DisplayName("跨部门审批 → 403，且不写入授权")
    void rejectsCrossDepartmentDecision() {
        when(applyMapper.findById(1L)).thenReturn(pending(3L, "PERM", 16L));
        when(applyMapper.isAdmin(2L)).thenReturn(0L);
        when(applyMapper.managedDepartmentOf(2L)).thenReturn(14L);  // 道路工程分公司-综合办公室
        when(applyMapper.departmentOfUser(3L)).thenReturn(20L);     // 其他部门（模拟不匹配）

        BizException ex = assertThrows(BizException.class,
                () -> service.decide(1L, "APPROVE", "同意", 2L));

        assertEquals(403, ex.getCode());
        verify(permissionMapper, never()).addDirect(anyLong(), anyLong(), any());
        verify(applyMapper, never()).decide(anyLong(), anyInt(), anyLong(), anyString());
    }

    @Test
    @DisplayName("同部门审批通过 → 写入直接权限并踢会话")
    void approvesSameDepartmentDecision() {
        when(applyMapper.findById(1L)).thenReturn(pending(3L, "PERM", 16L));
        when(applyMapper.isAdmin(2L)).thenReturn(0L);
        when(applyMapper.managedDepartmentOf(2L)).thenReturn(1L);
        when(applyMapper.departmentOfUser(3L)).thenReturn(1L);
        when(permissionMapper.countDirect(3L, 16L)).thenReturn(0L);
        when(applyMapper.decide(1L, 1, 2L, "同意")).thenReturn(1);

        Object result = service.decide(1L, "APPROVE", "同意", 2L);

        assertNotNull(result);
        verify(permissionMapper).addDirect(3L, 16L, 1L);
        verify(sessionMapper).revokeByUser(3L);
        verify(applyMapper).decide(1L, 1, 2L, "同意");
        verify(auditService).record(eq(2L), eq("APPLY_DECIDE"), eq(3L), contains("APPROVED"));
    }

    @Test
    @DisplayName("超级管理员跳过部门校验")
    void adminSkipsDepartmentCheck() {
        when(applyMapper.findById(1L)).thenReturn(pending(8L, "PERM", 14L));
        when(applyMapper.isAdmin(1L)).thenReturn(1L);
        when(permissionMapper.countDirect(8L, 14L)).thenReturn(0L);
        when(applyMapper.decide(1L, 1, 1L, "同意")).thenReturn(1);

        assertDoesNotThrow(() -> service.decide(1L, "APPROVE", "同意", 1L));

        verify(applyMapper, never()).managedDepartmentOf(anyLong());
        verify(permissionMapper).addDirect(8L, 14L, 1L);
    }

    @Test
    @DisplayName("超级管理员待办查询走全量分支")
    void adminPendingListUsesAllBranch() {
        when(applyMapper.isAdmin(1L)).thenReturn(1L);
        when(applyMapper.listAllByStatus(0)).thenReturn(List.of());

        assertTrue(service.byStatus(0, 1L).isEmpty());

        verify(applyMapper).listAllByStatus(0);
        verify(applyMapper, never()).listByStatus(anyInt(), anyLong());
    }
}
