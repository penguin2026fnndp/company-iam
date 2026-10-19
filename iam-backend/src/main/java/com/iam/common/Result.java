package com.iam.common;

import java.util.LinkedHashMap;
import java.util.Map;

public class Result {
    private int code;
    private Object data;
    private String message;

    public Result() {}

    public Result(int code, Object data, String message) {
        this.code = code;
        this.data = data;
        this.message = message;
    }

    public static Result ok(Object data) { return new Result(0, data, "ok"); }
    public static Result ok() { return new Result(0, null, "ok"); }
    public static Result fail(int code, String message) { return new Result(code, null, message); }

    public static Map<String, Object> map(Object... kv) {
        Map<String, Object> m = new LinkedHashMap<>();
        for (int i = 0; i + 1 < kv.length; i += 2) { m.put(String.valueOf(kv[i]), kv[i + 1]); }
        return m;
    }

    public int getCode() { return code; }
    public void setCode(int code) { this.code = code; }
    public Object getData() { return data; }
    public void setData(Object data) { this.data = data; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
}
