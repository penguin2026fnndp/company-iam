#!/usr/bin/env bash
# 在华为云 ECS（Ubuntu 22.04）上执行，完成环境、服务与 Nginx 配置。
# 前提：jar、db/、deploy/ 已上传到 /opt/iam/dist，原型已放到 /var/www/iam。
set -euo pipefail

echo "==> 1/6 时区"
timedatectl set-timezone Asia/Shanghai || true

echo "==> 2/6 安装依赖"
apt update
apt install -y openjdk-17-jdk mysql-server nginx curl

echo "==> 3/6 运行用户与目录"
id -u iam >/dev/null 2>&1 || useradd -r -m -d /opt/iam -s /usr/sbin/nologin iam
mkdir -p /opt/iam/logs
chown -R iam:iam /opt/iam

echo "==> 4/6 导入数据库（仅当表不存在时）"
TABLE_COUNT=$(mysql -N -uroot -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='iam_rbac' AND table_name='sys_user';" 2>/dev/null || echo 0)
if [ "${TABLE_COUNT}" = "0" ]; then
  mysql -uroot < /opt/iam/dist/db/schema.sql
  mysql -uroot < /opt/iam/dist/db/seed.sql
  echo "    数据库已初始化"
else
  echo "    数据库已存在，跳过导入（需要重置请执行 db/reset.sql）"
fi

echo "==> 5/6 安装 systemd 服务"
install -m 644 /opt/iam/dist/deploy/iam.service /etc/systemd/system/iam.service
systemctl daemon-reload
systemctl enable iam
systemctl restart iam

echo "==> 6/6 配置 Nginx"
install -m 644 /opt/iam/dist/deploy/nginx.conf /etc/nginx/sites-available/iam
ln -sf /etc/nginx/sites-available/iam /etc/nginx/sites-enabled/iam
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

echo
echo "完成。检查："
echo "  systemctl status iam --no-pager"
echo "  curl -s -X POST http://127.0.0.1/api/auth/login -H 'Content-Type: application/json' -d '{\"account\":\"SG900001\",\"password\":\"123456\"}'"
