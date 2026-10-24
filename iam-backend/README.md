# IAM 后端（RBAC + 部门数据隔离）

配套文档：[功能清单](docs/01-功能清单.md) · [数据设计](docs/02-数据设计.md) · [实现逻辑](docs/03-实现逻辑.md) · [详细设计](docs/04-详细设计.md) · [覆盖测试指南](docs/05-覆盖测试指南.md)

## 当前范围

- 9 张业务表、10 个种子用户、5 个模板角色、2 个部门、20 枚权限。
- 用户有效权限 = 启用角色权限并集 + 用户直接权限。
- 管理员 `SG900001` 为超级管理员，拥有全部 20 枚权限。
- 张伟 `SG000101` 为技术部主管，拥有 MGR 角色 8 枚权限 + `APPLY:APPROVE` 直接权限，共 9 枚。
- 李四 `SG000102` 属技术部，王五 `SG000103` 属财务部，郑楠 `SG000108` 为财务部主管。
- 审批流程：提交申请 → 本部门主管待办 → 审批 → 自动写角色/权限 → 撤销旧会话 → 重新登录生效。
- 部门隔离：普通主管只能查看和审批自己管辖部门的申请；ADMIN 可查看、审批全系统。
- 用户、角色、权限、直接授权、角色权限矩阵、登录锁定和申请表均已接入 MySQL。

## 技术栈

| 层 | 选型 |
| --- | --- |
| 运行时 | JDK 21 + Spring Boot 3.4.5 |
| 持久层 | MyBatis 3.0.4，Mapper 接口 + 注解 SQL |
| 数据库 | MySQL 8.0，库名 `iam_rbac` |
| 鉴权 | 数据库会话 + Bearer Token + `AuthInterceptor` |
| 密码 | BCrypt |
| API 文档 | Springdoc OpenAPI / Swagger UI |
| 测试 | JUnit 5 + Mockito + JaCoCo + Postman / Newman |

## 本地启动

```powershell
cd C:\Users\27642\Documents\Codex\2026-10-16\yu\outputs\iam-backend

# 首次建库，或表结构变更后
mysql -uroot -p --execute="SOURCE db/schema.sql"
mysql -uroot -p --execute="SOURCE db/seed.sql"

# 已有正确表结构时，每轮集成测试前重置演示数据
mysql -uroot -p --execute="SOURCE db/reset.sql"

# 构建并启动
$env:JAVA_HOME = 'C:\Users\27642\AppData\Local\Programs\Eclipse Adoptium\jdk-21.0.12.1+1'
& 'C:\Users\27642\Maven\apache-maven-3.10.0\bin\mvn.cmd' clean package
java -jar target\iam-backend.jar
```

基础地址：`http://127.0.0.1:8080`

Swagger UI：`http://127.0.0.1:8080/swagger-ui.html`

演示账号初始密码均为 `123456`：

| 工号 | 姓名 | 说明 |
| --- | --- | --- |
| SG900001 | 系统管理员 | ADMIN，全系统管理 |
| SG000101 | 张伟 | 技术部主管，9 枚有效权限 |
| SG000102 | 李四 | 技术部员工 |
| SG000103 | 王五 | 财务部员工 |
| SG000108 | 郑楠 | 财务部主管 |

## 自动化测试

白盒测试：

```powershell
& 'C:\Users\27642\Maven\apache-maven-3.10.0\bin\mvn.cmd' clean test
```

- 当前共 3 个测试类、12 个 JUnit 5 测试。
- 覆盖登录、密码错误、5 次锁定、权限数量、同部门审批、跨部门 403、管理员全量待办。
- 覆盖率报告：`target/site/jacoco/index.html`。

黑盒集成测试：

```powershell
newman run IAM-API.postman_collection.json
```

- 当前集合：7 个文件夹、79 个请求。
- 最近一次本地实测：79 个请求、113 条断言、0 失败。
- 每轮运行前执行 `db/reset.sql`，并确保运行的是最新 JAR。

## 云端部署

打包后上传可执行 JAR 到华为云 ECS，按 [部署说明](deploy/README-部署.md) 配置 JDK、MySQL、systemd 和 Nginx。数据库连接配置位于 `src/main/resources/application.yml`。
