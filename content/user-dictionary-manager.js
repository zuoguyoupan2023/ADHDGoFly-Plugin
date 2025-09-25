/**
 * 用户自定义词典管理器
 * 负责管理用户添加的自定义词汇
 */
class UserDictionaryManager {
    constructor() {
        this.userDict = {
            version: '1.0.0',
            lastUpdated: Date.now(),
            languages: {}
        };
        this.isLoaded = false;
        this.loadPromise = null;
    }

    /**
     * 初始化用户词典管理器
     */
    async initialize() {
        if (this.loadPromise) {
            return this.loadPromise;
        }
        
        this.loadPromise = this.loadUserDictionary();
        return this.loadPromise;
    }

    /**
     * 从存储中加载用户词典数据
     */
    async loadUserDictionary() {
        try {
            const result = await chrome.storage.local.get(['userDictionary']);
            if (result.userDictionary) {
                this.userDict = {
                    ...this.userDict,
                    ...result.userDictionary
                };
            }
            this.isLoaded = true;
            console.log('User dictionary loaded:', this.getStatistics());
        } catch (error) {
            console.error('Failed to load user dictionary:', error);
            this.isLoaded = true; // 即使加载失败也标记为已加载，使用默认空词典
        }
    }

    /**
     * 保存用户词典数据到存储
     */
    async saveUserDictionary() {
        try {
            this.userDict.lastUpdated = Date.now();
            await chrome.storage.local.set({ userDictionary: this.userDict });
            console.log('User dictionary saved successfully');
        } catch (error) {
            console.error('Failed to save user dictionary:', error);
            throw error;
        }
    }

    /**
     * 等待词典加载完成
     */
    async waitForLoad() {
        if (this.isLoaded) {
            return;
        }
        if (this.loadPromise) {
            await this.loadPromise;
        } else {
            await this.initialize();
        }
    }

    /**
     * 添加新词汇
     * @param {string} language - 语言代码 (zh, en, etc.)
     * @param {string} word - 词汇
     * @param {string[]} pos - 词性数组
     * @param {string} notes - 备注
     */
    async addWord(language, word, pos = [], notes = '') {
        await this.waitForLoad();
        
        if (!word || !language) {
            throw new Error('Word and language are required');
        }

        // 初始化语言对象
        if (!this.userDict.languages[language]) {
            this.userDict.languages[language] = { words: {} };
        }

        // 添加词汇
        this.userDict.languages[language].words[word] = {
            pos: Array.isArray(pos) ? pos : [pos],
            addedBy: 'user',
            addedAt: Date.now(),
            notes: notes || ''
        };

        await this.saveUserDictionary();
        return true;
    }

    /**
     * 编辑现有词汇
     * @param {string} language - 语言代码
     * @param {string} word - 词汇
     * @param {Object} newData - 新的词汇数据
     */
    async editWord(language, word, newData) {
        await this.waitForLoad();
        
        if (!this.hasWord(language, word)) {
            throw new Error(`Word "${word}" not found in language "${language}"`);
        }

        const currentData = this.userDict.languages[language].words[word];
        this.userDict.languages[language].words[word] = {
            ...currentData,
            ...newData,
            addedBy: 'user', // 保持用户标识
            addedAt: currentData.addedAt, // 保持原始添加时间
            lastModified: Date.now()
        };

        await this.saveUserDictionary();
        return true;
    }

    /**
     * 删除词汇
     * @param {string} language - 语言代码
     * @param {string} word - 词汇
     */
    async deleteWord(language, word) {
        await this.waitForLoad();
        
        if (!this.hasWord(language, word)) {
            return false;
        }

        delete this.userDict.languages[language].words[word];
        
        // 如果语言下没有词汇了，删除语言对象
        if (Object.keys(this.userDict.languages[language].words).length === 0) {
            delete this.userDict.languages[language];
        }

        await this.saveUserDictionary();
        return true;
    }

    /**
     * 检查是否存在指定词汇
     * @param {string} language - 语言代码
     * @param {string} word - 词汇
     */
    hasWord(language, word) {
        return this.userDict.languages[language] && 
               this.userDict.languages[language].words[word];
    }

