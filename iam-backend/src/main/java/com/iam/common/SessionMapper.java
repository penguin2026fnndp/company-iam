package com.iam.common;

import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

import java.time.LocalDateTime;

@Mapper
public interface SessionMapper {

    class SessionUser {
        private Long userId;
        private String account;
        private String name;

        public Long getUserId() { return userId; }
        public void setUserId(Long userId) { this.userId = userId; }
        public String getAccount() { return account; }
        public void setAccount(String account) { this.account = account; }
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
    }

    /** 会话有效 = 未撤销 + 未过期 + 用户未停用 */
    @Select("""
            SELECT s.user_id AS userId, u.account AS account, u.name AS name
            FROM sys_session s
            JOIN sys_user u ON u.id = s.user_id
            WHERE s.id = #{token}
              AND s.revoked_at IS NULL
              AND s.expire_at > NOW()
              AND u.status = 1
            """)
    SessionUser findValid(@Param("token") String token);

    @Insert("""
            INSERT INTO sys_session (id, user_id, expire_at, ip, user_agent)
            VALUES (#{token}, #{userId}, #{expireAt}, #{ip}, #{ua})
            """)
    int create(@Param("token") String token,
               @Param("userId") long userId,
               @Param("expireAt") LocalDateTime expireAt,
               @Param("ip") String ip,
               @Param("ua") String ua);

    @Update("UPDATE sys_session SET revoked_at = NOW() WHERE id = #{token} AND revoked_at IS NULL")
    int revoke(@Param("token") String token);

    @Update("UPDATE sys_session SET revoked_at = NOW() WHERE user_id = #{userId} AND revoked_at IS NULL")
    int revokeByUser(@Param("userId") long userId);

    @Update("""
            UPDATE sys_session s
            JOIN sys_user_role ur ON ur.user_id = s.user_id
            SET s.revoked_at = NOW()
            WHERE ur.role_id = #{roleId} AND s.revoked_at IS NULL
            """)
    int revokeByRole(@Param("roleId") long roleId);
}
