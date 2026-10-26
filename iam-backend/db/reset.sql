-- 清空演示库并重新加载真实数据种子
USE iam_rbac;

SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE sys_audit_log;
TRUNCATE TABLE sys_permission_apply;
TRUNCATE TABLE sys_user_permission;
TRUNCATE TABLE sys_session;
TRUNCATE TABLE sys_user_role;
TRUNCATE TABLE sys_role_permission;
TRUNCATE TABLE sys_permission;
TRUNCATE TABLE sys_role;
TRUNCATE TABLE sys_user;
TRUNCATE TABLE sys_department;
SET FOREIGN_KEY_CHECKS = 1;

SOURCE db/seed.sql;
