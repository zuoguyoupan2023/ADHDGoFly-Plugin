#!/usr/bin/env node

/**
 * 验证构建脚本的文件包含情况
 */

const fs = require('fs');

// 检查必要文件
const requiredFiles = [
    'manifest.json',
    'background.js', 
    'content.js',
    'popup.html',  // 这个文件之前被遗漏了
    'popup.js',
    'styles.css'
];

const requiredDirs = [
    'content/',
    'dictionaries/'
];

console.log('🔍 验证插件必要文件...');

let allExists = true;

// 检查文件
requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
        console.log(`✅ ${file}`);
    } else {
        console.log(`❌ ${file} - 文件不存在!`);
        allExists = false;
    }
});

// 检查目录
requiredDirs.forEach(dir => {
    if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
        const files = fs.readdirSync(dir);
        console.log(`✅ ${dir} (${files.length} 个文件)`);
    } else {
        console.log(`❌ ${dir} - 目录不存在!`);
        allExists = false;
    }
});

if (allExists) {
    console.log('\n🎉 所有必要文件都存在，可以正常构建!');
} else {
    console.log('\n⚠️  存在缺失文件，请检查!');
    process.exit(1);
}

// 检查现有zip包内容
if (fs.existsSync('ADHDGoFly-Plugin-v0.1.0.zip')) {
    console.log('\n📦 当前zip包存在，建议重新构建以包含所有文件');
}