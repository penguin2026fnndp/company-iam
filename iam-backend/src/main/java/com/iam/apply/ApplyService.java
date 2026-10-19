package com.iam.apply;

import com.iam.common.BizException;
import com.iam.common.SessionMapper;
import com.iam.permission.PermissionMapper;
import com.iam.role.RoleMapper;
import com.iam.user.UserMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
public class ApplyService {
    private static final Logger log = LoggerFactory.getLogger(ApplyService.class);

    private final ApplyMapper applyMapper;
    private final UserMapper userMapper;
    private final RoleMapper roleMapper;
    private final PermissionMapper permissionMapper;
    private final SessionMapper sessionMapper;

    public ApplyService(ApplyMapper applyMapper, UserMapper userMapper, RoleMapper roleMapper,
                        PermissionMapper permissionMapper, SessionMapper sessionMapper) {
        this.applyMapper = applyMapper;
        this.userMapper = userMapper;
        this.roleMapper = roleMapper;
        this.permissionMapper = permissionMapper;
        this.sessionMapper = sessionMapper;
    }

    @Transactional
    public Map<String, Object> submit(long applicantId, String targetType, Long targetId, String reason) {
        String type = targetType == null ? "" : targetType.trim().toUpperCase(Locale.ROOT);
        if (!type.equals("ROLE") && !type.equals("PERM")) {
            throw new IllegalArgumentException("targetType 只能是 ROLE 或 PERM");
        }
        if (targetId == null) { throw new IllegalArgumentException("targetId 不能为空"); }
        if (reason == null || reason.trim().length() < 4) { throw new IllegalArgumentException("申请理由至少 4 个字"); }

        if (type.equals("ROLE")) {
            if (roleMapper.findById(targetId) == null) { throw new IllegalArgumentException("角色不存在：" + targetId); }
            if (userMapper.countRole(applicantId, targetId) > 0) { throw new BizException(409, "已拥有该角色，无需申请"); }
        } else {
            PermissionMapper.PermRow perm = permissionMapper.findById(targetId);
            if (perm == null) { throw new IllegalArgumentException("权限不存在：" + targetId); }
            Set<String> owned = new HashSet<>(permissionMapper.codesOf(applicantId));
            if (owned.contains(perm.getPermCode())) { throw new BizException(409, "已拥有该权限，无需申请"); }
        }

        if (applyMapper.countPending(applicantId, type, targetId) > 0) {
            throw new BizException(409, "该目标已有待审批申请，请勿重复提交");
        }

        ApplyMapper.ApplyRow row = new ApplyMapper.ApplyRow();
        row.setApplicantId(applicantId);
        row.setTargetType(type);
        row.setTargetId(targetId);
        row.setApplyReason(reason.trim());
        applyMapper.insert(row);

        log.info("AUDIT apply-submit applicant={} type={} target={} id={}", applicantId, type, targetId, row.getId());
        return view(applyMapper.findById(row.getId()));
    }

    public List<Map<String, Object>> mine(long applicantId) {
        List<Map<String, Object>> list = new ArrayList<>();
        for (ApplyMapper.ApplyRow r : applyMapper.listMine(applicantId)) { list.add(view(r)); }
        return list;
    }

    public List<Map<String, Object>> byStatus(int status) {
        List<Map<String, Object>> list = new ArrayList<>();
        for (ApplyMapper.ApplyRow r : applyMapper.listByStatus(status)) { list.add(view(r)); }
        return list;
    }

    @Transactional
    public Map<String, Object> decide(long id, String action, String comment, long approverId) {
        ApplyMapper.ApplyRow row = applyMapper.findById(id);
        if (row == null) { throw new BizException(404, "申请单不存在"); }
        if (row.getStatus() == null || row.getStatus() != 0) { throw new BizException(409, "该申请已处理"); }

        String act = action == null ? "" : action.trim().toUpperCase(Locale.ROOT);
        boolean approve = act.equals("APPROVE") || act.equals("PASS");
        boolean reject = act.equals("REJECT");
        if (!approve && !reject) { throw new IllegalArgumentException("action 只能是 APPROVE 或 REJECT"); }
        if (reject && (comment == null || comment.trim().isEmpty())) {
            throw new IllegalArgumentException("驳回必须填写原因");
        }

        if (approve) {
            if ("ROLE".equals(row.getTargetType())) {
                if (userMapper.countRole(row.getApplicantId(), row.getTargetId()) == 0) {
                    userMapper.addRole(row.getApplicantId(), row.getTargetId());
                }
            } else {
                if (permissionMapper.countDirect(row.getApplicantId(), row.getTargetId()) == 0) {
                    permissionMapper.addDirect(row.getApplicantId(), row.getTargetId(), row.getId());
                }
            }
            // 让新权限在下一次登录时生效
            sessionMapper.revokeByUser(row.getApplicantId());
        }

        int status = approve ? 1 : 2;
        applyMapper.decide(id, status, approverId, comment);
        log.info("AUDIT apply-decide operator={} applyId={} result={} target={}:{}",
                approverId, id, approve ? "APPROVED" : "REJECTED", row.getTargetType(), row.getTargetId());
        return view(applyMapper.findById(id));
    }

    private Map<String, Object> view(ApplyMapper.ApplyRow r) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", r.getId());
        m.put("applicantId", r.getApplicantId());
        m.put("applicantName", r.getApplicantName());
        m.put("targetType", r.getTargetType());
        m.put("targetId", r.getTargetId());
        m.put("targetName", r.getTargetName());
        m.put("reason", r.getApplyReason());
        m.put("status", r.getStatus());
        m.put("statusText", r.getStatus() == null ? "" : (r.getStatus() == 0 ? "待审批" : (r.getStatus() == 1 ? "已通过" : "已驳回")));
        m.put("approverId", r.getApproverId());
        m.put("approverName", r.getApproverName());
        m.put("approveTime", r.getApproveTime() == null ? null : r.getApproveTime().toString().replace('T', ' '));
        m.put("approveComment", r.getApproveComment());
        m.put("createdAt", r.getCreatedAt() == null ? null : r.getCreatedAt().toString().replace('T', ' '));
        return m;
    }
}
