---
title: CentOS 上部署 Redis 哨兵模式
date: 2025-03-11 18:00:00
---

Redis 哨兵(Sentinel)模式是 Redis 的高可用解决方案，通过监控主节点，在主节点故障时自动进行故障转移。下面是在 CentOS 上部署 Redis 哨兵模式的详细步骤：

## 环境准备

假设我们要部署 1 个主节点、2 个从节点和 3 个哨兵节点的架构。

### 安装 Redis

在所有服务器上安装 Redis：

```bash frame="none"
# 安装依赖
yum install -y gcc tcl wget

# 下载并编译 Redis
cd /tmp && curl -O http://download.redis.io/releases/redis-7.4.3.tar.gz && tar xzf redis-7.4.3.tar.gz && cd redis-7.4.3
make && make install
```

## 配置 Redis 主从节点

假设我们有三台服务器：

- 主节点：192.168.1.100
- 从节点1：192.168.1.101
- 从节点2：192.168.1.102

### 配置主节点 (192.168.1.100)

```bash frame="none"
mkdir -p /etc/redis
mkdir -p /var/redis/6379

# 创建配置文件
cat > /etc/redis/6379.conf << EOF
bind 0.0.0.0
port 6379
daemonize yes
pidfile /var/run/redis_6379.pid
logfile "/var/log/redis_6379.log"
dir /var/redis/6379
appendonly yes
requirepass "Authine2025"
masterauth "Authine2025"
EOF

# 启动 Redis
redis-server /etc/redis/6379.conf
```

### 配置从节点 (192.168.1.101 和 192.168.1.102)

对每个从节点执行相同的操作，只需修改 replicaof 参数：

```bash frame="none"
mkdir -p /etc/redis
mkdir -p /var/redis/6379

# 创建配置文件
cat > /etc/redis/6379.conf << EOF
bind 0.0.0.0
port 6379
daemonize yes
pidfile /var/run/redis_6379.pid
logfile "/var/log/redis_6379.log"
dir /var/redis/6379
appendonly yes
requirepass "Authine2025"
masterauth "Authine2025"
replicaof 192.168.1.100 6379
EOF

# 启动 Redis
redis-server /etc/redis/6379.conf
```

## 配置 Redis 哨兵

可以在上述三台服务器上都配置哨兵，也可以使用单独的服务器。

###  创建哨兵配置文件

在每台哨兵服务器上：

```bash frame="none"
mkdir -p /etc/redis && mkdir -p /var/redis/sentinel

# 创建哨兵配置文件
cat > /etc/redis/sentinel.conf << EOF
port 26379
daemonize yes
pidfile /var/run/redis-sentinel.pid
logfile "/var/log/redis-sentinel.log"
dir /var/redis/sentinel
sentinel monitor mymaster 192.168.1.100 6379 2
sentinel auth-pass mymaster Authine2025
sentinel down-after-milliseconds mymaster 30000
sentinel parallel-syncs mymaster 1
sentinel failover-timeout mymaster 180000
EOF
```

配置说明：

- `sentinel monitor mymaster 192.168.1.100 6379 2`：监控名为 mymaster 的主节点，IP 为 192.168.1.100，端口 6379，当至少 2 个哨兵认为主节点不可用时，才会执行故障转移
- `sentinel down-after-milliseconds mymaster 30000`：30 秒内无法连接主节点则认为主节点下线
- `sentinel parallel-syncs mymaster 1`：故障转移时，每次只有 1 个从节点会与新主节点进行同步
- `sentinel failover-timeout mymaster 180000`：故障转移超时时间为 180 秒

### 启动哨兵

在每台哨兵服务器上：

```bash frame="none"
redis-sentinel /etc/redis/sentinel.conf
```

## 设置开机自启

### 创建 Redis 服务文件

```bash frame="none"
cat > /etc/systemd/system/redis.service << EOF
[Unit]
Description=Redis In-Memory Data Store
After=network.target

[Service]
Type=forking
User=root
Group=root
ExecStart=/usr/local/bin/redis-server /etc/redis/6379.conf
ExecStop=/usr/local/bin/redis-cli -h 127.0.0.1 -p 6379 -a Authine2025 shutdown
Restart=on-failure
RestartSec=5
PIDFile=/var/run/redis_6379.pid

[Install]
WantedBy=multi-user.target
EOF
```

### 创建 Sentinel 服务文件

```bash frame="none"
cat > /etc/systemd/system/redis-sentinel.service << EOF
[Unit]
Description=Redis Sentinel
After=network.target

[Service]
Type=forking
User=root
Group=root
ExecStart=/usr/local/bin/redis-sentinel /etc/redis/sentinel.conf
ExecStop=/usr/local/bin/redis-cli -h 127.0.0.1 -p 26379 shutdown
Restart=always

[Install]
WantedBy=multi-user.target
EOF
```

### 启用服务

```bash frame="none"
# 重新加载 systemd
systemctl daemon-reload

# 启用并启动服务
systemctl enable redis.service && systemctl start redis.service

systemctl enable redis-sentinel.service && systemctl start redis-sentinel.service

 ps aux | grep redis
```

## 验证部署

### 检查主从状态

```bash frame="none"
redis-cli -h 127.0.0.1 -p 6379 -a Authine2025 info replication
```

### 检查哨兵状态

```bash frame="none"
redis-cli -h 127.0.0.1 -p 26379 info sentinel
```

### 测试故障转移

可以通过关闭主节点来测试故障转移：

```bash frame="none"
# 在主节点上执行
systemctl stop redis

tail -f /var/log/redis-sentinel.log
```

然后观察哨兵日志和从节点状态，确认是否成功进行了故障转移。

## 注意事项

1. 生产环境中，建议至少配置 3 个哨兵节点，并分布在不同的物理机上
2. 密码应该设置得足够复杂，并在所有配置中保持一致
3. 根据实际网络环境调整 `down-after-milliseconds` 参数
4. 生产环境中应该配置防火墙，只允许必要的端口访问
5. 定期备份 Redis 数据

以上就是在 CentOS 上部署 Redis 哨兵模式的完整步骤。

## 部署脚本

一键部署脚本，请参考[redis-sentinel](https://github.com/easy-lau/redis-sentinel)

curl下载

```sh frame="none"
curl -sS -O https://cloud-doc.lsir.vip/sh/redis-sentinel-install-cn.sh && chmod +x redis-sentinel-install-cn.sh && ./redis-sentinel-install-cn.sh
```

wget下载

```sh frame="none"
wget -q https://cloud-doc.lsir.vip/sh/redis-sentinel-install-cn.sh && chmod +x redis-sentinel-install-cn.sh && ./redis-sentinel-install-cn.sh
```

