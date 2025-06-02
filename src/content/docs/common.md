---
title: 常用命令
description: A guide in my new Starlight docs site.
---

### 重启云枢服务

```sh frame="none"
/data/cloudpivot/program/backEnd/deploy.sh webapi && /data/reporter-deploy/bin/shutdown.sh && /data/reporter-deploy/bin/startup.sh
```

### 查看云枢日志

```sh frame="none"
tail -300f /data/cloudpivot/program/backEnd/webapi/logs/log_total.log
```

### 升级云枢后需要执行

```sh frame="none"
/data/cloudpivot/program/backEnd/deploy.sh clean
```