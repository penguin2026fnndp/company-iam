package com.iam.apply;

import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Options;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

import java.time.LocalDateTime;
import java.util.List;

@Mapper
public interface ApplyMapper {

    class ApplyRow {
        private Long id;
        private Long applicantId;
        private String targetType;
        private Long targetId;
        private String applyReason;
        private Integer status;
        private Long approverId;
        private LocalDateTime approveTime;
        private String approveComment;
        private LocalDateTime createdAt;
        private String applicantName;
        private String approverName;
        private String targetName;

        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }
        public Long getApplicantId() { return applicantId; }
        public void setApplicantId(Long applicantId) { this.applicantId = applicantId; }
        public String getTargetType() { return targetType; }
        public void setTargetType(String targetType) { this.targetType = targetType; }
        public Long getTargetId() { return targetId; }
        public void setTargetId(Long targetId) { this.targetId = targetId; }
        public String getApplyReason() { return applyReason; }
        public void setApplyReason(String applyReason) { this.applyReason = applyReason; }
        public Integer getStatus() { return status; }
        public void setStatus(Integer status) { this.status = status; }
        public Long getApproverId() { return approverId; }
        public void setApproverId(Long approverId) { this.approverId = approverId; }
        public LocalDateTime getApproveTime() { return approveTime; }
        public void setApproveTime(LocalDateTime approveTime) { this.approveTime = approveTime; }
        public String getApproveComment() { return approveComment; }
        public void setApproveComment(String approveComment) { this.approveComment = approveComment; }
        public LocalDateTime getCreatedAt() { return createdAt; }
        public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
        public String getApplicantName() { return applicantName; }
        public void setApplicantName(String applicantName) { this.applicantName = applicantName; }
        public String getApproverName() { return approverName; }
        public void setApproverName(String approverName) { this.approverName = approverName; }
        public String getTargetName() { return targetName; }
        public void setTargetName(String targetName) { this.targetName = targetName; }
    }

    String BASE = """
            SELECT a.id, a.applicant_id, a.target_type, a.target_id, a.apply_reason, a.status,
                   a.approver_id, a.approve_time, a.approve_comment, a.created_at,
                   u.name AS applicant_name,
                   ap.name AS approver_name,
                   CASE WHEN a.target_type = 'ROLE'
                        THEN r.name
                        ELSE CONCAT(p.func_name, ' · ', p.action) END AS target_name
            FROM sys_permission_apply a
            JOIN sys_user u ON u.id = a.applicant_id
            LEFT JOIN sys_user ap ON ap.id = a.approver_id
            LEFT JOIN sys_role r ON a.target_type = 'ROLE' AND r.id = a.target_id
            LEFT JOIN sys_permission p ON a.target_type = 'PERM' AND p.id = a.target_id
            """;

    @Insert("""
            INSERT INTO sys_permission_apply (applicant_id, target_type, target_id, apply_reason, status)
            VALUES (#{applicantId}, #{targetType}, #{targetId}, #{applyReason}, 0)
            """)
    @Options(useGeneratedKeys = true, keyProperty = "id", keyColumn = "id")
    int insert(ApplyRow row);

    @Select(BASE + " WHERE a.id = #{id}")
    ApplyRow findById(@Param("id") long id);

    @Select(BASE + " WHERE a.applicant_id = #{applicantId} ORDER BY a.id DESC")
    List<ApplyRow> listMine(@Param("applicantId") long applicantId);

    // 仅返回审批人所在部门（其担任 manager 的部门）下属的申请
    @Select(BASE + """
             WHERE a.status = #{status}
               AND u.department_id = (
                   SELECT d.id FROM sys_department d WHERE d.manager_id = #{managerId} LIMIT 1
               )
             ORDER BY a.id
            """)
    List<ApplyRow> listByStatus(@Param("status") int status, @Param("managerId") long managerId);

    @Select("SELECT id FROM sys_department WHERE manager_id = #{userId} LIMIT 1")
    Long managedDepartmentOf(@Param("userId") long userId);

    @Select("SELECT department_id FROM sys_user WHERE id = #{userId}")
    Long departmentOfUser(@Param("userId") long userId);

    @Update("""
            UPDATE sys_permission_apply
               SET status = #{status}, approver_id = #{approverId},
                   approve_time = NOW(), approve_comment = #{comment}
             WHERE id = #{id} AND status = 0
            """)
    int decide(@Param("id") long id, @Param("status") int status,
               @Param("approverId") long approverId, @Param("comment") String comment);

    @Select("""
            SELECT COUNT(*) FROM sys_permission_apply
            WHERE applicant_id = #{applicantId} AND target_type = #{targetType}
              AND target_id = #{targetId} AND status = 0
            """)
    long countPending(@Param("applicantId") long applicantId,
                      @Param("targetType") String targetType,
                      @Param("targetId") long targetId);

    @Select("""
            SELECT COUNT(*)
            FROM sys_user_role ur
            JOIN sys_role r ON r.id = ur.role_id AND r.status = 1
            WHERE ur.user_id = #{userId}
              AND r.code IN ('SUPER_ADMIN', 'SYS_ADMIN', 'SEC_ADMIN')
            """)
    long isAdmin(@Param("userId") long userId);

    @Select(BASE + " WHERE a.status = #{status} ORDER BY a.id")
    List<ApplyRow> listAllByStatus(@Param("status") int status);
}
