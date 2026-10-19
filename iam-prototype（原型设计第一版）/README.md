# IAM 交互原型 v0.4

纯静态前端，双击 `index.html` 即可打开（file:// 可用，未使用 ES Module）。

## 登录

- 账号 = 工号，初始密码统一为 `123456`
- 连续失败 5 次锁定 15 分钟；登录态当日 23:59 失效
- 右上角「退出登录」后回到登录页，换一个工号即可切换身份

| 工号 | 姓名 | 身份 |
| --- | --- | --- |
| SG000292 | 万贵 | 技术员（普通员工） |
| SG000188 | 沈祥 | 第一项目经理部经理（审批人） |
| SG000011 | 曾禄 | 道路工程分公司经理 |
| SG900001 | 周涛 | IAM 安全管理员 |
| SG900002 | 赵敏 | IAM 系统管理员 |
| SG900003 | 孙莉 | 审计员 |
| OS000021 | 陈立 | 外包项目经理（中软国际） |

演示可直接打开 `index.html?login=SG000292` 自动登录（等价于用工号 + 初始密码登录）。

## 目录

```
iam-prototype/
├── index.html          外壳：登录态、导航、顶部账号与退出
├── css/style.css       设计令牌与组件
├── js/mock-data.js     临时数据（相当于未来的表）
├── js/store.js         暂存层：登录态 / 申请单 / 已批准授权（localStorage）
├── js/api.js           接口层：页面只调这里
└── js/app.js           路由 + 各页面渲染
```

## 暂存了什么

| localStorage key | 内容 |
| --- | --- |
| `iam.session` | 当前登录的工号与登录日期（跨日失效） |
| `iam.apps` | 全部申请单，含审批链与每个节点的处理结果 |
| `iam.grants` | 审批通过后写入的授权，会合并进「我的权限」 |
| `iam.lock` | 登录失败计数与锁定截止时间 |

清空浏览器站点数据即可恢复初始状态；也可在控制台执行 `Store.reset()`。

**完整演示路径：** 万贵登录 → 提交申请（选功能点与操作）→ 退出 → 沈祥登录审批 → 曾禄登录审批 → 万贵再登录，台账里会多出这条权限，来源显示为例外授予。

## 路由

| 路由 | 页面 |
| --- | --- |
| `#/perms` / `#/perms/:fnId` | 我的权限 / 权限详情（判定链路） |
| `#/apply` | 提交申请（真实写入暂存） |
| `#/apps` / `#/apps/:id` | 我的申请 / 申请单详情（可同意、驳回） |
| `#/approvals` | 待我审批 |
| `#/roles` / `#/roles/:roleId` | 角色模板 / 角色详情 |
| `#/diff` | 分公司与部门差量 |
| `#/projects` / `#/projects/:pid` | 项目权限 / 项目详情 |
| `#/org` / `#/org/:uid` | 组织与账号 / 人员详情 |
| `#/audit` / `#/audit/:logId` | 审计日志 / 日志详情 |

## 接后端要改哪里

页面不直接读写 `MOCK` 与 `localStorage`，只调用 `Api.*`。把 `js/api.js` 的方法体换成 `fetch`、把 `js/store.js` 的调用改成后端接口即可，页面代码不用动。

| Api 方法 | 建议的 REST 接口 |
| --- | --- |
| `login(account, password)` | `POST /api/auth/login` |
| `logout()` | `POST /api/auth/logout` |
| `getSession()` | `GET /api/session` |
| `listMyPermissions(userId)` | `GET /api/users/{id}/permissions` |
| `getPermission(userId, fnId)` | `GET /api/users/{id}/permissions/{fnId}` |
| `submitApplication(data)` | `POST /api/applications` |
| `listApplications(filter)` | `GET /api/applications?status=&applicant=&current=` |
| `getApplication(id)` | `GET /api/applications/{id}` |
| `decideApplication(id, action, comment)` | `POST /api/applications/{id}/decisions` |
| `listRoles()` / `getRole(id)` | `GET /api/roles`、`GET /api/roles/{id}` |
| `listDeltas(scope)` | `GET /api/deltas?company=&dept=&post=` |
| `listProjects()` / `getProject(id)` | `GET /api/projects`、`GET /api/projects/{id}` |
| `getUser(id)` | `GET /api/users/{id}` |
| `listLogs(filter)` / `getLog(id)` | `GET /api/logs`、`GET /api/logs/{id}` |

所有方法返回 `Promise<{ code, data, message }>`；`code !== 0` 时页面显示错误条。

## 数据约定

- 操作位：`查看 / 新增 / 编辑 / 审批 / 导出`；外包资源用 `读 / 写 / 部署`。
- 来源：`TEMPLATE`、`DEPT_DELTA`、`COMPANY_DELTA`、`EXCEPTION`、`PLATFORM`、`PROJECT`、`NONE`。
- 敏感级：`L1` 一般、`L2` 重要、`L3` 高敏，决定例外审批链长度（1 / 2 / 3 级）。
- `UserSource`：`INTERNAL / EXTERNAL / OUTSOURCE`。

## 尚未实现

- 密码明文校验、登录态无签名（接后端后由服务端下发会话）
- 审批通过后不写审计日志（当前只更新申请单与授权）
- 转办、撤回、草稿未落库
- 越权校验只在前端做菜单隐藏，真实环境须由后端按会话鉴权
