---
title: Nginx配置HTTPS
date: 2025-03-11 18:00:00

---

>配置HTTPS可能因证书问题导致报表服务出现异常,如果出现此问题可采用如下方式进行配置

拆分Nginx配置文件,此步主要是为了方便管理配置文件方便其后续有其他服务共用Nginx,如果没有此需求可把第二第三步配置文件合并放入nginx.conf

> 修改/etc/nginx/nginx.conf配置文件为如下内容

<details>
<summary>点我查看配置</summary>

```shell
#nginx通用配置
user nginx;
worker_processes auto;
pid /run/nginx.pid;
error_log /var/log/nginx/error.log;
include /usr/share/nginx/modules/*.conf;

events {
    use                    epoll;
    multi_accept           on;
    worker_connections     65535;
}

http {
    log_format  main  '$remote_addr - $remote_user [$time_local] "$request" '
                      '$status $body_bytes_sent "$http_referer" '
                      '"$http_user_agent" "$http_x_forwarded_for" "$upstream_addr" "$upstream_status"';
    #设定mime类型,类型由mime.type文件定义
    include                /etc/nginx/mime.types;
    default_type           application/octet-stream;        
    charset                utf-8;
    sendfile               on;
    keepalive_timeout      65;
    tcp_nopush             on;
    tcp_nodelay            on;
    types_hash_max_size    2048;
    gzip                   on;
    gzip_vary              off;
    gzip_disable           "MSIE [1-6]\."; 
    gzip_min_length        1k;
    gzip_buffers           4 16k;
    gzip_comp_level        6;
    gzip_types             text/plain application/javascript application/x-javascript text/css application/xml text/javascript image/jpeg image/gif image/png;
    proxy_hide_header      X-Powered-By;
    proxy_hide_header      Server;
    #absolute_redirect off; 
    
    #这里可以配置限流操作
    #定义一个名为allips的limit_req_zone用来存储session，大小是10M内存，
    #以$binary_remote_addr 为key,限制平均每秒的请求为20个，
    #1M能存储16000个状态，rete的值必须为整数，
    #如果限制两秒钟一个请求，可以设置成30r/m
    #limit_req_zone     $binary_remote_addr zone=allips:10m rate=50r/s;
    
    #关闭访问日志
    #access_log             off; 
    access_log             /var/log/nginx/access.log  main;
    include                /etc/nginx/conf.d/*.conf;
}
```

</details>

在/etc/nginx/conf.d/目录下添加云枢平台HTTPS配置文件

> 新增/etc/nginx/conf.d/cloudpivot.conf配置文件,配置内容如下

**注意：6.12.X及以上采用如下配置**

<details>
<summary>点我查看配置</summary>

