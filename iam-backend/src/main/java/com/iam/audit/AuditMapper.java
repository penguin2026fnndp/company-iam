package com.iam.audit;

import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.time.LocalDateTime;
import java.util.List;

@Mapper
public interface AuditMapper {

    class AuditRow {
        private Long id;
        private Long operatorId;
        private String operatorName;
        private String action;
        private Long targetUserId;
        private String targetUserName;
        private String detail;
        private LocalDateTime createdAt;

        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }
        public Long getOperatorId() { return operatorId; }
        public void setOperatorId(Long operatorId) { this.operatorId = operatorId; }
        public String getOperatorName() { return operatorName; }
        public void setOperatorName(String operatorName) { this.operatorName = operatorName; }
        public String getAction() { return action; }
        public void setAction(String action) { this.action = action; }
        public Long getTargetUserId() { return targetUserId; }
        public void setTargetUserId(Long targetUserId) { this.targetUserId = targetUserId; }
        public String getTargetUserName() { return targetUserName; }
        public void setTargetUserName(String targetUserName) { this.targetUserName = targetUserName; }
        public String getDetail() { return detail; }
        public void setDetail(String detail) { this.detail = detail; }
        public LocalDateTime getCreatedAt() { return createdAt; }
        public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    }

    @Select("SELECT name FROM sys_user WHERE id = #{userId}")
    String findUserName(@Param("userId") long userId);

    @Insert("""
            INSERT INTO sys_audit_log
                (operator_id, operator_name, action, target_user_id, detail)
            VALUES
                (#{operatorId}, #{operatorName}, #{action}, #{targetUserId}, #{detail})
            """)
    int insert(@Param("operatorId") long operatorId,
               @Param("operatorName") String operatorName,
               @Param("action") String action,
               @Param("targetUserId") Long targetUserId,
               @Param("detail") String detail);

    @Select("SELECT COUNT(*) FROM sys_audit_log")
    long count();

    @Select("""
            SELECT a.id, a.operator_id AS operatorId, a.operator_name AS operatorName,
                   a.action, a.target_user_id AS targetUserId,
                   u.name AS targetUserName, a.detail, a.created_at AS createdAt
            FROM sys_audit_log a
            LEFT JOIN sys_user u ON u.id = a.target_user_id
            ORDER BY a.created_at DESC, a.id DESC
            LIMIT #{size} OFFSET #{offset}
            """)
    List<AuditRow> page(@Param("offset") int offset, @Param("size") int size);
}
