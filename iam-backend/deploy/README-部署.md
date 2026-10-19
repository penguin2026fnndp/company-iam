# 从零到跑起来（本地 / 华为云 ECS）

## 0. 现状说明

当前仓库只有**设计文档 + 建库脚本**，还没有 Java 代码，所以现在还不能启动服务。跑起来还差两步：

1. 写完 22 个接口（下一步工作）
2. `mvn package` 打出 `iam-backend.jar`

下面第 1–3 节是代码写完之后怎么跑；第 4 节开始是华为云部署。

## 1. 本地跑（Windows / macOS / Linux）

### 1.1 装三样东西

| 组件 | 版本 | 检查命令 |
| --- | --- | --- |
| JDK | 17+ | `java -version` |
| Maven | 3.9+ | `mvn -v` |
| MySQL | 8.0 | `mysql --version` |

如果本机不想装 MySQL，用 Docker 起一个：

```bash
docker compose -f deploy/docker-compose.yml up -d
```

### 1.2 建库灌数据

```bash
mysql -h127.0.0.1 -uroot -p < db/schema.sql
mysql -h127.0.0.1 -uroot -p < db/seed.sql
```

验证：

```sql
USE iam_rbac;
SELECT COUNT(*) FROM sys_permission;   -- 17
SELECT COUNT(*) FROM sys_role_permission WHERE role_id = 1;  -- 17
SELECT COUNT(*) FROM sys_role_permission WHERE role_id = 3;  -- 2
```

### 1.3 启动

```bash
mvn clean package -DskipTests
java -jar target/iam-backend.jar --spring.profiles.active=dev
```

### 1.4 三条验证命令

```bash
# 1) 登录，拿 sessionId
curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"account":"SG900001","password":"123456"}'

# 2) 带着 token 查自己
curl -s http://localhost:8080/api/auth/me \
  -H "Authorization: Bearer <sessionId>"

# 3) 用李四的 token 访问用户列表，应当 403
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8080/api/users \
  -H "Authorization: Bearer <李四的sessionId>"
```

## 2. 先想清楚部署形态

```
公网
  │ 80 / 443
  ▼
安全组（只放行 80/443/22）
  ▼
Nginx ──/──→ /var/www/iam        静态原型（可选，用来演示界面）
  └──/api/──→ 127.0.0.1:8080     Spring Boot
                    │
                    ▼
              127.0.0.1:3306      MySQL
```

两个选择：

| 方案 | 优点 | 缺点 | 建议 |
| --- | --- | --- | --- |
| A. ECS 上装 MySQL | 一台机器、便宜、内网直连 | 备份与升级要自己做 | 课程演示首选 |
| B. 华为云 RDS for MySQL | 自动备份、省运维 | 多一份费用，要配白名单 | 有预算再选 |

下面按方案 A 写，方案 B 只需替换 `application-prod.yml` 里的数据库地址。

## 3. 买机器与开端口

1. 购买 ECS：**2 核 4G、Ubuntu 22.04、系统盘 40G**，绑定弹性公网 IP（EIP）。
2. 进入「安全组 → 入方向规则」，只加三条：

| 端口 | 源地址 | 用途 |
| --- | --- | --- |
| 22 | 你的公网 IP/32 | SSH，别开 0.0.0.0/0 |
| 80 | 0.0.0.0/0 | 网站 |
| 443 | 0.0.0.0/0 | 以后上 HTTPS 用 |

**不要**放行 8080 和 3306。应用只听本机，外网一律走 Nginx。

## 4. 服务器初始化（一次性）

SSH 登录后执行。也可以把 `deploy/deploy.sh` 传上去直接跑。

```bash
# 时区（很关键：会话到期按 23:59:59 算）
timedatectl set-timezone Asia/Shanghai

# 基础软件
apt update
apt install -y openjdk-17-jdk mysql-server nginx unzip curl

# 建运行用户（不要用 root 跑 Java）
useradd -r -m -d /opt/iam -s /usr/sbin/nologin iam
mkdir -p /opt/iam/logs
chown -R iam:iam /opt/iam
```

### 4.1 MySQL 建库与账号

```bash
mysql -uroot
```

```sql
CREATE DATABASE IF NOT EXISTS iam_rbac
  DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

CREATE USER 'iam'@'localhost' IDENTIFIED BY '换成你的强密码';
GRANT SELECT, INSERT, UPDATE, DELETE ON iam_rbac.* TO 'iam'@'localhost';
FLUSH PRIVILEGES;
```

> 应用账号只给 DML 权限，建表用 root。这样即使应用被注入，也删不掉表结构。

> 应用配置里的库名固定为 `iam_rbac`。如需覆盖连接串、账号或密码，使用环境变量
> `IAM_RBAC_URL`、`IAM_RBAC_USER`、`IAM_RBAC_PASSWORD`（默认值已在 `application.yml` 中）。

