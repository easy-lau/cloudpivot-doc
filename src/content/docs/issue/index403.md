---
title: 部署成功后访问首页403
date: 2024-06-16 18:06:48
---

### 问题描述

在CentOS环境环境下部署完毕后，其他配置无问题时，访问首页显示403。部分操作系统默认开启SELinux。

### 解决方案

查看SElinux状态

```sh frame="none"
getenforce
```

如果返回 `Enforcing`，可以先临时关闭：

```bash frame="none"
setenforce 0
```

SElinux有三种运行状态：Enforcing、Permissive、Disabled。若处于开启状态请通过以下修改将其关闭。

```sh frame="none"
vim /etc/selinux/config
```

将状态`SELINUX=enforcing` 替换成 `SELINUX=disabled`

保存并退出，重启服务器查看SElinux状态，SElinux状态显示diabled即成功修改

```sh frame="none"
reboot
```

关闭防火墙

```sh frame="none"
systemctl stop firewalld
```

取消开机自启

```sh frame="none"
systemctl disable firewalld
```
