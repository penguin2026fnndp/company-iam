package com.iam.common;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(BizException.class)
    public Result biz(BizException e) {
        return Result.fail(e.getCode(), e.getMessage());
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public Result illegal(IllegalArgumentException e) {
        return Result.fail(400, e.getMessage());
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public Result unreadable(HttpMessageNotReadableException e) {
        log.warn("request body unreadable: {}", e.getMostSpecificCause().getMessage());
        return Result.fail(400, "请求格式不正确");
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public Result badRequest(Exception e) {
        return Result.fail(400, "请求格式不正确");
    }

    @ExceptionHandler(Exception.class)
    public Result other(Exception e) {
        log.error("unhandled error", e);
        return Result.fail(500, "服务器内部错误");
    }
}