导入结构与数据（用 root，因为要建表）：

```bash
mysql -uroot < /opt/iam/dist/db/schema.sql
mysql -uroot < /opt/iam/dist/db/seed.sql
```

确认 MySQL 只监听本机：

```bash
ss -lntp | grep 3306      # 应显示 127.0.0.1:3306
```

## 5. 上传与目录

本地执行：

```bash
# 打 jar
mvn clean package -DskipTests

# 建目录并上传（把 <EIP> 换成你的公网 IP）
ssh root@<EIP> "mkdir -p /opt/iam/dist"
scp target/iam-backend.jar root@<EIP>:/opt/iam/dist/
scp -r db deploy root@<EIP>:/opt/iam/dist/
scp -r ../iam-prototype root@<EIP>:/var/www/iam
```

服务器上整理：

```bash
mv /opt/iam/dist/iam-backend.jar /opt/iam/app.jar
cp /opt/iam/dist/deploy/application-prod.yml /opt/iam/application-prod.yml
chown -R iam:iam /opt/iam
```

## 6. 改生产配置

编辑 `/opt/iam/application-prod.yml`：把 `CHANGE_ME` 换成数据库密码。其余保持默认即可。

## 7. 注册为系统服务

```bash
cp /opt/iam/dist/deploy/iam.service /etc/systemd/system/iam.service
systemctl daemon-reload
systemctl enable --now iam
systemctl status iam --no-pager
journalctl -u iam -f
```

看到 `Started IAM RBAC0 Backend` 且日志里出现 `Tomcat started on port 8080` 即成功。

## 8. Nginx 反向代理

```bash
cp /opt/iam/dist/deploy/nginx.conf /etc/nginx/sites-available/iam
ln -sf /etc/nginx/sites-available/iam /etc/nginx/sites-enabled/iam
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
```

此时：

- `http://<EIP>/` → 原型界面
- `http://<EIP>/api/...` → 后端接口

验证：

```bash
curl -s -X POST http://<EIP>/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"account":"SG900001","password":"123456"}'
```

## 9. 上线检查清单

| 项 | 命令 / 判断 |
| --- | --- |
| 服务在跑 | `systemctl is-active iam` → `active` |
| 端口正确 | `ss -lntp \| grep -E '80\|8080'`，8080 只绑 127.0.0.1 |
| 数据库连通 | 登录接口能返回数据，不是 500 |
| 时区正确 | `date` 显示 CST；登录返回的 `expireAt` 是当天 23:59:59 |
| 鉴权生效 | 李四的 token 调 `/api/users` 返回 403 |
| 重启能起 | `systemctl restart iam` 后仍可登录 |
| 开机自启 | `systemctl is-enabled iam` → `enabled` |

## 10. 常见坑

| 现象 | 原因 | 处理 |
| --- | --- | --- |
| 浏览器打不开但 curl 本机正常 | 安全组没放行 80 | 加安全组规则 |
| 登录成功但接口全 401 | Nginx 没转 Authorization 头 | `proxy_set_header Authorization $http_authorization;` |
| 会话第二天早上才过期 | 时区是 UTC | 服务器时区 + JVM `-Duser.timezone` + JDBC `serverTimezone` 三处一致 |
| 启动报 `Access denied` | 应用账号没授权 | `SHOW GRANTS FOR 'iam'@'localhost';` |
| 启动报 `Unknown database` | 没导入 schema | 重新执行 schema.sql |
| 改了 jar 没生效 | 忘了重启 | `systemctl restart iam` |
| 8080 能从公网访问 | 安全组放行了 8080 | 删掉该规则，只留 80/443 |

## 11. 备份与日志

```bash
# 每天 3 点备份（root 的 crontab）
0 3 * * * mysqldump -uroot -p'密码' --single-transaction iam_rbac | gzip > /opt/backup/iam_$(date +\%F).sql.gz
```

日志：

```bash
journalctl -u iam --since "1 hour ago"
tail -f /opt/iam/logs/iam.log
```

系统日志默认不会无限增长，超过阈值可用 `journalctl --vacuum-time=14d` 清理。

## 12. 域名与备案

- 用 IP 演示不需要备案。
- 绑域名且服务器在中国大陆，需要先完成 ICP 备案，否则 80/443 会被拦截。
- 上 HTTPS 可在华为云申请免费证书，把 `nginx.conf` 的 443 段打开即可。

## 13. 费用参考（以实际为准）

| 项 | 规格 | 量级 |
| --- | --- | --- |
| ECS | 2C4G / 40G / 按月 | 百元级/月 |
| EIP | 按带宽或流量 | 几十元/月 |
| RDS（可选） | 入门版 | 百元级/月 |

课程演示用 2C4G 足够；答辩结束可停机或退订。
