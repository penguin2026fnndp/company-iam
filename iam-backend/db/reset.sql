-- 重置演示数据：清空全部表，再按 seed.sql 的内容重灌
-- 用法：mysql -uroot -p < db/reset.sql

USE iam_rbac;

SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE sys_session;
TRUNCATE TABLE sys_permission_apply;
TRUNCATE TABLE sys_user_permission;
TRUNCATE TABLE sys_user_role;
TRUNCATE TABLE sys_role_permission;
TRUNCATE TABLE sys_permission;
TRUNCATE TABLE sys_role;
TRUNCATE TABLE sys_user;
TRUNCATE TABLE sys_department;
SET FOREIGN_KEY_CHECKS = 1;

-- 1. 部门（manager_id 指向技术部主管张伟，不建外键避免与 sys_user 循环依赖）
INSERT INTO sys_department (id, name, manager_id) VALUES
  (1, '技术部', 2),
  (2, '财务部', 10);

-- 2. 用户
INSERT INTO sys_user (id, account, name, phone, password_hash, status, department_id) VALUES
  (1, 'SG900001', '系统管理员', '13800000001', '$2b$10$r44dGDsd.e4rba9YRFd5tuIZMQZ2wdZclFOrjrJgw4.E86zr.KgCi', 1, NULL),
  (2, 'SG000101', '张伟',      '13800000101', '$2b$10$Qfozjc8o2GXP12yDg0pmUOXUuaZZyAlPBjYDvbesJGCz2IllKxvVS', 1, 1),
  (3, 'SG000102', '李四',      '13800000102', '$2b$10$VeXQVtel5P7fZrCcZ.esK.f3nSAW0UiLbhF54W3E8fev.HSvSXu0u', 1, 1),
  (4, 'SG000103', '王五',      '13800000103', '$2b$10$dyezAA90dVOc6y8JQCs0F.YIDu8.Qvhb0NfJByDiTWiQMJYmOKcYy', 1, 2),
  (5, 'SG000001', '薛峰',      '13976537502', '$2b$10$xuwWY62htFzPUIzi85M6Ae2/1pw6GuJwFAifbiP5FTnDexvbTqUlG', 1, NULL),
  (6, 'SG000104', '陈晨',      '13800000104', '$2b$10$jvA5YR0V9rvDqIAQhFGGAed2htCB6mdVVGnRup.gLFUXQHXEg3fUK', 1, 1),
  (7, 'SG000105', '刘洋',      '13800000105', '$2b$10$OHN3yy7ZjDRcnqPG.Ronmu8qTX9mElQKywmjCN/WDH3dYe5xhFDhK', 1, 1),
  (8, 'SG000106', '周敏',      '13800000106', '$2b$10$MhczxZzTqf0WbnqKWgBhOOy/Zb.Eko/lGxpFy8gTX2zd6qdd3eC9C', 1, 2),
  (9, 'SG000107', '吴昊',      '13800000107', '$2b$10$vEFi.qu7MiJZBZwnWQRYieGygsvgEgWV8gD2/C/KUPL.kqatPuUoO', 1, 2),
  (10, 'SG000108', '郑楠',     '13800000108', '$2b$10$dZ6vePGx1bVvDWShNKKXD.BCAt4M4SCM12PqBloqgmn/ctvoLwDjG', 1, 2);

-- 3. 角色（保留 1–3 的历史 ID，新增公司领导、项目经理）
INSERT INTO sys_role (id, code, name, remark, status) VALUES
  (1, 'ADMIN',  '系统管理员', '拥有全部权限，负责用户、角色与权限维护', 1),
  (2, 'MGR',    '部门主管',   '可查看用户与角色，可查看部分业务报表，审批本部门申请', 1),
  (3, 'EMP',    '普通员工',   '仅基础查看权限', 1),
  (4, 'LEADER', '公司领导',   '查看、导出与审批类权限', 1),
  (5, 'PM',     '项目经理',   '项目现场与成本查看、新增权限', 1);

