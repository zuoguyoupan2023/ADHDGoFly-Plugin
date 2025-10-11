/**
 * 基于实际文件清单的目录扫描器
 * 使用预生成的文件列表，避免大量404请求
 */
class FileListScanner {
    constructor() {
        // 硬编码的文件列表（基于实际存在的文件）
        this.actualFiles = [
            // 根目录下的词典文件
            'EN_word.json',
            'ES_word.json',
            'FR_word.json',
            'JA_word.json',
            'RU_word.json',
            'ZH_word.json',
            // ZH目录下的词典文件
            'ZH/111.json',
            'ZH/ZH_word_animal.json',
            'ZH/ZH_word_caijing.json',
            'ZH/ZH_word_car.json',
            'ZH/ZH_word_chengyu.json',
            'ZH/ZH_word_diming.json',
            'ZH/ZH_word_food.json',
            'ZH/ZH_word_it.json',
            'ZH/ZH_word_law.json',
            'ZH/ZH_word_lishimingren.json',
            'ZH/ZH_word_medical.json',
            'ZH/ZH_word_poem.json'
        ];
        
        // 动态发现的文件列表（从注册表获取）
        this.dynamicFiles = [];
    }

    /**
     * 从注册表中获取动态添加的词典文件
     * @returns {Promise<string[]>} 动态文件路径数组
     */
    async getDynamicFilesFromRegistry() {
        try {
            const dynamicFiles = [];
            
            // 从Chrome storage读取自定义词典注册表
            const customRegistryResult = await new Promise((resolve) => {
                chrome.storage.local.get(['customDictRegistry'], (result) => {
                    resolve(result);
                });
            });
            
            if (customRegistryResult.customDictRegistry) {
                console.log('🔍 从Chrome storage读取自定义词典注册表');
                const customRegistry = customRegistryResult.customDictRegistry;
                
                // 检查所有类型的词典：preset, downloaded, local
                const allDictTypes = ['preset', 'downloaded', 'local'];
                
                for (const dictType of allDictTypes) {
                    if (customRegistry.dictionaries && customRegistry.dictionaries[dictType]) {
                        for (const dict of customRegistry.dictionaries[dictType]) {
                            if (dict.filePath && dict.filePath.startsWith('dictionaries/')) {
                                // 移除 'dictionaries/' 前缀
                                const relativePath = dict.filePath.replace('dictionaries/', '');
                                
                                // 如果不在硬编码列表中，添加到动态列表
                                if (!this.actualFiles.includes(relativePath)) {
                                    dynamicFiles.push(relativePath);
                                    console.log(`🔍 发现动态词典文件: ${relativePath} (类型: ${dictType}, 来源: ${dict.source || 'unknown'})`);
                                }
                            }
                        }
                    }
                }
            } else {
                console.log('📋 Chrome storage中未找到自定义词典注册表');
            }
            
            return dynamicFiles;
        } catch (error) {
            console.error('获取动态文件列表失败:', error);
            return [];
        }
    }

    /**
     * 获取所有JSON文件列表
     * @returns {Promise<string[]>} 文件路径数组
     */
    async getAllJsonFiles() {
        console.log('📋 基于实际文件清单扫描dictionaries文件夹...');
        
        // 获取动态文件列表
        this.dynamicFiles = await this.getDynamicFilesFromRegistry();
        
        // 合并硬编码文件和动态文件
        const allFiles = [...this.actualFiles, ...this.dynamicFiles];
        
        // 验证文件是否真实存在（可选）
        const existingFiles = [];
        
        for (const file of allFiles) {
            const exists = await this.verifyFileExists(file);
            if (exists) {
                existingFiles.push(file);
            }
        }
        
        console.log(`✅ 扫描完成，共发现 ${existingFiles.length} 个JSON文件:`);
        existingFiles.forEach(file => {
            const isDynamic = this.dynamicFiles.includes(file);
            const prefix = isDynamic ? '🆕' : '📄';
            console.log(`  ${prefix} ${file}${isDynamic ? ' (动态发现)' : ''}`);
        });
        
        return existingFiles;
    }

    /**
     * 验证文件是否存在（静默模式）
     * @param {string} filePath 文件路径
     * @returns {Promise<boolean>} 文件是否存在
     */
    async verifyFileExists(filePath) {
        try {
            let url;
            if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
                url = chrome.runtime.getURL(`dictionaries/${filePath}`);
            } else {
                url = `dictionaries/${filePath}`;
            }
            
            const response = await fetch(url, { method: 'HEAD' });
            return response.ok;
        } catch (error) {
            return false;
        }
    }

    /**
     * 获取文件统计信息
     * @returns {Object} 统计信息
     */
    getFileStats() {
        const stats = {
            total: this.actualFiles.length + this.dynamicFiles.length,
            rootFiles: [...this.actualFiles, ...this.dynamicFiles].filter(f => !f.includes('/')).length,
            subDirectories: {}
        };

        [...this.actualFiles, ...this.dynamicFiles].forEach(file => {
            if (file.includes('/')) {
                const dir = file.split('/')[0];
                stats.subDirectories[dir] = (stats.subDirectories[dir] || 0) + 1;
            }
        });

        return stats;
    }

    /**
     * 生成文件报告
     */
    generateReport() {
        const stats = this.getFileStats();

        console.log('📊 文件统计报告:');
        console.log(`  📁 总文件数: ${stats.total} (硬编码: ${this.actualFiles.length}, 动态: ${this.dynamicFiles.length})`);
        console.log(`  📄 根目录文件: ${stats.rootFiles}`);

        Object.entries(stats.subDirectories).forEach(([dir, count]) => {
            console.log(`  📂 ${dir}/: ${count} 个文件`);
        });
    }
}

// 创建实例
const fileListScanner = new FileListScanner();

// 自动执行扫描（仅在Chrome扩展环境中）
if (typeof chrome !== 'undefined' && chrome.runtime) {
    console.log('🚀 启动基于文件清单的扫描器...');
    fileListScanner.getAllJsonFiles().then(files => {
        fileListScanner.generateReport();
    }).catch(error => {
        console.error('❌ 扫描失败:', error);
    });
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { FileListScanner, fileListScanner };
} else if (typeof window !== 'undefined') {
    window.FileListScanner = FileListScanner;
    window.fileListScanner = fileListScanner;
}