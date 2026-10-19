# IAM 后端（RBAC0 · 第一次检查）

配套文档：[功能清单](docs/01-功能清单.md) · [数据设计](docs/02-数据设计.md) · [实现逻辑](docs/03-实现逻辑.md)

## 范围

只实现 RBAC0：用户、角色、权限、用户角色、角色权限、会话。审批、差量、例外、项目域、组织树全部不做。

- 8 张表、26 个接口、23 个功能、18 枚权限码
- 申请审批闭环：提交申请 → 管理员待办 → 通过后自动写角色/权限 → 会话失效 → 重登生效
- 鉴权三层：菜单过滤、路由守卫、接口校验（本次只做接口层，菜单由 `/auth/me` 下发）
- 前端原型用 mock，后端独立跑，两边不联调

## 技术栈

| 层 | 选型 | 说明 |
| --- | --- | --- |
| 运行时 | JDK 21 + Spring Boot 3.4.5 | |
| 持久层 | MyBatis 3.0.4（Mapper 接口 + 注解 SQL） | 一个功能一条 Controller → Service → Mapper 链 |
| 数据库 | MySQL 8.0 | utf8mb4，InnoDB，外键 + 唯一索引 |
| 鉴权 | 自建会话表 + 拦截器 | 不用 Spring Security 的过滤器链，便于讲解 |
| 密码 | BCrypt（cost 10） | 只引入 `spring-security-crypto`，不启用完整 Security |
| 构建 | Maven 3.10 + 阿里云镜像 | `mvn clean package` 产出可执行 jar |

## 目录

```
iam-backend/
├── pom.xml                 Spring Boot 3.4.5 + MyBatis + MySQL
├── src/main/java/com/iam/   application / common / auth / user / role / permission / report
├── src/main/resources/      application.yml
├── docs/                   功能清单、数据设计、实现逻辑
├── db/                     schema.sql / seed.sql / reset.sql
└── deploy/                 systemd、Nginx、部署手册
```

## 跑起来

```powershell
# 1. 建库（首次）或重置（改了种子/密码算法后必须重置）
mysql -uroot -p < db/schema.sql
mysql -uroot -p < db/seed.sql
# 已有库则直接：mysql -uroot -p < db/reset.sql

# 2. 构建
$env:JAVA_HOME = 'C:\Users\27642\AppData\Local\Programs\Eclipse Adoptium\jdk-21.0.12.1+1'
& 'C:\Users\27642\Maven\apache-maven-3.10.0\bin\mvn.cmd' clean package -DskipTests

# 3. 启动
java -jar target\iam-backend.jar

# 4. 验证
curl.exe -s -X POST http://127.0.0.1:8080/api/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"account\":\"SG900001\",\"password\":\"123456\"}"
```

Linux / 华为云：

```bash
# 用 Maven 构建（JDK 17+ 均可）
mvn clean package -DskipTests

# 或把 target/iam-backend.jar 上传到 /opt/iam/app.jar 后
APP_DIR=/opt/iam bash deploy/run.sh
```

完整步骤、华为云 ECS 部署、Nginx 与 systemd 配置见 **[deploy/README-部署.md](deploy/README-部署.md)**。

## 已验证的行为

| 检查 | 结果 |
| --- | --- |
| 管理员登录 | 200，18 枚权限、5 个菜单，会话到期 23:59:59 |
| 李四登录 | 200，2 枚权限、1 个菜单 |
| 匿名调 `/api/users` | 401 |
| 李四调 `/api/users` | 403，返回 `requiredPerm=USER:VIEW` |
| 新建角色 `FIN_SPECIALIST` | 200，编码唯一校验生效 |
| 给角色配「财务报表 查看/导出」 | 200，角色权限数变为 2 |
| 把角色分配给李四 | 200，旧会话立即失效（再调 `/auth/me` 返回 401） |
| 李四重新登录 | 4 枚权限，菜单多出「财务报表」 |
| 李四访问 `/api/report/cost` | 200，5 行数据，`canExport=true` |

## 本地起库

```bash
mysql -uroot -p < db/schema.sql
mysql -uroot -p < db/seed.sql
```

重置演示数据：`mysql -uroot -p < db/reset.sql`

> 演示账号：`SG900001 / SG000101 / SG000102`，初始密码均为 `123456`。

## 在线文档与测试

- Swagger UI：`http://127.0.0.1:8080/swagger-ui.html`（分组：00 健康检查 / 01 认证 / 02 用户 / 03 角色 / 04 权限 / 05 业务演示）
- Postman 集合：项目根目录 `IAM-API.postman_collection.json`，65 个请求（7 个文件夹），按顺序跑完即为全链路验收
- 每个功能的字段与用例见 [详细设计](docs/04-详细设计.md)

## 登录保护

- 连续失败 5 次锁定 15 分钟（`LoginGuard`，内存实现，返回 429），登录成功清零
- 会话当日 23:59:59 到期；停用用户、改角色、重置密码都会立即撤销会话
- 一期的权限变更只打 `AUDIT ...` 的 INFO 日志，不落库

## 后续可补

1. 用 Redis 替换 `LoginGuard` 的内存计数（多实例部署时必需）
2. `sys_audit_log` 审计表与检索页
3. 登录失败、导出等安全事件的告警
4. 单元测试与 CI
