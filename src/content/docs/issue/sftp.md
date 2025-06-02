---
title: 服务器创建SFTP用户
date: 2024-07-07 22:58:34
---

### 创建 SFTP 用户和组

创建一个名为 `sftpuser` 的用户，并将其主目录设置为 `/data/sftp`。同时，为该用户创建一个独立的组。

```bash  frame="none"
sudo groupadd sftpusers
sudo useradd -m -d /data/sftp -s /sbin/nologin -g sftpusers sftpuser
sudo passwd sftpuser
```

### 设置目录权限

确保 `/data/sftp` 目录的所有者为 `root`，并将其权限设置为 `755`。

```bash  frame="none"
sudo mkdir -p /data/sftp
sudo chown root:root /data/sftp
sudo chmod 755 /data/sftp
```

### 创建用户上传文件的子目录

在 `/data/sftp` 目录下为 `sftpuser` 创建一个专用的子目录，并将其权限设置为 `sftpuser`。

```bash  frame="none"
sudo mkdir -p /data/sftp/uploads
sudo chown sftpuser:sftpusers /data/sftp/uploads
sudo chmod 755 /data/sftp/uploads
```

### 配置 SSH 服务器 

编辑 `/etc/ssh/sshd_config` 文件，添加或修改以下内容：

```bash  frame="none"
Match Group sftpusers
    ChrootDirectory /data/sftp
    ForceCommand internal-sftp
    AllowTcpForwarding no
    X11Forwarding no
```

### 重启 SSH 服务：

保存配置文件并重启 SSH 服务以应用更改。

```bash  frame="none"
sudo systemctl restart sshd
```

完成以上步骤后，`sftpuser` 用户将被限制为只能通过 SFTP 进行文件上传，且无法通过 SSH 登录到系统。此用户的文件上传目录为 `/data/sftp/uploads`。
