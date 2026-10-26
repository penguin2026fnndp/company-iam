package com.iam.application;

import com.iam.common.BizException;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class ApplicationService {
    private static final Set<String> SUPPORTED = Set.of("OA", "IM", "KM");
    private static final Map<String, String> ACTION_NAMES = Map.of(
            "VIEW", "查看",
            "ADD", "新增",
            "EDIT", "编辑",
            "DELETE", "删除",
            "EXPORT", "导出",
            "APPROVE", "审批",
            "ASSIGN", "分配",
            "ASSIGN_ROLE", "分配角色",
            "ASSIGN_PERM", "分配权限"
    );

    private final ApplicationMapper applicationMapper;

    public ApplicationService(ApplicationMapper applicationMapper) {
        this.applicationMapper = applicationMapper;
    }

    public List<Map<String, Object>> list() {
        List<Map<String, Object>> result = new ArrayList<>();
        for (ApplicationMapper.ApplicationRow row : applicationMapper.listSupported()) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("sysCode", row.getSysCode());
            item.put("sysName", row.getSysName());
            result.add(item);
        }
        return result;
    }

    public Map<String, Object> myPermissions(long userId, String sysCode) {
        String code = normalize(sysCode);
        ApplicationMapper.ApplicationRow application = applicationMapper.findSystem(code);
        if (application == null) {
            throw new BizException(404, "应用软件不存在");
        }

        List<Map<String, Object>> permissions = new ArrayList<>();
        for (ApplicationMapper.PermissionRow row : applicationMapper.userPermissionsOf(userId, code)) {
            String actionName = ACTION_NAMES.getOrDefault(row.getAction(), row.getAction());
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", row.getId());
            item.put("permCode", row.getPermCode());
            item.put("moduleName", row.getModuleName());
            item.put("funcName", row.getFuncName());
            item.put("action", row.getAction());
            item.put("actionName", actionName);
            item.put("description", "您拥有【" + row.getModuleName() + "-"
                    + row.getFuncName() + "】的" + actionName + "权限");
            permissions.add(item);
        }

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("sysCode", application.getSysCode());
        data.put("sysName", application.getSysName());
        data.put("permissions", permissions);
        data.put("total", permissions.size());
        return data;
    }

    private String normalize(String sysCode) {
        String code = sysCode == null ? "" : sysCode.trim().toUpperCase(Locale.ROOT);
        if (!SUPPORTED.contains(code)) {
            throw new IllegalArgumentException("不支持的应用系统编码");
        }
        return code;
    }
}
