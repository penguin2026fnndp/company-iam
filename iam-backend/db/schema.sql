-- IAM RBAC0 · 建库建表
-- MySQL 8.0 / InnoDB / utf8mb4

CREATE DATABASE IF NOT EXISTS iam_rbac
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_0900_ai_ci;

USE iam_rbac;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS sys_permission_apply;
DROP TABLE IF EXISTS sys_user_permission;
DROP TABLE IF EXISTS sys_session;
DROP TABLE IF EXISTS sys_user_role;
DROP TABLE IF EXISTS sys_role_permission;
DROP TABLE IF EXISTS sys_permission;
DROP TABLE IF EXISTS sys_role;
DROP TABLE IF EXISTS sys_user;
SET FOREIGN_KEY_CHECKS = 1;

-- 1. 用户：只存身份，不存权限
CREATE TABLE sys_user (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  account       VARCHAR(32)     NOT NULL COMMENT '工号，创建后不可修改',
  name          VARCHAR(32)     NOT NULL COMMENT '姓名',
  phone         VARCHAR(20)     NULL     COMMENT '手机号',
  password_hash VARCHAR(100)    NOT NULL COMMENT 'BCrypt',
  status        TINYINT         NOT NULL DEFAULT 1 COMMENT '1 启用 / 0 停用',
  created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_user_account (account)
) ENGINE=InnoDB COMMENT='用户';

-- 2. 角色：权限包
CREATE TABLE sys_role (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code       VARCHAR(32)     NOT NULL COMMENT '大写字母开头，创建后不可修改',
  name       VARCHAR(32)     NOT NULL,
  remark     VARCHAR(255)    NULL,
  status     TINYINT         NOT NULL DEFAULT 1 COMMENT '1 启用 / 0 停用',
  created_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_role_code (code)
) ENGINE=InnoDB COMMENT='角色';

-- 3. 权限：功能点 × 操作，一行一个权限码
CREATE TABLE sys_permission (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  sys_code    VARCHAR(16)     NOT NULL COMMENT 'IAM / OA / FIN / PM',
  sys_name    VARCHAR(32)     NOT NULL COMMENT '系统名称，用于分组',
  module_name VARCHAR(32)     NOT NULL COMMENT '模块',
  func_code   VARCHAR(32)     NOT NULL COMMENT '功能点编码',
  func_name   VARCHAR(64)     NOT NULL COMMENT '功能点名称',
  action      VARCHAR(16)     NOT NULL COMMENT 'VIEW/ADD/EDIT/DELETE/EXPORT/ASSIGN_ROLE/ASSIGN_PERM',
  perm_code   VARCHAR(64)     NOT NULL COMMENT '权限码，如 USER:VIEW',
  status      TINYINT         NOT NULL DEFAULT 1,
  sort_no     INT             NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uk_perm_code (perm_code),
  UNIQUE KEY uk_perm_func_action (sys_code, func_code, action),
  KEY idx_perm_sys (sys_code)
) ENGINE=InnoDB COMMENT='权限';

-- 4. 用户角色：多对多
CREATE TABLE sys_user_role (
  user_id    BIGINT UNSIGNED NOT NULL,
  role_id    BIGINT UNSIGNED NOT NULL,
  created_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, role_id),
  KEY idx_ur_role (role_id),
  CONSTRAINT fk_ur_user FOREIGN KEY (user_id) REFERENCES sys_user (id) ON DELETE CASCADE,
  CONSTRAINT fk_ur_role FOREIGN KEY (role_id) REFERENCES sys_role (id) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='用户角色';

-- 5. 角色权限：多对多
CREATE TABLE sys_role_permission (
  role_id       BIGINT UNSIGNED NOT NULL,
  permission_id BIGINT UNSIGNED NOT NULL,
  created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (role_id, permission_id),
  KEY idx_rp_perm (permission_id),
  CONSTRAINT fk_rp_role FOREIGN KEY (role_id) REFERENCES sys_role (id) ON DELETE CASCADE,
  CONSTRAINT fk_rp_perm FOREIGN KEY (permission_id) REFERENCES sys_permission (id) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='角色权限';

-- 6. 会话：登录后签发，可被主动撤销
CREATE TABLE sys_session (
  id         CHAR(36)        NOT NULL COMMENT 'UUID，即 Bearer Token',
  user_id    BIGINT UNSIGNED NOT NULL,
  issued_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expire_at  DATETIME        NOT NULL COMMENT '当日 23:59:59',
  revoked_at DATETIME        NULL     COMMENT '主动失效时间',
  ip         VARCHAR(45)     NULL,
  user_agent VARCHAR(255)    NULL,
  PRIMARY KEY (id),
  KEY idx_session_user (user_id),
  KEY idx_session_expire (expire_at),
  CONSTRAINT fk_session_user FOREIGN KEY (user_id) REFERENCES sys_user (id) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='会话';

-- 7. 用户直接权限：审批通过后写入（例外授予）
CREATE TABLE sys_user_permission (
  user_id       BIGINT UNSIGNED NOT NULL,
  permission_id BIGINT UNSIGNED NOT NULL,
  apply_id      BIGINT UNSIGNED NULL COMMENT '来源申请单',
  granted_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, permission_id),
  KEY idx_up_perm (permission_id),
  CONSTRAINT fk_up_user FOREIGN KEY (user_id) REFERENCES sys_user (id) ON DELETE CASCADE,
  CONSTRAINT fk_up_perm FOREIGN KEY (permission_id) REFERENCES sys_permission (id) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='用户直接权限（审批结果）';

-- 8. 权限申请单
CREATE TABLE sys_permission_apply (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  applicant_id    BIGINT UNSIGNED NOT NULL,
  target_type     CHAR(4)         NOT NULL COMMENT 'ROLE / PERM',
  target_id       BIGINT UNSIGNED NOT NULL COMMENT '角色 ID 或权限 ID',
  apply_reason    VARCHAR(500)    NOT NULL,
  status          TINYINT         NOT NULL DEFAULT 0 COMMENT '0待审批 1已通过 2已驳回',
  approver_id     BIGINT UNSIGNED NULL,
  approve_time    DATETIME        NULL,
  approve_comment VARCHAR(255)    NULL,
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_apply_status (status, created_at),
  KEY idx_apply_applicant (applicant_id),
  CONSTRAINT fk_apply_user FOREIGN KEY (applicant_id) REFERENCES sys_user (id) ON DELETE CASCADE,
  CONSTRAINT fk_apply_approver FOREIGN KEY (approver_id) REFERENCES sys_user (id) ON DELETE SET NULL
) ENGINE=InnoDB COMMENT='权限申请单';
