# Windows 本机启动：先 mvn clean package，再运行这个脚本
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$jdk = $env:JAVA_HOME
if (-not $jdk) { $jdk = 'C:\Users\27642\AppData\Local\Programs\Eclipse Adoptium\jdk-21.0.12.1+1' }
$java = Join-Path $jdk 'bin\java.exe'
if (-not (Test-Path $java)) { $java = 'java' }

& $java '-Dfile.encoding=UTF-8' '-Duser.timezone=Asia/Shanghai' `
  -jar "$root\target\iam-backend.jar"