-- 4. 权限（20 枚基础权限）
INSERT INTO sys_permission (id, sys_code, sys_name, module_name, func_code, func_name, action, perm_code, status, sort_no) VALUES
  (1,  'IAM', '权限中心', '我的权限', 'ME',        '我的权限', 'VIEW',        'ME:VIEW',          1, 10),
  (2,  'IAM', '权限中心', '用户管理', 'USER',      '用户',     'VIEW',        'USER:VIEW',        1, 20),
  (3,  'IAM', '权限中心', '用户管理', 'USER',      '用户',     'ADD',         'USER:ADD',         1, 21),
  (4,  'IAM', '权限中心', '用户管理', 'USER',      '用户',     'EDIT',        'USER:EDIT',        1, 22),
  (5,  'IAM', '权限中心', '用户管理', 'USER',      '用户',     'DELETE',      'USER:DELETE',      1, 23),
  (6,  'IAM', '权限中心', '用户管理', 'USER',      '用户角色', 'ASSIGN_ROLE', 'USER:ASSIGN_ROLE', 1, 24),
  (7,  'IAM', '权限中心', '角色管理', 'ROLE',      '角色',     'VIEW',        'ROLE:VIEW',        1, 30),
  (8,  'IAM', '权限中心', '角色管理', 'ROLE',      '角色',     'ADD',         'ROLE:ADD',         1, 31),
  (9,  'IAM', '权限中心', '角色管理', 'ROLE',      '角色',     'EDIT',        'ROLE:EDIT',        1, 32),
  (10, 'IAM', '权限中心', '角色管理', 'ROLE',      '角色',     'DELETE',      'ROLE:DELETE',      1, 33),
  (11, 'IAM', '权限中心', '角色管理', 'ROLE_PERM', '角色权限', 'ASSIGN_PERM', 'ROLE:ASSIGN_PERM', 1, 34),
  (12, 'IAM', '权限中心', '权限目录', 'PERM',      '权限',     'VIEW',        'PERM:VIEW',        1, 40),
  (13, 'OA',  'OA系统',   '公文管理', 'OA:DOC',    '收文登记', 'VIEW',        'OA:DOC:VIEW',      1, 50),
  (14, 'OA',  'OA系统',   '公文管理', 'OA:DOC',    '收文登记', 'ADD',         'OA:DOC:ADD',       1, 51),
  (15, 'FIN', '财务系统', '财务报表', 'FIN:RPT',   '财务报表', 'VIEW',        'FIN:RPT:VIEW',     1, 60),
  (16, 'FIN', '财务系统', '财务报表', 'FIN:RPT',   '财务报表', 'EXPORT',      'FIN:RPT:EXPORT',   1, 61),
  (17, 'PM',  '项目系统', '成本管理', 'PM:COST',   '成本报表', 'VIEW',        'PM:COST:VIEW',     1, 70),
  (18, 'IAM', '权限中心', '权限申请', 'APPLY',     '权限申请', 'APPROVE',     'APPLY:APPROVE',    1, 80),
  (19, 'IAM', '权限中心', '权限目录', 'PERM',      '权限',     'ADD',         'PERM:ADD',         1, 41),
  (20, 'IAM', '权限中心', '权限目录', 'PERM',      '权限',     'DELETE',      'PERM:DELETE',      1, 42);

-- 5. 用户角色
INSERT INTO sys_user_role (user_id, role_id) VALUES
  (1, 1),   -- 系统管理员 → ADMIN
  (2, 2),   -- 张伟 → 部门主管
  (3, 3),   -- 李四 → 普通员工
  (4, 3),   -- 王五 → 普通员工
  (5, 4),   -- 薛峰 → 公司领导
  (6, 3),   -- 陈晨 → 普通员工
  (7, 3),   -- 刘洋 → 普通员工
  (8, 3),   -- 周敏 → 普通员工
  (9, 3),   -- 吴昊 → 普通员工
  (10, 2);  -- 郑楠 → 部门主管（财务部）

-- 6. 角色权限
-- ADMIN：全部 20 枚
INSERT INTO sys_role_permission (role_id, permission_id)
SELECT 1, id FROM sys_permission;

-- MGR（部门主管）：8 枚
INSERT INTO sys_role_permission (role_id, permission_id) VALUES
  (2, 1), (2, 2), (2, 7), (2, 12), (2, 13), (2, 14), (2, 15), (2, 17);

-- EMP（普通员工）：2 枚
INSERT INTO sys_role_permission (role_id, permission_id) VALUES
  (3, 1), (3, 13);

-- LEADER（公司领导）：8 枚（查看 + 导出）
INSERT INTO sys_role_permission (role_id, permission_id) VALUES
  (4, 1), (4, 2), (4, 7), (4, 12), (4, 13), (4, 15), (4, 16), (4, 17);

-- PM（项目经理）：4 枚
INSERT INTO sys_role_permission (role_id, permission_id) VALUES
  (5, 1), (5, 13), (5, 14), (5, 17);

-- 7. 张伟的直接权限：技术部主管需要审批本部门申请
INSERT INTO sys_user_permission (user_id, permission_id, apply_id) VALUES
  (2, 18, NULL),   -- 张伟：技术部主管审批权
  (10, 18, NULL);  -- 郑楠：财务部主管审批权
