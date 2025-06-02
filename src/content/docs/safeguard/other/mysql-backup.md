---
title: MySQL自动备份脚本
date: 2025-03-11 18:00:00
---

> 脚本信息修改完成之后可以利用`crontab -e`命令设置定时任务达到自动备份目的
>
> 示例：每天晚上十点备份一次数据库 `00 22 * * * /bin/bash /data/autobackup.sh`
>
> 注意：脚本依赖`net-tools`工具 未安装的请自行安装

```shell frame="none"
#!/bin/bash

# 注意备份的目录不要有其他东西，过期删除可能会把对应的其他文件一并删除了
# 数据库连接配置信息 建议直接用超级管理员账号，普通账号可能有些函数没有权限无法备份
mysql_host="localhost"
mysql_port="3306"
mysql_user="root"
mysql_pwd="你的密码"
mysql_charset="utf8"

# 异地备份SSH连接信息，通过SCP将备份文件传输至远程机器 先用ssh <user>@<host> 远程连接一下目标服务器
# 是否开启异地备份可选值(ON/OFF) 为ON其他选项必填
remote_back="OFF"
# 远程机器SSH信息
remote_host=""
remote_port=""
remote_user=""
remote_pwd=""
# 远程备份目录 需保证此目录已存在
remote_dir=/data/backup/

# 要备份的数据库名称，多个用空格分开隔开 如("db1" "db2" "db3")
backup_db_arr=("cloudpivot" "h3yun_report")
# 备份数据存放位置，末尾请不要带"/",此项可以保持默认，程序会自动创建文件夹
root_dir=/data
# 备份文件夹
backup_folder=backup
# 是否开启过期备份删除 ON为开启 OFF为关闭
expire_backup_delete="ON"
# 过期时间天数 此项只有在expire_backup_delete开启时有效
expire_days=30

# 使用关联数组来定义每个数据库的排除表（以逗号分隔）
declare -A exclude_data_tables
exclude_data_tables["cloudpivot"]="h_log_biz_object,h_log_biz_service,h_log_business_rule_content,h_log_business_rule_data_trace,h_log_business_rule_header,h_log_business_rule_node,h_log_environment,h_log_login,h_log_metadata,h_log_rule,h_log_rule_node,h_log_synchro,h_log_workflow_exception,h_org_synchronize_log"
exclude_data_tables["h3yun_report"]=""  # 可以根据需要填充排除表名

# 本行开始以下不需要修改
backup_time=`date +%Y%m%d%H%M`  #定义备份详细时间
backup_Ymd=`date +%Y%m%d` #定义备份目录中的年月日时间
backup_dir=$root_dir/$backup_folder/$backup_Ymd  #备份文件夹全路径
welcome_msg="欢迎使用MySQL备份工具，即将进行数据库备份！" #欢迎语

# 判断MySQL是否启动,mysql没有启动则备份退出
mysql_ps=`ps -ef |grep mysql |wc -l`
mysql_listen=`netstat -an | grep LISTEN | grep $mysql_port | wc -l`
if [ [$mysql_ps == 0] -o [$mysql_listen == 0] ]; then
  echo -e "\033[31m数据库服务未启动,停止备份\033[0m"
  exit
else
  echo -e "\033[32m$welcome_msg \033[0m"
fi

export MYSQL_PWD=$mysql_pwd
# 连接到MySQL数据库，无法连接则备份退出
mysql -h$mysql_host -P$mysql_port -u$mysql_user << end
exit
end

flag=`echo $?`
if [ $flag != "0" ]; then
    echo -e "\033[31m无法连接到数据库，停止备份\033[0m"
    exit
else
    echo -e "\033[36m已连接到【$mysql_host】数据库，备份即将开始......\033[0m"
fi

# 判断有没有定义备份的数据库，如果定义则开始备份，否则退出备份
if [ "$backup_db_arr" != "" ];then
    for dbname in ${backup_db_arr[@]}
    do
        echo -e "\033[32m数据库【$dbname】备份开始......\033[0m"
        `mkdir -p $backup_dir`
        
        # 准备排除表的参数
        exclude_data_tables_str=""
        IFS=',' read -ra tables <<< "${exclude_data_tables[$dbname]}"
        for table in "${tables[@]}"
        do
           exclude_data_tables_str+=" --ignore-table=$dbname.$table"
        done
        
         # 备份表数据（排除部分表）
         mysqldump -h"$mysql_host" -P"$mysql_port" -u"$mysql_user" "$dbname" \
           --default-character-set="$mysql_charset" --routines -t \
           $exclude_data_tables_str \
           --triggers --events --single-transaction --set-gtid-purged=OFF | gzip > "$backup_dir/$dbname-${backup_time}_data.sql.gz"
         
         # 备份表结构（不排除任何表）
         mysqldump -h"$mysql_host" -P"$mysql_port" -u"$mysql_user" "$dbname" \
           --default-character-set="$mysql_charset" --routines -d \
           --triggers --events --single-transaction --set-gtid-purged=OFF | gzip > "$backup_dir/$dbname-${backup_time}.sql.gz"     
        flag=`echo $?`
        if [ $flag == "0" ];then
            echo -e "\033[31m数据库【$dbname】已备份至【$backup_dir】目录下\033[0m"
        else
            echo -e "\033[31m数据库【$dbname】备份失败\033[0m"
        fi
    done
else
     echo -e "\033[31m未定义备份数据库，备份停止\033[0m"
     exit
fi

# 如果开启了删除过期备份，则进行删除操作
if [ "$expire_backup_delete" == "ON" ] && [ "$root_dir" != "" ];then
    `find $root_dir/$backup_folder/ -type d -mtime +$expire_days | xargs rm -rf`
    echo -e "\033[35m删除过期备份成功\033[0m"
fi

# 如果开启了异地备份，则进行异地备份
if [ "$remote_back" == "ON" ] && [ "$remote_host" != "" ] && [ "$remote_port" != "" ] && [ "$remote_user" != "" ] && [ "$remote_pwd" != "" ];then
    echo -e "\033[36m所有数据库已成功本地备份！即将进行异地备份传输，请稍等......\033[0m"
    sshpass -p "$remote_pwd" scp -r -P $remote_port $backup_dir $remote_user@$remote_host:$remote_dir
    echo -e "\033[35m已完成所有数据库备份并已传输至远程【$remote_dir/$backup_Ymd】感谢使用\033[0m"
fi
exit
```
