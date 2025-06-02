---
title: 配置开机自启动
date: 2025-03-11 18:00:00
---

> 注意：脚本编码应为Liunx下可识别的编码和格式，Windows下编写的可能会出现换行符无法识别等情况，大家可以参考dos2unix这个命令，用它来进行转码

编写启动脚本，可参考以下命令

```shell frame="none"
echo '#!/bin/bash
/data/reporter-deploy/bin/startup.sh && /data/cloudpivot/program/backEnd/deploy.sh webapi' > /data/autorun.sh && chmod +x /data/autorun.sh
```

利用Linux自带cron功能完成开机自启动，使用`crontab -e`命令进入编辑界面,新增一行其内容如下。然后保存即可

```shell frame="none"
@reboot . /etc/profile;/bin/bash /data/autorun.sh
```
