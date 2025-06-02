// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

import mdx from '@astrojs/mdx';

// https://astro.build/config
export default defineConfig({
    site: 'https://easy-lau.github.io',
    base: 'cloudpivot-doc',
    integrations: [starlight({
        title: 'CloudPivot',
        locales: {
            root: {
              label: '简体中文',
              lang: 'zh-CN',
            },
          },
        // social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/withastro/starlight' }],
        sidebar: [
            { label: '简介', slug: 'introduce' },
            { label: '常用命令', slug: 'common' },
            {
                label: 'CentOS部署',
                items: [
					{ label: '在线部署', slug: 'centos/online-install' },
                    { label: '离线部署', slug: 'centos/offline-install' }
                ],
            },
            {
                label: 'Debian部署',
                items: [
					{ label: '在线部署', slug: 'debian/online-install' },
                    { label: '离线部署', slug: 'debian/offline-install' }
                ],
            },
            {
                label: '运维配置',
                items: [
					{ label: 'CentOS修改源', slug: 'safeguard/centos/centos-repo' },
                    { label: 'CentOS卸载MySQL', slug: 'safeguard/centos/mysql-uninstall' },
                    { label: 'CentOS创建SFTP', slug: 'safeguard/centos/centos-sftp' },
                    { label: 'CentOS部署Redis哨兵模式', slug: 'safeguard/centos/redis-sentinel' },
                    { label: 'MySQL自动备份脚本', slug: 'safeguard/other/mysql-backup' },
                    { label: 'Nginx配置HTTPS', slug: 'safeguard/other/nginx-https' },
                    { label: 'Redis常见操作', slug: 'safeguard/other/redis-command' },
                    { label: '服务器设置UTF-8编码', slug: 'safeguard/other/set-utf-8' },
                    
                ],
            },
            {
                label: '常见问题',
                items: [
					{ label: '部署成功后访问首页403', slug: 'issue/index403' },
                    { label: '服务器创建SFTP用户', slug: 'issue/sftp' }
                    
                ],
            },
        ],
		}), mdx()],
    // 关闭调试
    devToolbar: {
        enabled: false
    },
    // // 国际化
    // i18n: {
    // 	locales: ["zh", "en", "pt-br"],
    // 	defaultLocale: "zh",
    // },
    markdown: {
        shikiConfig: {
          theme: 'dracula',
        },
      }
});