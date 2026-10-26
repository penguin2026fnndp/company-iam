package com.iam.department;

import com.iam.common.RequirePerm;
import com.iam.common.Result;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "07 部门管理", description = "完整组织树下拉与用户部门维护")
@RestController
@RequestMapping("/api/departments")
public class DepartmentController {
    private final DepartmentService departmentService;

    public DepartmentController(DepartmentService departmentService) {
        this.departmentService = departmentService;
    }

    @Operation(summary = "部门树列表", description = "返回父级、负责人、层级深度与完整路径")
    @GetMapping
    @RequirePerm("DEPT:VIEW")
    public Result list() {
        return Result.ok(departmentService.list());
    }
}
