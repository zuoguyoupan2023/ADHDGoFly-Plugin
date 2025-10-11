/**
 * 简单的目录扫描器 - 直接列出dictionaries文件夹中的所有json文件
 * 不预设任何文件名格式，直接扫描所有文件
 */
class DirectoryScanner {
    constructor() {
        // 检查Chrome扩展环境
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
            this.baseUrl = chrome.runtime.getURL('dictionaries/');
        } else {
            // 在测试环境中使用相对路径
            this.baseUrl = 'dictionaries/';
        }
        this.knownDirectories = ['ZH', 'EN', 'ES', 'FR', 'JA', 'RU'];
    }

    /**
     * 扫描并列出所有json文件
     * @returns {Promise<Array>} 所有json文件的路径列表
     */
    async scanAllJsonFiles() {
        const allFiles = [];
        
        try {
            console.log('🔍 开始扫描dictionaries文件夹中的所有json文件...');
            
            // 扫描根目录
            const rootFiles = await this.scanDirectoryForJson('');
            allFiles.push(...rootFiles);
            
            // 扫描子目录
            for (const dir of this.knownDirectories) {
                const dirFiles = await this.scanDirectoryForJson(dir);
                allFiles.push(...dirFiles);
            }
            
            console.log(`📁 扫描完成，共发现 ${allFiles.length} 个json文件:`);
            allFiles.forEach(file => {
                console.log(`  📄 ${file}`);
            });
            
            return allFiles;
            
        } catch (error) {
            console.error('❌ 扫描过程中出现错误:', error);
            return allFiles;
        }
    }

    /**
     * 扫描指定目录中的所有json文件
     * @param {string} directory 目录名（空字符串表示根目录）
     * @returns {Promise<Array>} json文件路径列表
     */
    async scanDirectoryForJson(directory) {
        const files = [];
        const dirPath = directory ? `${directory}/` : '';
        
        // 尝试常见的文件名模式来发现文件
        // 由于无法直接列出目录内容，我们需要尝试可能的文件名
        const possibleFiles = this.generatePossibleFileNames(directory);
        
        for (const fileName of possibleFiles) {
            const filePath = `${dirPath}${fileName}`;
            const exists = await this.checkFileExists(filePath);
            if (exists) {
                files.push(filePath);
            }
        }
        
        return files;
    }

    /**
     * 生成可能的文件名列表
     * @param {string} directory 目录名
     * @returns {Array} 可能的文件名列表
     */
    generatePossibleFileNames(directory) {
        const possibleFiles = [];
        
        if (!directory) {
            // 根目录可能的文件
            possibleFiles.push(
                'dictionary-registry.json',
                'ZH_word.json',
                'EN_word.json',
                'ES_word.json',
                'FR_word.json',
                'JA_word.json',
                'RU_word.json'
            );
        } else {
            // 子目录可能的文件
            // 数字文件 (1-100)
            for (let i = 1; i <= 100; i++) {
                possibleFiles.push(`${i}.json`);
            }
            
            // 三位数字文件 (100-999)
            for (let i = 100; i <= 999; i++) {
                possibleFiles.push(`${i}.json`);
            }
            
            // 常见的词典类型
            const domains = [
                'animal', 'caijing', 'car', 'chengyu', 'diming', 'food', 'it', 
                'law', 'lishimingren', 'medical', 'poem', 'sport', 'tech', 
                'business', 'science', 'art', 'music', 'travel', 'cooking',
                'fashion', 'health', 'education', 'finance', 'politics'
            ];
            
            domains.forEach(domain => {
                possibleFiles.push(`${directory}_word_${domain}.json`);
                possibleFiles.push(`${directory.toLowerCase()}_word_${domain}.json`);
                possibleFiles.push(`${domain}.json`);
                possibleFiles.push(`word_${domain}.json`);
            });
            
            // 其他可能的文件名
            possibleFiles.push(
                'custom.json',
                'user.json',
                'local.json',
                'temp.json',
                'backup.json',
                'test.json',
                'main.json',
                'index.json',
                'data.json',
                'words.json',
                'dict.json',
                'dictionary.json',
                `${directory}.json`,
                `${directory.toLowerCase()}.json`,
                `${directory}_dict.json`,
                `${directory}_dictionary.json`,
                `${directory}_words.json`
            );
        }
        
        return possibleFiles;
    }

    /**
     * 检查文件是否存在
     * @param {string} filePath 文件路径
     * @returns {Promise<boolean>} 文件是否存在
     */
    async checkFileExists(filePath) {
        try {
            let url;
            if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
                url = chrome.runtime.getURL(`dictionaries/${filePath}`);
            } else {
                url = `dictionaries/${filePath}`;
            }
            
            const response = await fetch(url, {
                method: 'HEAD'
            });
            return response.ok;
        } catch (error) {
            return false;
        }
    }
}

// 创建实例并自动执行扫描
const directoryScanner = new DirectoryScanner();

// 插件加载时自动扫描并输出所有json文件
if (typeof chrome !== 'undefined' && chrome.runtime) {
    // 在Chrome扩展环境中自动执行
    directoryScanner.scanAllJsonFiles().then(files => {
        console.log('🎯 Dictionaries文件夹中的所有json文件列表:');
        console.log(files);
    }).catch(error => {
        console.error('❌ 自动扫描失败:', error);
    });
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DirectoryScanner, directoryScanner };
} else if (typeof window !== 'undefined') {
    window.DirectoryScanner = DirectoryScanner;
    window.directoryScanner = directoryScanner;
}