```shell
#对应的云枢服务配置信息 多节点负载均衡模式可自行调整
upstream cloudpivot {
    least_conn;
    server 127.0.0.1:8080;
}
#对应的报表服务配置信息 多节点负载均衡模式可自行调整
upstream report {
    least_conn;
    server 127.0.0.1:6061;
}
#80端口强制跳转到443端口可以用此配置 非80/443端口强制跳转可用error_page 497 301 https://$host:$server_port$request_uri;
server {
    listen     80;
    listen     [::]:80;
    server_name <你的域名>;
    rewrite ^(.*)$ https://$host$1 permanent;
}
#https端口配置
server {
    listen       443 ssl default_server;
    listen       [::]:443 ssl default_server;
    server_name  <你的域名>;

    ssl_certificate  <你的pem格式证书文件>;
    ssl_certificate_key <你的key格式证书文件>;
    ssl_session_timeout 5m;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE:ECDH:AES:HIGH:!NULL:!aNULL:!MD5:!ADH:!RC4;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    #非443/80端口强制跳转可以使用如下配置
    #error_page 497 301 https://$host:$server_port$request_uri;

    root         /data/cloudpivot/program/frontEnd/portal/;
    server_tokens off;
    include /etc/nginx/default.d/*.conf;

    location / {
        try_files $uri $uri/index.html $uri/ /index.html;
        #absolute_redirect off;
        #入口页面不缓存
        add_header Last-Modified $date_gmt;
        add_header Cache-Control 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0';
        if_modified_since off;
        expires off;
        etag off;
    }

    location ~* ^.+\.(css|js|ico|gif|jpg|jpeg|png)$ {
        log_not_found off;
        #关闭日志
        access_log off;
        #缓存时间30天
        expires 30d;
    }

    location ^~ /api/ {
        proxy_pass http://cloudpivot;
        #proxy_set_header   Host              $host:$server_port;
        proxy_set_header X-Real-IP           $remote_addr;
        proxy_set_header X-Forwarded-For     $proxy_add_x_forwarded_for;
        
        #可将下面两个配置为固定值: 对应入口层协议和端口 (适用于: nginx外层还有proxy并与当前scheme, server_port不一致的情况)
        proxy_set_header X-Forwarded-Proto   $scheme;
        #proxy_set_header X-Forwarded-Proto   https;
        proxy_set_header X-Forwarded-Port    $server_port;
        #proxy_set_header X-Forwarded-Port    8888;
        
        #absolute_redirect off;
        client_max_body_size 200m;
        proxy_read_timeout  300;
    }

    location /v1/ {
        proxy_pass http://cloudpivot/api/v1/;
        #proxy_set_header   Host              $host:$server_port;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Port    $server_port;
        #absolute_redirect off;
        client_max_body_size 200m;
        proxy_read_timeout  300;
    }

    location /dashboard/ {
        proxy_pass http://report/dashboard/;
        #proxy_set_header   Host              $host:$server_port;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Port    $server_port;
        #absolute_redirect off;
        client_max_body_size 200m;
        proxy_read_timeout  300;
    }

    # 云枢8.0配套报表需要 不配置表单的统计分析功能无法使用 8.0以下可以取消此配置
    location /statistic/ {
        proxy_pass http://report/statistic/;
        #proxy_set_header   Host              $host:$server_port;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Port    $server_port;
        #absolute_redirect off;
        client_max_body_size 200m;
        proxy_read_timeout  300;
    }  

    location /common/ {
        proxy_pass http://report/common/;
        #proxy_set_header   Host              $host:$server_port;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Port    $server_port;
        #absolute_redirect off;
        client_max_body_size 200m;
        proxy_read_timeout  300;
    }    

    location /data-source/ {
        proxy_pass http://report/data-source/;
        #proxy_set_header   Host              $host:$server_port;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Port    $server_port;
        #absolute_redirect off;
        client_max_body_size 200m;
        proxy_read_timeout  300;
    }
}
```

</details>

**注意：6.12.X以下采用如下配置**

<details>
<summary>点我查看配置</summary>

```shell
#对应的云枢服务配置信息 多节点负载均衡模式可自行调整
upstream cloudpivot {
    least_conn;
    server 127.0.0.1:8080;
}
#对应的报表服务配置信息 多节点负载均衡模式可自行调整
upstream report_dashboard {
    least_conn;
    server 127.0.0.1:6061;
}
#对应的报表服务配置信息 多节点负载均衡模式可自行调整
upstream report_datasource {
    least_conn;
    server 127.0.0.1:6063;
}
#80端口强制跳转到443端口可以用此配置 非80/443端口强制跳转可用error_page 497 301 https://$host:$server_port$request_uri;
server {
    listen     80;
    listen     [::]:80;
    server_name <你的域名>;
    rewrite ^(.*)$ https://$host$1 permanent;
}
#https端口配置
server {
    listen       443 ssl default_server;
    listen       [::]:443 ssl default_server;
    server_name  <你的域名>;

    ssl_certificate  <你的pem格式证书文件>;
    ssl_certificate_key <你的key格式证书文件>;
    ssl_session_timeout 5m;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE:ECDH:AES:HIGH:!NULL:!aNULL:!MD5:!ADH:!RC4;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    #非443/80端口强制跳转可以使用如下配置
    #error_page 497 301 https://$host:$server_port$request_uri;

    root         /data/cloudpivot/program/frontEnd/portal/;
    server_tokens off;
    include /etc/nginx/default.d/*.conf;

    location / {
        try_files $uri $uri/index.html $uri/ /index.html;
        #absolute_redirect off;
        #入口页面不缓存
        add_header Last-Modified $date_gmt;
        add_header Cache-Control 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0';
        if_modified_since off;
        expires off;
        etag off;
    }

    location ~* ^.+\.(css|js|ico|gif|jpg|jpeg|png)$ {
        log_not_found off;
        #关闭日志
        access_log off;
        #缓存时间30天
        expires 30d;
    }

    location ^~ /api/ {
        proxy_pass http://cloudpivot;
        #proxy_set_header   Host              $host:$server_port;
        proxy_set_header X-Real-IP           $remote_addr;
        proxy_set_header X-Forwarded-For     $proxy_add_x_forwarded_for;
        
        #可将下面两个配置为固定值: 对应入口层协议和端口 (适用于: nginx外层还有proxy并与当前scheme, server_port不一致的情况)
        proxy_set_header X-Forwarded-Proto   $scheme;
        #proxy_set_header X-Forwarded-Proto   https;
        proxy_set_header X-Forwarded-Port    $server_port;
        #proxy_set_header X-Forwarded-Port    8888;
        
        #absolute_redirect off;
        client_max_body_size 200m;
        proxy_read_timeout  300;
    }

    location /v1/ {
        proxy_pass http://cloudpivot/api/v1/;
        #proxy_set_header   Host              $host:$server_port;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Port    $server_port;
        #absolute_redirect off;
        client_max_body_size 200m;
        proxy_read_timeout  300;
    }

    location /dashboard/ {
        proxy_pass http://report_dashboard/;
        #proxy_set_header   Host              $host:$server_port;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Port    $server_port;
        #absolute_redirect off;
        client_max_body_size 200m;
        proxy_read_timeout  300;
    }

    location /data-source/ {
        proxy_pass http://report_datasource/;
        #proxy_set_header   Host              $host:$server_port;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Port    $server_port;
        #absolute_redirect off;
        client_max_body_size 200m;
        proxy_read_timeout  300;
    }
}
```

