package com.iam.permission;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;
import java.util.Map;

@Mapper
public interface PermissionMapper {

    class PermRow {
        private Long id;
        private String sysCode;
        private String sysName;
        private String moduleName;
        private String funcName;
        private String action;
        private String permCode;
        private Integer sortNo;

        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }
        public String getSysCode() { return sysCode; }
        public void setSysCode(String sysCode) { this.sysCode = sysCode; }
        public String getSysName() { return sysName; }
        public void setSysName(String sysName) { this.sysName = sysName; }
        public String getModuleName() { return moduleName; }
        public void setModuleName(String moduleName) { this.moduleName = moduleName; }
        public String getFuncName() { return funcName; }
        public void setFuncName(String funcName) { this.funcName = funcName; }
        public String getAction() { return action; }
        public void setAction(String action) { this.action = action; }
        public String getPermCode() { return permCode; }
        public void setPermCode(String permCode) { this.permCode = permCode; }
        public Integer getSortNo() { return sortNo; }
        public void setSortNo(Integer sortNo) { this.sortNo = sortNo; }
    }

    /** 唯一的权限计算口径：用户 → 角色（启用）→ 角色权限 → 权限（启用） */
    @Select("""
            SELECT DISTINCT p.perm_code
            FROM sys_user_role ur
            JOIN sys_role r             ON r.id = ur.role_id AND r.status = 1
            JOIN sys_role_permission rp ON rp.role_id = r.id
            JOIN sys_permission p       ON p.id = rp.permission_id AND p.status = 1
            WHERE ur.user_id = #{userId}
            ORDER BY p.perm_code
            """)
    List<String> codesOf(@Param("userId") long userId);

    @Select("""
            SELECT id, sys_code, sys_name, module_name, func_name, action, perm_code, sort_no
            FROM sys_permission
            WHERE status = 1
              AND (#{sys} = '' OR sys_code = #{sys})
              AND (#{kw} = '' OR perm_code LIKE CONCAT('%', #{kw}, '%')
                              OR func_name LIKE CONCAT('%', #{kw}, '%'))
            ORDER BY sort_no, id
            """)
    List<PermRow> list(@Param("sys") String sys, @Param("kw") String kw);

    @Select("""
            SELECT sys_code AS sysCode, MIN(sys_name) AS sysName
            FROM sys_permission
            WHERE status = 1
            GROUP BY sys_code
            ORDER BY MIN(sort_no)
            """)
    List<Map<String, Object>> systems();

    @Select("SELECT permission_id FROM sys_role_permission WHERE role_id = #{roleId}")
    List<Long> checkedIdsOfRole(@Param("roleId") long roleId);

    @Select("SELECT COUNT(*) FROM sys_permission WHERE id = #{id} AND status = 1")
    long countById(@Param("id") long id);
}
