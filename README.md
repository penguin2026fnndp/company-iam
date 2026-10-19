# 统一权限管理系统 (IAM) - 项目工作区

欢迎来到 **IAM (Identity and Access Management)** 项目仓库。本仓库包含从需求分析、原型设计到后端核心骨架及详细设计的完整物料。

当前项目已完成**后端核心底座及安全基座**的搭建，并通过了全链路接口验证，具备企业级规范。

## 📂 目录结构

- `docs/`：需求规格说明书、数据设计、实现逻辑，以及 **`04-详细设计.md`**（包含 F01-F20 功能卡及接口契约）。
- `db/`：数据库建表脚本（`schema.sql`）、测试数据（`seed.sql`）及重置脚本（`reset.sql`）。
- `src/`：Spring Boot 后端源码。
- `IAM-API.postman_collection.json`：Postman 接口自动化测试集合。

---

## 🚀 快速启动指南

### 1. 环境准备
- **JDK 21**
- **Maven 3.8+**（建议配置阿里云镜像）
- **MySQL 8.0+**

### 2. 初始化数据库
1. 在本地 MySQL 中新建数据库 `iam_rbac`。
2. 执行 `db/reset.sql` 脚本（注意：若使用命令行导入，请加上 `--default-character-set=utf8mb4` 避免中文乱码）。

### 3. 修改配置
打开 `src/main/resources/application.yml`，将 `password` 修改为你本机的真实 MySQL 密码。

### 4. 编译与启动
```bash
# 编译打包（首次会自动从阿里云拉取依赖）
mvn clean package -DskipTests

# 启动服务（默认运行在 8080 端口）
java -jar target/iam-backend.jar
🔍 接口文档与测试
项目已深度集成 Swagger (OpenAPI)，无需额外查看静态文档即可直接在线测试接口。

在线接口文档 (Swagger UI)
服务启动后，在浏览器中访问：
👉 http://127.0.0.1:8080/swagger-ui.html

测试账号：SG900001（管理员）、SG000101（张伟）、SG000102（李四）
默认密码：123456

自动化测试 (Postman)
导入根目录的 IAM-API.postman_collection.json 到 Postman 中。按文件夹顺序执行，即可跑通“登录 -> 鉴权 -> 越权拦截 -> 权限变更闭环”的完整 48 个测试用例。

🛡️ 核心架构与安全特性
认证与安全：使用 BCrypt 进行密码加盐哈希；实现 LoginGuard 防暴力破解机制（连续 5 次失败锁定 15 分钟）。

RBAC 鉴权：基于拦截器（Interceptor）实现细粒度权限控制，越权请求精准返回 403 及缺失的权限码。

参数校验与异常处理：全局异常拦截器（GlobalExceptionHandler）统一包装返回格式；Service 层严格校验非法 ID 与空值，杜绝脏数据入库。

持久层：MyBatis 注解式 SQL，开启驼峰命名映射，操作轻量直观。

📅 当前开发状态与下一步行动
✅ 已完成 (Done)

☑ 业务需求调研与模型设计、双版本原型图输出
☑ 后端基础架构、数据库设计及登录接口闭环
☑ 全局异常拦截、RBAC 拦截器、登录锁定验证通过
☑ Swagger 接口文档集成、Postman 自动化测试集生成
⏳ 待办事项 (To-Do)

基于 04-详细设计.md 补全业务增删改查接口（用户管理、角色管理、菜单管理）。
前端页面开发（登录页、管理后台）。
前后端联调与生产环境部署。
