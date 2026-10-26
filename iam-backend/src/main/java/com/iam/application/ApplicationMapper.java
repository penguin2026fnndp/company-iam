package com.iam.application;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

@Mapper
public interface ApplicationMapper {

    class ApplicationRow {
        private String sysCode;
        private String sysName;

        public String getSysCode() { return sysCode; }
        public void setSysCode(String sysCode) { this.sysCode = sysCode; }
        public String getSysName() { return sysName; }
        public void setSysName(String sysName) { this.sysName = sysName; }
    }

    class PermissionRow {
        private Long id;
        private String sysCode;
        private String sysName;
        private String moduleName;
        private String funcName;
        private String action;
        private String permCode;

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
    }

    @Select("""
            SELECT sys_code AS sysCode, MIN(sys_name) AS sysName
            FROM sys_permission
            WHERE status = 1
              AND sys_code IN ('OA', 'IM', 'KM')
            GROUP BY sys_code
            ORDER BY MIN(sort_no)
            """)
    List<ApplicationRow> listSupported();

    @Select("""
            SELECT sys_code AS sysCode, MIN(sys_name) AS sysName
            FROM sys_permission
            WHERE status = 1
              AND sys_code = #{sysCode}
            GROUP BY sys_code
            """)
    ApplicationRow findSystem(@Param("sysCode") String sysCode);

    @Select("""
            SELECT p.id, p.sys_code AS sysCode, p.sys_name AS sysName,
                   p.module_name AS moduleName, p.func_name AS funcName,
                   p.action, p.perm_code AS permCode
            FROM sys_permission p
            WHERE p.status = 1
              AND p.sys_code = #{sysCode}
              AND (
                    EXISTS (
                        SELECT 1
                        FROM sys_user_role ur
                        JOIN sys_role r ON r.id = ur.role_id AND r.status = 1
                        JOIN sys_role_permission rp ON rp.role_id = r.id
                        WHERE ur.user_id = #{userId} AND rp.permission_id = p.id
                    )
                    OR EXISTS (
                        SELECT 1
                        FROM sys_user_permission up
                        WHERE up.user_id = #{userId} AND up.permission_id = p.id
                    )
              )
            ORDER BY p.sort_no, p.id
            """)
    List<PermissionRow> userPermissionsOf(@Param("userId") long userId,
                                          @Param("sysCode") String sysCode);
}
