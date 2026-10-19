package com.iam.common;

import java.util.Set;

public final class SessionContext {
    public record Current(long userId, String account, String name, String token, Set<String> perms) {}

    private static final ThreadLocal<Current> HOLDER = new ThreadLocal<>();

    private SessionContext() {}

    public static void set(Current c) { HOLDER.set(c); }
    public static Current get() { return HOLDER.get(); }
    public static void clear() { HOLDER.remove(); }

    public static long userId() {
        Current c = HOLDER.get();
        if (c == null) { throw new BizException(401, "未登录"); }
        return c.userId();
    }
}
