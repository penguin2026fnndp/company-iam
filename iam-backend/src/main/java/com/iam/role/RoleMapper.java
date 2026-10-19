package com.iam.role;

import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

import java.util.List;
import java.util.Map;

@Mapper
public interface RoleMapper {

    String BASE = """
            SELECT r.id, r.code, r.name, r.remark, r.status,
                   (SELECT COUNT(*) FROM sys_user_role WHERE role_id = r.id) AS memberCount,
                   (SELECT COUNT(*) FROM sys_role_permission WHERE role_id = r.id) AS permCount
            FROM sys_role r
            """;

    @Select(BASE + """
             WHERE (#{kw} = '' OR r.code LIKE CONCAT('%', #{kw}, '%')
                              OR r.name LIKE CONCAT('%', #{kw}, '%'))
             ORDER BY r.id
            """)
    List<Map<String, Object>> list(@Param("kw") String kw);

    @Select(BASE + " WHERE r.id = #{id}")
    Map<String, Object> findById(@Param("id") long id);

    @Select("SELECT id, code, name FROM sys_role WHERE code = #{code}")
    Map<String, Object> findByCode(@Param("code") String code);

    @Insert("INSERT INTO sys_role (code, name, remark, status) VALUES (#{code}, #{name}, #{remark}, 1)")
    int insert(@Param("code") String code, @Param("name") String name, @Param("remark") String remark);

    @Update("UPDATE sys_role SET name = #{name}, remark = #{remark}, status = #{status} WHERE id = #{id}")
    int update(@Param("id") long id, @Param("name") String name,
               @Param("remark") String remark, @Param("status") int status);

    @Delete("DELETE FROM sys_role WHERE id = #{id}")
    int delete(@Param("id") long id);

    @Select("SELECT COUNT(*) FROM sys_user_role WHERE role_id = #{roleId}")
    long memberCount(@Param("roleId") long roleId);

    @Select("SELECT COUNT(*) FROM sys_role WHERE id = #{id}")
    long countById(@Param("id") long id);

    @Select("SELECT permission_id FROM sys_role_permission WHERE role_id = #{roleId}")
    List<Long> permIds(@Param("roleId") long roleId);

    @Select("""
            SELECT u.id, u.account, u.name
            FROM sys_user_role ur JOIN sys_user u ON u.id = ur.user_id
            WHERE ur.role_id = #{roleId} ORDER BY u.id
            """)
    List<Map<String, Object>> members(@Param("roleId") long roleId);

    @Delete("DELETE FROM sys_role_permission WHERE role_id = #{roleId}")
    int clearPermissions(@Param("roleId") long roleId);

    @Insert("INSERT INTO sys_role_permission (role_id, permission_id) VALUES (#{roleId}, #{permId})")
    int addPermission(@Param("roleId") long roleId, @Param("permId") long permId);
}
