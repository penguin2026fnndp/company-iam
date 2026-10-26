package com.iam.audit;

import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class AuditService {
    private final AuditMapper auditMapper;

    public AuditService(AuditMapper auditMapper) {
        this.auditMapper = auditMapper;
    }

    public void record(long operatorId, String action, Long targetUserId, String detail) {
        String operatorName = auditMapper.findUserName(operatorId);
        if (operatorName == null || operatorName.isBlank()) {
            operatorName = "system";
        }
        String safeDetail = detail == null ? "" : detail.trim();
        if (safeDetail.length() > 1000) {
            safeDetail = safeDetail.substring(0, 1000);
        }
        auditMapper.insert(operatorId, operatorName, action, targetUserId, safeDetail);
    }

    public Map<String, Object> page(int page, int size) {
        int current = Math.max(1, page);
        int pageSize = Math.min(Math.max(1, size), 100);
        long total = auditMapper.count();
        List<Map<String, Object>> list = new ArrayList<>();
        for (AuditMapper.AuditRow row : auditMapper.page((current - 1) * pageSize, pageSize)) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", row.getId());
            item.put("operatorId", row.getOperatorId());
            item.put("operatorName", row.getOperatorName());
            item.put("action", row.getAction());
            item.put("targetUserId", row.getTargetUserId());
            item.put("targetUserName", row.getTargetUserName());
            item.put("detail", row.getDetail());
            item.put("createdAt", row.getCreatedAt() == null
                    ? null : row.getCreatedAt().toString().replace('T', ' '));
            list.add(item);
        }
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("total", total);
        data.put("page", current);
        data.put("size", pageSize);
        data.put("list", list);
        return data;
    }
}