    /**
     * 获取指定词汇的信息
     * @param {string} language - 语言代码
     * @param {string} word - 词汇
     */
    getWord(language, word) {
        if (!this.hasWord(language, word)) {
            return null;
        }
        return this.userDict.languages[language].words[word];
    }

    /**
     * 查找词汇的词性
     * @param {string} language - 语言代码
     * @param {string} word - 词汇
     */
    lookupWord(language, word) {
        const wordData = this.getWord(language, word);
        return wordData ? wordData.pos : null;
    }

    /**
     * 搜索词汇
     * @param {string} language - 语言代码
     * @param {string} query - 搜索查询
     */
    searchWords(language, query) {
        if (!this.userDict.languages[language]) {
            return [];
        }

        const words = this.userDict.languages[language].words;
        const results = [];
        const queryLower = query.toLowerCase();

        for (const [word, data] of Object.entries(words)) {
            if (word.toLowerCase().includes(queryLower) || 
                (data.notes && data.notes.toLowerCase().includes(queryLower))) {
                results.push({
                    word,
                    ...data
                });
            }
        }

        return results.sort((a, b) => a.word.localeCompare(b.word));
    }

    /**
     * 获取指定语言的所有词汇
     * @param {string} language - 语言代码
     */
    getWordsByLanguage(language) {
        if (!this.userDict.languages[language]) {
            return [];
        }

        const words = this.userDict.languages[language].words;
        return Object.entries(words).map(([word, data]) => ({
            word,
            ...data
        })).sort((a, b) => a.word.localeCompare(b.word));
    }

    /**
     * 获取所有支持的语言
     */
    getSupportedLanguages() {
        return Object.keys(this.userDict.languages);
    }

    /**
     * 获取所有词汇
     */
    getAllWords() {
        const allWords = [];
        
        for (const [language, data] of Object.entries(this.userDict.languages)) {
            const words = data.words;
            for (const [word, wordData] of Object.entries(words)) {
                allWords.push({
                    id: `${language}_${word}`,
                    word,
                    language,
                    ...wordData
                });
            }
        }
        
        return allWords.sort((a, b) => a.word.localeCompare(b.word));
    }

    /**
     * 获取统计信息
     */
    getStatistics() {
        const stats = {
            totalLanguages: 0,
            totalWords: 0,
            languageStats: {}
        };

        for (const [language, data] of Object.entries(this.userDict.languages)) {
            const wordCount = Object.keys(data.words).length;
            stats.languageStats[language] = wordCount;
            stats.totalWords += wordCount;
            stats.totalLanguages++;
        }

        return stats;
    }

    /**
     * 导出用户词典数据
     */
    exportDictionary() {
        return {
            ...this.userDict,
            exportedAt: Date.now()
        };
    }

    /**
     * 导入词典数据
     * @param {Object} data - 要导入的词典数据
     * @param {boolean} merge - 是否合并现有数据
     */
    async importDictionary(data, merge = true) {
        if (!data || typeof data !== 'object') {
            throw new Error('Invalid dictionary data');
        }

        if (!data.languages || typeof data.languages !== 'object') {
            throw new Error('Invalid dictionary format: missing languages');
        }

        await this.waitForLoad();

        if (merge) {
            // 合并模式：将新数据合并到现有数据中
            for (const [language, langData] of Object.entries(data.languages)) {
                if (!this.userDict.languages[language]) {
                    this.userDict.languages[language] = { words: {} };
                }
                
                for (const [word, wordData] of Object.entries(langData.words || {})) {
                    this.userDict.languages[language].words[word] = {
                        ...wordData,
                        importedAt: Date.now()
                    };
                }
            }
        } else {
            // 替换模式：完全替换现有数据
            this.userDict = {
                version: data.version || '1.0.0',
                lastUpdated: Date.now(),
                languages: data.languages
            };
        }

        await this.saveUserDictionary();
        return true;
    }

    /**
     * 清空用户词典
     */
    async clearDictionary() {
        this.userDict = {
            version: '1.0.0',
            lastUpdated: Date.now(),
            languages: {}
        };
        await this.saveUserDictionary();
    }

    /**
     * 检查管理器是否已准备就绪
     */
    isReady() {
        return this.isLoaded;
    }
}

// 导出类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UserDictionaryManager;
}