#!/usr/bin/env bash
# Linux（华为云 ECS）启动
set -e
APP_DIR="${APP_DIR:-/opt/iam}"
java -Dfile.encoding=UTF-8 -Duser.timezone=Asia/Shanghai \
  -Xms256m -Xmx512m \
  -jar "$APP_DIR/app.jar"
