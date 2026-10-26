package com.iam.audit;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("AuditService 审计日志")
class AuditServiceTest {

    @Mock private AuditMapper auditMapper;

    private AuditService service;

    @BeforeEach
    void setUp() {
        service = new AuditService(auditMapper);
    }

    @Test
    @DisplayName("写入日志时自动补全操作人姓名")
    void recordsOperatorName() {
        when(auditMapper.findUserName(2L)).thenReturn("袁国智");

        service.record(2L, "ROLE_ASSIGN", 7L, "roles=[普通员工,超级管理员]");

        verify(auditMapper).insert(2L, "袁国智", "ROLE_ASSIGN", 7L,
                "roles=[普通员工,超级管理员]");
    }

    @Test
    @DisplayName("审计分页返回标准结构")
    void returnsPage() {
        when(auditMapper.count()).thenReturn(1L);
        when(auditMapper.page(0, 100)).thenReturn(List.of());

        Map<String, Object> result = service.page(0, 200);

        assertEquals(1L, result.get("total"));
        assertEquals(1, result.get("page"));
        assertEquals(100, result.get("size"));
        verify(auditMapper).page(0, 100);
    }
}
