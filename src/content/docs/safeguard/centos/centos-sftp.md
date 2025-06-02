---
title: CentOS 创建 SFTP
date: 2025-03-11 18:00:00
---

在 CentOS 上创建一个专门用于 SFTP 连接的用户，并将其限制在 `/data/sftp/<username>` 目录下，可以按照以下步骤操作。

## 创建 SFTP 用户组

```bash frame="none"
sudo groupadd sftpusers
```

## 创建 SFTP 用户

创建一个新用户，设置其主目录（虽然我们后面会用 ChrootDirectory 覆盖），并将其shell设置为 `/sbin/nologin` 以禁止 SSH shell 登录。

```bash frame="none"
sudo useradd -g sftpusers -s /sbin/nologin sftpuser1
```

设置用户密码：

```bash frame="none"
sudo passwd sftpuser1
```

系统会提示您输入并确认新密码。

## 创建 SFTP 目录结构并设置权限

这是关键的一步，chroot 目录的权限设置非常严格。

- 创建 SFTP 根目录 (如果 `/data` 不存在，也需要创建)。

```bash frame="none"
sudo mkdir -p /data/sftp
```

- 为用户 `sftpuser1` 创建其 chroot 目录。这个目录本身必须由 `root` 用户拥有。

```bash frame="none"
sudo mkdir -p /data/sftp/sftpuser1
```

- 设置 chroot 目录的权限。chroot 目录本身及其所有父路径组件都必须由 `root` 拥有，并且不能被其他用户写入。

```bash frame="none"
sudo chown root:root /data/sftp
sudo chmod 755 /data/sftp
sudo chown root:root /data/sftp/sftpuser1
sudo chmod 755 /data/sftp/sftpuser1
```

- 在用户的 chroot 目录内创建一个用户可以写入的目录（例如 `uploads`）。这个目录可以由 SFTP 用户拥有。

```bash frame="none"
sudo mkdir -p /data/sftp/sftpuser1/uploads
sudo chown sftpuser1:sftpusers /data/sftp/sftpuser1/uploads
sudo chmod 755 /data/sftp/sftpuser1/uploads # 用户可读写，同组用户可读，其他可读
# 如果希望同组用户也能写入，可以使用 chmod 775
```

当 `sftpuser1` 登录后，`/data/sftp/sftpuser1` 将成为其根目录 `/`，而 `/data/sftp/sftpuser1/uploads` 将显示为 `/uploads`。 

## 配置 SSHD 服务

编辑 SSH 配置文件 `/etc/ssh/sshd_config`：

```bash frame="none"
sudo vi /etc/ssh/sshd_config
```

- 找到 `Subsystem sftp` 这一行。通常它看起来像这样：

```bash frame="none"
Subsystem       sftp    /usr/libexec/openssh/sftp-server
```

- 将其注释掉（在行首加 `#`），然后添加下面一行，使用 `internal-sftp`，它支持 chroot：

```bash frame="none"
#Subsystem      sftp    /usr/libexec/openssh/sftp-server
Subsystem       sftp    internal-sftp
```

- 在文件的末尾添加以下配置块，以匹配 `sftpusers` 组中的用户：

```bash frame="none"
Match Group sftpusers
    ChrootDirectory /data/sftp/%u
    ForceCommand internal-sftp
    AllowTcpForwarding no
    X11Forwarding no
```

- `Match Group sftpusers`: 此配置块仅应用于 `sftpusers` 组中的用户。
- `ChrootDirectory /data/sftp/%u`: 将用户限制在其指定的 chroot 目录中。`%u` 会被替换为用户名 (例如 `sftpuser1`)，所以实际路径是 `/data/sftp/sftpuser1`。
- `ForceCommand internal-sftp`: 强制用户只能执行 SFTP 操作，即使他们尝试请求 shell。
- `AllowTcpForwarding no` 和 `X11Forwarding no`: 出于安全考虑，禁用 TCP 和 X11 转发。

保存并关闭文件。

## 重启 SSHD 服务

使配置更改生效：

```bash frame="none"
sudo systemctl restart sshd
```

检查服务状态：

```bash frame="none"
sudo systemctl status sshd
```

确保服务正在运行且没有错误。

## 测试 SFTP 连接

现在，您可以使用 SFTP 客户端（如 FileZilla、WinSCP 或命令行的 `sftp`）尝试连接：

```bash frame="none"
sftp sftpuser1@your_server_ip_or_hostname
```

输入 `sftpuser1` 的密码。

- 您应该会被直接带到 `/` 目录，这实际上是服务器上的 `/data/sftp/sftpuser1`。
- 您应该只能看到 `uploads` 目录。
- 您应该能够在 `uploads` 目录中上传、下载和列出文件。
- 您不应该能够导航到 `uploads` 目录之外（例如 `cd ..` 后 `ls` 应该仍然只看到 `uploads`）。
- 如果您尝试使用普通 SSH 客户端连接 (`ssh sftpuser1@your_server_ip_or_hostname`)，连接应该会立即关闭或被拒绝，因为 shell 设置为 `/sbin/nologin` 并且 `ForceCommand internal-sftp` 生效。

## 云枢配置SFTP

