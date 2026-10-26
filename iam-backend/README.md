# IAM 后端（真实组织数据 + RBAC + 三权分立）

配套文档：[数据设计](docs/02-数据设计.md) · [详细设计](docs/04-详细设计.md) · [覆盖测试指南](docs/05-覆盖测试指南.md)

## 当前范围

- 数据来源：`../datas/` 下的部门、员工和应用软件功能权限清单。
- 组织架构：111 个部门节点，`sys_department.parent_id` 形成总公司、总部部门、分公司、分公司部门和项目经理部的完整树。
- 代表员工：从 10,000 名真实员工中选取 10 人，账号沿用真实 SG 工号，初始密码统一为 `123456`。
- 业务权限：OA 18 个、企业即时通讯 12 个、企业知识库 12 个功能点；每点 6 类动作，共 252 枚业务权限。
- 管理权限：用户、角色、权限目录、部门、审计等 22 枚 IAM 权限，总权限数为 274。
- 角色：`SYS_ADMIN`、`SEC_ADMIN`、`AUDITOR` 三权分立角色，`LEADER`、`MGR`、`PM`、`EMP` 四个业务岗位，以及全量权限角色 `SUPER_ADMIN`。
- 授权来源：业务权限全部来自 Excel 中的岗位列，先写入 `sys_role_permission`，再由用户角色继承；`sys_user_permission` 种子行为 0。
- 应用软件：固定展示 OA、IM、KM，三张系统卡片可下钻到当前用户的自然语言权限清单。
- 个人中心：登录与 `/auth/me` 返回 `departmentId`、`departmentPath`，完整展示总公司到当前部门的层级路径。
- 部门隔离：主管只能查看和审批 `manager_id` 指向本人、且与申请人 `department_id` 相同的申请；SEC_ADMIN 可查看全系统审批。
- 审批闭环：提交申请 → 待办 → 通过/驳回 → 自动写角色或直接权限 → 撤销旧会话 → 重新登录生效。
- 审计闭环：角色分配、角色剥夺、审批通过/驳回均写入 `sys_audit_log`；AUDITOR 与 SUPER_ADMIN 可查看。

## 代表账号与角色

| 工号 | 姓名 | 部门 | 角色 | 有效权限 |
| --- | --- | --- | --- | ---: |
| SG000001 | 薛峰 | 公司领导 | LEADER + SYS_ADMIN | 66 |
| SG000011 | 袁国智 | 综合办公室 | SUPER_ADMIN | 274 |
| SG000047 | 曹瑞 | 人力资源部 | SEC_ADMIN + EMP | 51 |
| SG000101 | 苏武瑞 | 工程技术部 | MGR | 73 |
| SG000191 | 曾禄 | 道路工程分公司 | MGR | 73 |
| SG000197 | 卢晓超 | 道路工程分公司-综合办公室 | MGR | 73 |
| SG000198 | 蒋祯 | 道路工程分公司-综合办公室 | EMP | 44 |
| SG000281 | 沈祥 | 道路工程分公司-第一项目经理部 | PM | 52 |
| SG001371 | 万芳 | 桥梁工程分公司-第一项目经理部 | PM | 52 |
| SG010000 | 卢玉文 | 市政养护分公司-第四项目经理部 | AUDITOR | 48 |

## 技术栈

| 层 | 选型 |
| --- | --- |
| 运行时 | JDK 21 + Spring Boot 3.4.5 |
| 持久层 | MyBatis 3.0.4 |
| 数据库 | MySQL 8.0，库名 `iam_rbac` |
| 鉴权 | 数据库会话 + Bearer Token + `AuthInterceptor` |
| 密码 | BCrypt |
| 测试 | JUnit 5 + Mockito + JaCoCo + Postman / Newman |

## 初始化

```powershell
cd C:\Users\27642\Documents\Codex\2026-10-16\yu\outputs\iam-backend

mysql -uroot -p --execute="SOURCE db/schema.sql"
mysql -uroot -p --execute="SOURCE db/seed.sql"

$env:JAVA_HOME = 'C:\Users\27642\AppData\Local\Programs\Eclipse Adoptium\jdk-21.0.12.1+1'
& 'C:\Users\27642\Maven\apache-maven-3.10.0\bin\mvn.cmd' clean package
java -jar target\iam-backend.jar
```

如果表结构已经是最新版，可用 `SOURCE db/reset.sql` 清空并重新加载种子。

基础地址：`http://127.0.0.1:8080`

Swagger UI：`http://127.0.0.1:8080/swagger-ui.html`

## 前后端联调

打开 `prototype.html`。前端中的 `API_BASE_URL` 默认连接本机：

```js
const API_BASE_URL = 'http://127.0.0.1:8080';
```

云服务器部署时只需改成公网地址。用户编辑弹窗会请求 `GET /api/departments`，展示 111 个节点的完整路径，并支持关键字实时过滤。

应用软件接口：

```text
GET /api/applications
GET /api/applications/{OA|IM|KM}/my-permissions
```

## 自动化测试

```powershell
& 'C:\Users\27642\Maven\apache-maven-3.10.0\bin\mvn.cmd' clean test
newman run IAM-API.postman_collection.json
```

当前 Newman 集合包含 104 个请求、217 条断言，最近一次实测 0 失败。数据库重置后可重复运行。

## 云端部署

打包后上传 `target/iam-backend.jar` 到华为云 ECS，按 [部署说明](deploy/README-部署.md) 配置 JDK、MySQL、systemd 与 Nginx。
