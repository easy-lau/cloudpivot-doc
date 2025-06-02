#!/usr/bin/env sh

# 确保脚本抛出遇到的错误
set -e


push_addr=git@8.217.138.79:/home/git/cloudpivot-doc.git
commit_info=`git describe --all --always --long`
dist_path=/dist # 打包生成的文件夹路径
push_branch=master # 推送的分支

# 生成静态文件
npm run docs:build

# 进入生成的文件夹
cd $dist_path

git init
git add -A
git commit -m "deploy, $commit_info"
git push -f $push_addr HEAD:$push_branch

cd -
rm -rf $dist_path
