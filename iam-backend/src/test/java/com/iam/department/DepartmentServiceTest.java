package com.iam.department;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("DepartmentService 层级路径")
class DepartmentServiceTest {

    @Mock private DepartmentMapper departmentMapper;

    private DepartmentService service;

    @BeforeEach
    void setUp() {
        service = new DepartmentService(departmentMapper);
    }

    private DepartmentMapper.DepartmentRow row(long id, Long parentId, String name) {
        DepartmentMapper.DepartmentRow row = new DepartmentMapper.DepartmentRow();
        row.setId(id);
        row.setParentId(parentId);
        row.setName(name);
        return row;
    }

    @Test
    @DisplayName("总公司/分公司/部门返回完整路径与深度")
    void buildsFullDepartmentPath() {
        when(departmentMapper.list()).thenReturn(List.of(
                row(1L, null, "总公司"),
                row(13L, 1L, "道路工程分公司"),
                row(14L, 13L, "道路工程分公司-综合办公室")));

        List<Map<String, Object>> result = service.list();

        assertEquals("总公司 / 道路工程分公司 / 道路工程分公司-综合办公室",
                result.get(2).get("path"));
        assertEquals(2, result.get(2).get("depth"));
    }
}
