package com.iam.user;

import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Mapper
public interface UserMapper {

    class UserRow {
        private Long id;
        private String account;
        private String name;
        private String phone;
        private String passwordHash;
        private Integer status;
        private LocalDateTime createdAt;
        private String roleNames;
        private Integer permCount;

        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }
        public String getAccount() { return account; }
        public void setAccount(String account) { this.account = account; }
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public String getPhone() { return phone; }
        public void setPhone(String phone) { this.phone = phone; }
        public String getPasswordHash() { return passwordHash; }
        public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }
        public Integer getStatus() { return status; }
        public void setStatus(Integer status) { this.status = status; }
        public LocalDateTime getCreatedAt() { return createdAt; }
        public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
        public String getRoleNames() { return roleNames; }
        public void setRoleNames(String roleNames) { this.roleNames = roleNames; }
        public Integer getPermCount() { return permCount; }
        public void setPermCount(Integer permCount) { this.permCount = permCount; }
    }

    String BASE = """
            SELECT u.id, u.account, u.name, u.phone, u.password_hash, u.status, u.created_at,
                   (SELECT GROUP_CONCAT(r.name ORDER BY r.id SEPARATOR ' / ')
                      FROM sys_user_role ur JOIN sys_role r ON r.id = ur.role_id
                     WHERE ur.user_id = u.id) AS role_names,
                   (SELECT COUNT(DISTINCT rp.permission_id)
                      FROM sys_user_role ur
                      JOIN sys_role r2 ON r2.id = ur.role_id AND r2.status = 1
                      JOIN sys_role_permission rp ON rp.role_id = ur.role_id
                     WHERE ur.user_id = u.id) AS perm_count
            FROM sys_user u
            """;

    @Select(BASE + " WHERE u.account = #{account}")
    UserRow findByAccount(@Param("account") String account);

    @Select(BASE + " WHERE u.id = #{id}")
    UserRow findById(@Param("id") long id);

    @Select(BASE + """
             WHERE (#{kw} = '' OR u.account LIKE CONCAT('%', #{kw}, '%')
                              OR u.name LIKE CONCAT('%', #{kw}, '%'))
             ORDER BY u.id LIMIT #{size} OFFSET #{offset}
            """)
    List<UserRow> page(@Param("kw") String kw, @Param("offset") int offset, @Param("size") int size);

    @Select("""
            SELECT COUNT(*) FROM sys_user
            WHERE (#{kw} = '' OR account LIKE CONCAT('%', #{kw}, '%')
                             OR name LIKE CONCAT('%', #{kw}, '%'))
            """)
    long count(@Param("kw") String kw);

    @Insert("""
            INSERT INTO sys_user (account, name, phone, password_hash, status)
            VALUES (#{account}, #{name}, #{phone}, #{passwordHash}, #{status})
            """)
    int insert(UserRow row);

    @Update("UPDATE sys_user SET name = #{name}, phone = #{phone} WHERE id = #{id}")
    int update(@Param("id") long id, @Param("name") String name, @Param("phone") String phone);

    @Update("UPDATE sys_user SET status = #{status} WHERE id = #{id}")
    int updateStatus(@Param("id") long id, @Param("status") int status);

    @Update("UPDATE sys_user SET password_hash = #{hash} WHERE id = #{id}")
    int updatePassword(@Param("id") long id, @Param("hash") String hash);

    @Delete("DELETE FROM sys_user WHERE id = #{id}")
    int delete(@Param("id") long id);

    @Select("""
            SELECT r.id AS id, r.code AS code, r.name AS name
            FROM sys_user_role ur JOIN sys_role r ON r.id = ur.role_id
            WHERE ur.user_id = #{userId} ORDER BY r.id
            """)
    List<Map<String, Object>> rolesOf(@Param("userId") long userId);

    @Select("SELECT role_id FROM sys_user_role WHERE user_id = #{userId} ORDER BY role_id")
    List<Long> roleIdsOf(@Param("userId") long userId);

    @Delete("DELETE FROM sys_user_role WHERE user_id = #{userId}")
    int clearRoles(@Param("userId") long userId);

    @Insert("INSERT INTO sys_user_role (user_id, role_id) VALUES (#{userId}, #{roleId})")
    int addRole(@Param("userId") long userId, @Param("roleId") long roleId);

    @Select("SELECT COUNT(*) FROM sys_user_role WHERE user_id = #{userId} AND role_id = #{roleId}")
    long countRole(@Param("userId") long userId, @Param("roleId") long roleId);
}
