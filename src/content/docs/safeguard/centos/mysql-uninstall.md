---
title: CentOS 卸载 MySQL
date: 2025-05-05 12:00:00
lastUpdated: 2025-05-05 12:00:00
---

## 停止 MySQL 服务

```bash frame="none"
sudo systemctl stop mysqld
```

## 检查已安装的 MySQL 相关包

```bash frame="none"
sudo rpm -qa | grep -i mysql
```

## 卸载 MySQL 软件包

使用 yum 移除所有 MySQL 相关包（根据上一步查看到的包名）：

```bash frame="none"
sudo yum remove mysql-community-*
```

## 删除残留文件和目录

```bash frame="none"
sudo rm -rf /var/lib/mysql
sudo rm -rf /etc/my.cnf
sudo rm -rf /etc/my.cnf.d
```

## 删除 MySQL 用户和组

```bash frame="none"
sudo userdel mysql
sudo groupdel mysql
```

## 清理依赖项

```bash frame="none"
sudo yum autoremove
```

## 验证卸载

```bash frame="none"
sudo find / -name "*mysql*"
```

