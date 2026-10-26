package com.iam.department;

import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class DepartmentService {
    private final DepartmentMapper departmentMapper;

    public DepartmentService(DepartmentMapper departmentMapper) {
        this.departmentMapper = departmentMapper;
    }

    public List<Map<String, Object>> list() {
        List<DepartmentMapper.DepartmentRow> rows = departmentMapper.list();
        Map<Long, DepartmentMapper.DepartmentRow> byId = new LinkedHashMap<>();
        for (DepartmentMapper.DepartmentRow row : rows) {
            byId.put(row.getId(), row);
        }

        List<Map<String, Object>> result = new ArrayList<>();
        for (DepartmentMapper.DepartmentRow row : rows) {
            List<String> names = new ArrayList<>();
            collectPath(row, byId, names, new HashSet<>());
            Collections.reverse(names);

            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", row.getId());
            item.put("parentId", row.getParentId());
            item.put("name", row.getName());
            item.put("managerId", row.getManagerId());
            item.put("managerName", row.getManagerName());
            item.put("path", String.join(" / ", names));
            item.put("depth", Math.max(0, names.size() - 1));
            result.add(item);
        }
        return result;
    }

    private void collectPath(DepartmentMapper.DepartmentRow row,
                             Map<Long, DepartmentMapper.DepartmentRow> byId,
                             List<String> names,
                             Set<Long> visited) {
        if (row == null || !visited.add(row.getId())) {
            return;
        }
        names.add(row.getName());
        if (row.getParentId() != null) {
            collectPath(byId.get(row.getParentId()), byId, names, visited);
        }
    }
}
