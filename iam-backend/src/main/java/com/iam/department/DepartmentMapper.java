package com.iam.department;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

@Mapper
public interface DepartmentMapper {

    class DepartmentRow {
        private Long id;
        private Long parentId;
        private String name;
        private Long managerId;
        private String managerName;

        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }
        public Long getParentId() { return parentId; }
        public void setParentId(Long parentId) { this.parentId = parentId; }
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public Long getManagerId() { return managerId; }
        public void setManagerId(Long managerId) { this.managerId = managerId; }
        public String getManagerName() { return managerName; }
        public void setManagerName(String managerName) { this.managerName = managerName; }
    }

    @Select("""
            SELECT d.id, d.parent_id, d.name, d.manager_id,
                   u.name AS manager_name
            FROM sys_department d
            LEFT JOIN sys_user u ON u.id = d.manager_id
            ORDER BY d.id
            """)
    List<DepartmentRow> list();

    @Select("SELECT COUNT(*) FROM sys_department WHERE id = #{id}")
    long countById(@Param("id") long id);
}