</details>

在/etc/nginx/conf.d/目录下添加报表代理配置文件

> 新增/etc/nginx/conf.d/report.conf配置文件,配置内容如下

**注意：云枢6.12.X及以上(对应报表版本5.X及以上)不需要此配置，走内部调用即可 以下配置适用于6.12.X以下(对应报表5.X以下)版本**

<details>
<summary>点我查看配置</summary>

```shell
#对应的云枢服务配置信息 多节点负载均衡模式可自行调整
upstream proxy_cloudpivot {
    least_conn;
    server 127.0.0.1:8080;
}
upstream proxy_report_dashboard {
    least_conn;
    server 127.0.0.1:6061;
}
upstream proxy_report_datasource {
    least_conn;
    server 127.0.0.1:6063;
}
server {
    listen       8888 default_server;
    listen       [::]:8888 default_server;
    server_name  _;
    server_tokens off;

    location ^~ /api/ {
        proxy_pass http://proxy_cloudpivot;
        #proxy_set_header   Host              $host:$server_port;
        proxy_set_header X-Real-IP           $remote_addr;
        proxy_set_header X-Forwarded-For     $proxy_add_x_forwarded_for;
        
        #可将下面两个配置为固定值: 对应入口层协议和端口 (适用于: nginx外层还有proxy并与当前scheme, server_port不一致的情况)
        proxy_set_header X-Forwarded-Proto   $scheme;
        #proxy_set_header X-Forwarded-Proto   https;
        proxy_set_header X-Forwarded-Port    $server_port;
        #proxy_set_header X-Forwarded-Port    8888;
        
        #absolute_redirect off;
        client_max_body_size 200m;
        proxy_read_timeout  300;
    }
    
    location /v1/ {
        proxy_pass http://proxy_cloudpivot/api/v1/;
        #proxy_set_header   Host              $host:$server_port;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Port    $server_port;
        #absolute_redirect off;
        client_max_body_size 200m;
        proxy_read_timeout  300;
    }
    
    location /dashboard/ {
        proxy_pass http://proxy_report_dashboard/;
        #proxy_set_header   Host              $host:$server_port;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Port    $server_port;
        #absolute_redirect off;
        client_max_body_size 200m;
        proxy_read_timeout  300;
    }

    location /data-source/ {
        proxy_pass http://proxy_report_datasource/;
        #proxy_set_header   Host              $host:$server_port;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Port    $server_port;
        #absolute_redirect off;
        client_max_body_size 200m;
        proxy_read_timeout  300;
    }  
}
```

</details>