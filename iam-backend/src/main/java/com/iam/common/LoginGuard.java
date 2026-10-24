package com.iam.common;

import org.springframework.stereotype.Component;

import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 登录失败计数与锁定。
 * 本地开发用内存实现；生产可替换为 Redis（同一接口语义）。
 */
@Component
public class LoginGuard {
    private static final int MAX_FAIL = 5;
    private static final long LOCK_MS = 15 * 60 * 1000L;

    private static final class Record {
        int count;
        long until;
    }

    private final Map<String, Record> attempts = new ConcurrentHashMap<>();

    /** 剩余锁定毫秒数；0 表示未锁定 */
    public long lockedMillis(String account) {
        Record r = attempts.get(key(account));
        if (r == null) { return 0L; }
        long now = System.currentTimeMillis();
        if (r.until > now) { return r.until - now; }
        if (r.until > 0) { attempts.remove(key(account)); }
        return 0L;
    }

    /**
     * 记录一次失败。
     * @return 剩余可尝试次数；-1 表示本次触发锁定
     */
    public int fail(String account) {
        String k = key(account);
        Record r = attempts.computeIfAbsent(k, x -> new Record());
        synchronized (r) {
            if (r.until > System.currentTimeMillis()) { return -1; }
            r.count++;
            if (r.count >= MAX_FAIL) {
                r.count = 0;
                r.until = System.currentTimeMillis() + LOCK_MS;
                return -1;
            }
            return MAX_FAIL - r.count;
        }
    }

    public void success(String account) {
        attempts.remove(key(account));
    }

    /** 是否处于锁定期 */
    public boolean isLocked(String account) {
        return lockedMillis(account) > 0;
    }

    private String key(String account) {
        return account == null ? "" : account.trim().toUpperCase(Locale.ROOT);
    }
}
