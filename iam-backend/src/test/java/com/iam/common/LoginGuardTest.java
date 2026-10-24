package com.iam.common;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("LoginGuard 登录失败锁定")
class LoginGuardTest {

    private final LoginGuard guard = new LoginGuard();

    @Test
    @DisplayName("连续 5 次失败后 isLocked 返回 true")
    void locksAfterFiveFailures() {
        for (int i = 0; i < 4; i++) {
            int left = guard.fail("SG000101");
            assertTrue(left >= 0, "前 4 次失败不应触发锁定");
        }
        assertFalse(guard.isLocked("SG000101"), "第 4 次失败后仍未锁定");

        int fifth = guard.fail("SG000101");
        assertEquals(-1, fifth, "第 5 次失败应返回 -1 表示触发锁定");
        assertTrue(guard.isLocked("SG000101"), "第 5 次失败后应处于锁定状态");
        assertTrue(guard.lockedMillis("SG000101") > 0, "剩余锁定时间应大于 0");
    }

    @Test
    @DisplayName("登录成功后计数清零")
    void successResetsCounter() {
        guard.fail("SG000102");
        guard.fail("SG000102");
        guard.success("SG000102");

        assertFalse(guard.isLocked("SG000102"));
        assertEquals(0L, guard.lockedMillis("SG000102"));
    }

    @Test
    @DisplayName("账号大小写与首尾空格归一")
    void normalizesAccount() {
        guard.fail(" sg000101 ");
        int left = guard.fail("SG000101");
        assertEquals(3, left, "两次失败应累计到同一账号");
    }
}
