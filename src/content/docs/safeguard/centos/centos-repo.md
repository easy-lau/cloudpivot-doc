---
title: CentOS修改源
date: 2025-03-24 12:00:00
---

## 使用阿里云源

``` bash frame="none"
# 备份原有源
sudo mv /etc/yum.repos.d/CentOS-Base.repo /etc/yum.repos.d/CentOS-Base.repo.backup

# 下载阿里云源
sudo curl -o /etc/yum.repos.d/CentOS-Base.repo http://mirrors.aliyun.com/repo/Centos-7.repo

# 清理并重建缓存
sudo yum clean all
sudo yum makecache
```

## 使用清华源

```bash frame="none"
# 备份原有源
sudo mv /etc/yum.repos.d/CentOS-Base.repo /etc/yum.repos.d/CentOS-Base.repo.backup

# 下载清华源
sudo curl -o /etc/yum.repos.d/CentOS-Base.repo https://mirrors.tuna.tsinghua.edu.cn/help/centos/centos7.repo

# 清理并重建缓存
sudo yum clean all
sudo yum makecache
```

