package com.iam.common;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.iam.permission.PermissionMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;

import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Set;

@Component
public class AuthInterceptor implements HandlerInterceptor {
    private final ObjectMapper json = new ObjectMapper();
    private final SessionMapper sessionMapper;
    private final PermissionMapper permissionMapper;

    public AuthInterceptor(SessionMapper sessionMapper, PermissionMapper permissionMapper) {
        this.sessionMapper = sessionMapper;
        this.permissionMapper = permissionMapper;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        // CORS 预检请求不携带 Authorization，直接放行
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) { return true; }
        if (!(handler instanceof HandlerMethod method)) { return true; }
        String path = request.getRequestURI();
        if (path.equals("/api/ping") || path.equals("/api/auth/login")) { return true; }

        try {
            String header = request.getHeader("Authorization");
            if (header == null || !header.startsWith("Bearer ")) {
                throw new BizException(401, "未登录");
            }
            String token = header.substring(7).trim();
            SessionMapper.SessionUser su = sessionMapper.findValid(token);
            if (su == null) { throw new BizException(401, "会话已失效，请重新登录"); }

            Set<String> perms = new LinkedHashSet<>(permissionMapper.codesOf(su.getUserId()));
            SessionContext.set(new SessionContext.Current(su.getUserId(), su.getAccount(), su.getName(), token, perms));

            RequirePerm required = method.getMethodAnnotation(RequirePerm.class);
            if (required == null) { required = method.getBeanType().getAnnotation(RequirePerm.class); }
            if (required != null && !perms.contains(required.value())) {
                Map<String, Object> data = new LinkedHashMap<>();
                data.put("requiredPerm", required.value());
                write(response, 403, data, "缺少权限 " + required.value());
                return false;
            }
            return true;
        } catch (BizException e) {
            write(response, e.getCode(), null, e.getMessage());
            return false;
        } finally {
            // 请求结束后由 afterCompletion 清理；异常分支这里保持已设置或为空都不影响
        }
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) {
        SessionContext.clear();
    }

    private void write(HttpServletResponse response, int code, Object data, String message) throws Exception {
        response.setStatus(code);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.setContentType("application/json;charset=UTF-8");
        response.getWriter().write(json.writeValueAsString(new Result(code, data, message)));
    }
}
