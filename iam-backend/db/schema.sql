-- IAM RBAC + 完整组织架构 + 三权分立
-- MySQL 8.0 / InnoDB / utf8mb4

CREATE DATABASE IF NOT EXISTS iam_rbac
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_0900_ai_ci;

USE iam_rbac;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS sys_audit_log;
DROP TABLE IF EXISTS sys_permission_apply;
DROP TABLE IF EXISTS sys_user_permission;
DROP TABLE IF EXISTS sys_session;
DROP TABLE IF EXISTS sys_user_role;
DROP TABLE IF EXISTS sys_role_permission;
DROP TABLE IF EXISTS sys_permission;
DROP TABLE IF EXISTS sys_role;
DROP TABLE IF EXISTS sys_user;
DROP TABLE IF EXISTS sys_department;
SET FOREIGN_KEY_CHECKS = 1;

-- 1. 部门树：parent_id 表示上级部门；根节点为总公司
CREATE TABLE sys_department (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  parent_id  BIGINT UNSIGNED NULL COMMENT '上级部门 ID',
  name       VARCHAR(128)    NOT NULL COMMENT '部门全称',
  manager_id BIGINT UNSIGNED NULL COMMENT '部门经理用户 ID',
  created_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_dept_parent_name (parent_id, name),
  KEY idx_dept_parent (parent_id),
  KEY idx_dept_manager (manager_id),
  CONSTRAINT fk_dept_parent
    FOREIGN KEY (parent_id) REFERENCES sys_department (id) ON DELETE SET NULL
) ENGINE=InnoDB COMMENT='部门树';

-- 2. 用户：账号来自真实员工表用户名
CREATE TABLE sys_user (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  account       VARCHAR(32)     NOT NULL COMMENT 'SG 工号，创建后不可修改',
  name          VARCHAR(64)     NOT NULL COMMENT '姓名',
  phone         VARCHAR(20)     NULL,
  password_hash VARCHAR(100)    NOT NULL COMMENT 'BCrypt',
  status        TINYINT         NOT NULL DEFAULT 1 COMMENT '1 启用 / 0 停用',
  department_id BIGINT UNSIGNED NULL COMMENT '所属部门 ID',
  created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_user_account (account),
  KEY idx_user_dept (department_id),
  CONSTRAINT fk_user_dept
    FOREIGN KEY (department_id) REFERENCES sys_department (id) ON DELETE SET NULL
) ENGINE=InnoDB COMMENT='用户';

-- 3. 角色：三权分立角色 + 部门主管 / 普通员工
CREATE TABLE sys_role (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code       VARCHAR(32)     NOT NULL,
  name       VARCHAR(64)     NOT NULL,
  remark     VARCHAR(255)    NULL,
  status     TINYINT         NOT NULL DEFAULT 1 COMMENT '1 启用 / 0 停用',
  created_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_role_code (code)
) ENGINE=InnoDB COMMENT='角色';

-- 4. 权限：管理操作 + 功能点 × 操作
CREATE TABLE sys_permission (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  sys_code    VARCHAR(16)     NOT NULL COMMENT 'IAM / OA / IM / KM',
  sys_name    VARCHAR(64)     NOT NULL,
  module_name VARCHAR(64)     NOT NULL,
  func_code   VARCHAR(64)     NOT NULL,
  func_name   VARCHAR(128)    NOT NULL,
  action      VARCHAR(16)     NOT NULL,
  perm_code   VARCHAR(128)    NOT NULL COMMENT '系统:模块:功能:动作',
  status      TINYINT         NOT NULL DEFAULT 1,
  sort_no     INT             NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uk_perm_code (perm_code),
  UNIQUE KEY uk_perm_func_action (sys_code, func_code, action),
  KEY idx_perm_sys (sys_code)
) ENGINE=InnoDB COMMENT='权限目录';

