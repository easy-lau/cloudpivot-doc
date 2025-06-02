---
title: Redis常见操作
date: 2025-03-24 12:00:00
---

## Redis 登录

### 本地登录

如果 Redis 服务器运行在本地，并且没有设置密码，可以直接使用 `redis-cli` 命令登录：

```bash
redis-cli
```

### 远程登录

如果 Redis 服务器运行在远程主机上，可以使用 `-h` 参数指定主机地址，`-p` 参数指定端口号（默认是 6379）：

```bash
redis-cli -h <host> -p <port>
```

例如：

```bash
redis-cli -h 192.168.1.100 -p 6379
```

### 使用密码登录

如果 Redis 设置了密码，可以使用 `-a` 参数指定密码：

```bash
redis-cli -a <password>
```

例如：

```
redis-cli -a mypassword
```

## 常见 Redis 命令

### 清空当前数据库的所有键

使用 `FLUSHDB` 命令可以清空当前选择的数据库中的所有键。

```bash
FLUSHDB
```

------

### 清空所有数据库的所有键

使用 `FLUSHALL` 命令可以清空 Redis 中所有数据库的所有键。

```bash
FLUSHALL
```