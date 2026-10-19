# IAM 交互原型 v0.6（RBAC0）

第一次检查专用版本。纯静态前端，双击 `index.html` 即可打开（file:// 可用，未使用 ES Module）。

本版只实现 RBAC0：用户、角色、权限、用户角色、角色权限、会话。角色继承、约束、审批、差量、例外、项目域全部不在本版。

## 登录

- 账号 = 工号，演示密码统一为 `123456`
- 连续失败 5 次锁定 15 分钟；会话当日 23:59 失效（按本地时区计算）
- 登录页提供演示账号，点击即可填入
- 没有注册入口；账号由管理员创建

| 工号 | 姓名 | 角色 | 能看到什么 |
| --- | --- | --- | --- |
| SG900001 | 系统管理员 | ADMIN | 全部菜单，17 枚权限 |
| SG000101 | 张伟 | MGR 部门主管 | 我的权限、财务报表、用户管理、角色管理、权限目录（只读部分操作） |
| SG000102 | 李四 | EMP 普通员工 | 我的权限；被追加“财务专员”后多出财务报表 |

## 目录

```
iam-prototype/
├── index.html          外壳：登录态、导航、顶部账号与退出
├── css/style.css       设计令牌与组件
├── js/mock-data.js     初始数据：用户、角色、权限、菜单、报表
├── js/store.js         暂存层：localStorage + RBAC0 关系计算
├── js/api.js           接口层：会话、校验、用户/角色/权限方法
└── js/app.js           路由 + 页面渲染
```

## 权限怎么算

权限不写在账号上：

```
用户 → sys_user_role → 角色 → sys_role_permission → 权限码
```

`Store.permissionsOf(userId)` 取该用户所有启用角色的权限并集，`Store.hasPerm` 只查这个结果。菜单由 `MOCK.menus` 中的 `perm` 字段过滤，页面路由再守卫一次，`Api.*` 方法内部再校验一次。

改动角色权限或用户角色后，下一次请求立即按新结果计算；分配角色、停用用户、重置密码会主动让该用户会话失效。

## 路由

| 路由 | 页面 | 进入条件 |
| --- | --- | --- |
| `#/perms` | 我的权限 | `ME:VIEW` |
| `#/report` | 财务报表（业务演示） | `FIN:RPT:VIEW` |
| `#/users` / `#/users/:id` | 用户管理 / 用户详情 | `USER:VIEW` |
| `#/roles` / `#/roles/:id` | 角色管理 / 角色详情 | `ROLE:VIEW` |
| `#/permissions` | 权限目录 | `PERM:VIEW` |

直接输入无权访问的地址会显示 403 页，而不是空白或跳回首页。

## 演示路径

1. 用 `SG000102` 登录，只看到“我的权限”；地址栏输入 `#/users`，显示 403。
2. 退出，用 `SG900001` 登录。
3. 角色管理 → 新增“财务专员”（编码 `FIN_SPECIALIST`）。
4. 进入角色详情，勾选“财务报表 · 查看 / 导出”，保存。
5. 用户管理 → 李四 → 勾选“财务专员”（保留“普通员工”）→ 保存。
6. 用 `SG000102` 重新登录，菜单多出“财务报表”，用户管理仍不可见。
7. 打开控制台执行 `Api.listUsers()`，返回 `403`。

## 暂存了什么

| localStorage key | 内容 |
| --- | --- |
| `iam.rbac.users` | 用户、状态、角色 ID 列表 |
| `iam.rbac.roles` | 角色、状态、权限 ID 列表 |
| `iam.rbac.session` | 当前会话：用户、签发时间、到期时间 |
| `iam.rbac.lock` | 登录失败计数与锁定截止时间 |
| `iam.rbac.seeded` | 是否已完成首次播种 |

清空浏览器站点数据即可恢复初始状态；也可在控制台执行 `Store.reset()` 后刷新。

## 接口层

页面不直接读写 `MOCK` 和 localStorage，只调用 `Api.*`。接后端时把方法体换成 `fetch`，页面不用动。

| Api 方法 | 建议的 REST 接口 | 权限码 |
| --- | --- | --- |
| `login` | `POST /api/auth/login` | — |
| `logout` | `POST /api/auth/logout` | 登录即可 |
| `me` | `GET /api/auth/me` | 登录即可 |
| `listUsers` | `GET /api/users` | `USER:VIEW` |
| `createUser` | `POST /api/users` | `USER:ADD` |
| `updateUser` | `PUT /api/users/{id}` | `USER:EDIT` |
| `setUserStatus` | `PUT /api/users/{id}/status` | `USER:EDIT` |
| `resetPassword` | `PUT /api/users/{id}/password` | `USER:EDIT` |
| `deleteUser` | `DELETE /api/users/{id}` | `USER:DELETE` |
| `getUser` | `GET /api/users/{id}` | `USER:VIEW` |
| `setUserRoles` | `PUT /api/users/{id}/roles` | `USER:ASSIGN_ROLE` |
| `listRoles` | `GET /api/roles` | `ROLE:VIEW` |
| `createRole` | `POST /api/roles` | `ROLE:ADD` |
| `updateRole` | `PUT /api/roles/{id}` | `ROLE:EDIT` |
| `deleteRole` | `DELETE /api/roles/{id}` | `ROLE:DELETE` |
| `getRole` | `GET /api/roles/{id}` | `ROLE:VIEW` |
| `setRolePerms` | `PUT /api/roles/{id}/permissions` | `ROLE:ASSIGN_PERM` |
| `listPermissions` | `GET /api/permissions` | `PERM:VIEW` |
| `listSystems` | `GET /api/permissions/systems` | `PERM:VIEW` |
| `report` | `GET /api/report/cost` | `FIN:RPT:VIEW`（导出另需 `FIN:RPT:EXPORT`） |

所有方法返回 `Promise<{ code, data, message }>`；页面按非 0 码提示错误。

## 与 v0.5 原型的区别

- 删除了审批、差量、项目、组织树、审计页面；这些不在第一次检查范围。
- 菜单不再写死在账号的 `screens` 里，改为权限码过滤。
- 权限不再按用户静态写死，改为角色实时计算。
- 去掉了 `?login=` 免密登录入口。
- 会话到期改为本地时间 23:59:59，不再用 UTC 日期。
- 补了用户管理、角色管理、权限矩阵、权限目录四个管理页。

## 演示环境的边界

- 密码明文存在 localStorage，仅用于课堂演示；后端必须 BCrypt。
- 会话是 localStorage 里的 userId + 到期时间，可被篡改；后端必须服务端会话。
- 接口鉴权在 `api.js` 里模拟；真实校验必须在 Controller / Service 层。
- 演示数据只有 3 个账号、3 个角色、17 枚权限，不代表生产规模。
