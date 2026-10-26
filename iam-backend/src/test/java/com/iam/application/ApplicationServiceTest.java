package com.iam.application;

import com.iam.common.BizException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("ApplicationService 应用权限")
class ApplicationServiceTest {

    @Mock private ApplicationMapper applicationMapper;

    private ApplicationService service;

    @BeforeEach
    void setUp() {
        service = new ApplicationService(applicationMapper);
    }

    private ApplicationMapper.ApplicationRow app(String code, String name) {
        ApplicationMapper.ApplicationRow row = new ApplicationMapper.ApplicationRow();
        row.setSysCode(code);
        row.setSysName(name);
        return row;
    }

    private ApplicationMapper.PermissionRow permission(String module, String function, String action) {
        ApplicationMapper.PermissionRow row = new ApplicationMapper.PermissionRow();
        row.setId(1L);
        row.setSysCode("KM");
        row.setSysName("企业知识库管理系统");
        row.setModuleName(module);
        row.setFuncName(function);
        row.setAction(action);
        row.setPermCode("KM:DOC:F036:" + action);
        return row;
    }

    @Test
    @DisplayName("只返回 OA / IM / KM 三个应用")
    void listsSupportedApplications() {
        when(applicationMapper.listSupported()).thenReturn(List.of(
                app("OA", "OA协同办公系统"),
                app("IM", "企业即时通讯系统"),
                app("KM", "企业知识库管理系统")));

        assertEquals(3, service.list().size());
    }

    @Test
    @DisplayName("权限码组装成自然语言描述")
    void buildsNaturalLanguageDescriptions() {
        when(applicationMapper.findSystem("KM"))
                .thenReturn(app("KM", "企业知识库管理系统"));
        when(applicationMapper.userPermissionsOf(7L, "KM")).thenReturn(List.of(
                permission("知识文档管理", "文档上传与编辑", "VIEW"),
                permission("专业知识库", "工程规范库", "ADD")));

        Map<String, Object> data = service.myPermissions(7L, "km");

        assertEquals("KM", data.get("sysCode"));
        assertEquals("企业知识库管理系统", data.get("sysName"));
        List<?> permissions = (List<?>) data.get("permissions");
        assertEquals(2, permissions.size());
        assertEquals("您拥有【知识文档管理-文档上传与编辑】的查看权限",
                ((Map<?, ?>) permissions.get(0)).get("description"));
        assertEquals("新增", ((Map<?, ?>) permissions.get(1)).get("actionName"));
    }

    @Test
    @DisplayName("非法系统编码返回 400")
    void rejectsUnsupportedSystem() {
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> service.myPermissions(7L, "FIN"));

        assertEquals("不支持的应用系统编码", ex.getMessage());
    }

    @Test
    @DisplayName("合法编码但无系统数据返回 404")
    void rejectsMissingSystem() {
        when(applicationMapper.findSystem("OA")).thenReturn(null);

        BizException ex = assertThrows(BizException.class,
                () -> service.myPermissions(7L, "OA"));

        assertEquals(404, ex.getCode());
    }
}
