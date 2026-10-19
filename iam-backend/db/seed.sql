-- 种子数据：3 个账号 / 3 个角色 / 17 枚权限
-- 密码均为 123456（BCrypt, cost 10）

USE iam_rbac;

INSERT INTO sys_user (id, account, name, phone, password_hash, status) VALUES
  (1, 'SG900001', '系统管理员', '13800000001', '$2b$10$r44dGDsd.e4rba9YRFd5tuIZMQZ2wdZclFOrjrJgw4.E86zr.KgCi', 1),
  (2, 'SG000101', '张伟',      '13800000101', '$2b$10$Qfozjc8o2GXP12yDg0pmUOXUuaZZyAlPBjYDvbesJGCz2IllKxvVS', 1),
  (3, 'SG000102', '李四',      '13800000102', '$2b$10$VeXQVtel5P7fZrCcZ.esK.f3nSAW0UiLbhF54W3E8fev.HSvSXu0u', 1);

INSERT INTO sys_role (id, code, name, remark, status) VALUES
  (1, 'ADMIN', '系统管理员', '拥有全部权限，负责用户、角色与权限维护', 1),
  (2, 'MGR',   '部门主管',   '可查看用户与角色，可查看部分业务报表', 1),
  (3, 'EMP',   '普通员工',   '仅基础查看权限', 1);

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
  (17, 'PM',  '项目系统', '成本管理', 'PM:COST',   '成本报表', 'VIEW',        'PM:COST:VIEW',     1, 70);

INSERT INTO sys_user_role (user_id, role_id) VALUES
  (1, 1),
  (2, 2),
  (3, 3);

-- ADMIN：全部 17 枚
INSERT INTO sys_role_permission (role_id, permission_id)
SELECT 1, id FROM sys_permission;

-- MGR：8 枚
INSERT INTO sys_role_permission (role_id, permission_id) VALUES
  (2, 1), (2, 2), (2, 7), (2, 12), (2, 13), (2, 14), (2, 15), (2, 17);

-- EMP：2 枚
INSERT INTO sys_role_permission (role_id, permission_id) VALUES
  (3, 1), (3, 13);