-- 5. 用户角色
CREATE TABLE sys_user_role (
  user_id    BIGINT UNSIGNED NOT NULL,
  role_id    BIGINT UNSIGNED NOT NULL,
  created_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, role_id),
  KEY idx_ur_role (role_id),
  CONSTRAINT fk_ur_user
    FOREIGN KEY (user_id) REFERENCES sys_user (id) ON DELETE CASCADE,
  CONSTRAINT fk_ur_role
    FOREIGN KEY (role_id) REFERENCES sys_role (id) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='用户角色';

-- 6. 角色权限
CREATE TABLE sys_role_permission (
  role_id       BIGINT UNSIGNED NOT NULL,
  permission_id BIGINT UNSIGNED NOT NULL,
  created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (role_id, permission_id),
  KEY idx_rp_perm (permission_id),
  CONSTRAINT fk_rp_role
    FOREIGN KEY (role_id) REFERENCES sys_role (id) ON DELETE CASCADE,
  CONSTRAINT fk_rp_perm
    FOREIGN KEY (permission_id) REFERENCES sys_permission (id) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='角色权限';

-- 7. 会话
CREATE TABLE sys_session (
  id         CHAR(36)        NOT NULL COMMENT 'UUID Bearer Token',
  user_id    BIGINT UNSIGNED NOT NULL,
  issued_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expire_at  DATETIME        NOT NULL COMMENT '当日 23:59:59',
  revoked_at DATETIME        NULL,
  ip         VARCHAR(45)     NULL,
  user_agent VARCHAR(255)    NULL,
  PRIMARY KEY (id),
  KEY idx_session_user (user_id),
  KEY idx_session_expire (expire_at),
  CONSTRAINT fk_session_user
    FOREIGN KEY (user_id) REFERENCES sys_user (id) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='登录会话';

-- 8. 用户直接权限：默认查看权与例外授予
CREATE TABLE sys_user_permission (
  user_id       BIGINT UNSIGNED NOT NULL,
  permission_id BIGINT UNSIGNED NOT NULL,
  apply_id      BIGINT UNSIGNED NULL,
  granted_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, permission_id),
  KEY idx_up_perm (permission_id),
  KEY idx_up_apply (apply_id),
  CONSTRAINT fk_up_user
    FOREIGN KEY (user_id) REFERENCES sys_user (id) ON DELETE CASCADE,
  CONSTRAINT fk_up_perm
    FOREIGN KEY (permission_id) REFERENCES sys_permission (id) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='用户直接权限';

-- 9. 权限申请
CREATE TABLE sys_permission_apply (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  applicant_id    BIGINT UNSIGNED NOT NULL,
  target_type     CHAR(4)         NOT NULL COMMENT 'ROLE / PERM',
  target_id       BIGINT UNSIGNED NOT NULL,
  apply_reason    VARCHAR(500)    NOT NULL,
  status          TINYINT         NOT NULL DEFAULT 0 COMMENT '0 待审批 / 1 通过 / 2 驳回',
  approver_id     BIGINT UNSIGNED NULL,
  approve_time    DATETIME        NULL,
  approve_comment VARCHAR(255)    NULL,
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_apply_status (status, created_at),
  KEY idx_apply_applicant (applicant_id),
  KEY idx_apply_target (target_type, target_id),
  CONSTRAINT fk_apply_user
    FOREIGN KEY (applicant_id) REFERENCES sys_user (id) ON DELETE CASCADE,
  CONSTRAINT fk_apply_approver
    FOREIGN KEY (approver_id) REFERENCES sys_user (id) ON DELETE SET NULL
) ENGINE=InnoDB COMMENT='权限申请';

-- 10. 审计日志：角色变更与审批结果留痕
CREATE TABLE sys_audit_log (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  operator_id    BIGINT UNSIGNED NOT NULL,
  operator_name  VARCHAR(64)     NOT NULL,
  action         VARCHAR(32)     NOT NULL COMMENT 'ROLE_ASSIGN / ROLE_REMOVE / APPLY_DECIDE',
  target_user_id BIGINT UNSIGNED NULL,
  detail         VARCHAR(1000)   NOT NULL,
  created_at     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_audit_created (created_at),
  KEY idx_audit_action (action),
  KEY idx_audit_target (target_user_id)
) ENGINE=InnoDB COMMENT='审计日志';
