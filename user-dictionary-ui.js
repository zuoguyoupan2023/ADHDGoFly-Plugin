/**
 * 用户词典UI管理器
 * 负责处理用户词典相关的界面交互
 */
class UserDictionaryUI {
    constructor(i18nManager) {
        this.i18nManager = i18nManager;
        this.userDictionaryManager = null;
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.currentLanguageFilter = '';
        this.currentSearchQuery = '';
        this.isEditMode = false;
        this.editingWord = null;
        
        this.initializeElements();
        this.bindEvents();
    }

    /**
     * 初始化DOM元素引用
     */
    initializeElements() {
        // 控制按钮
        this.addWordBtn = document.getElementById('add-word-btn');
        this.importDictBtn = document.getElementById('import-dict-btn');
        this.exportDictBtn = document.getElementById('export-dict-btn');
        
        // 搜索和过滤
        this.searchInput = document.getElementById('dict-search-input');
        this.languageFilter = document.getElementById('dict-language-filter');
        
        // 词汇列表
        this.dictList = document.getElementById('user-dict-list');
        this.emptyState = document.getElementById('dict-empty-state');
        
        // 分页
        this.pagination = document.getElementById('dict-pagination');
        this.prevPageBtn = document.getElementById('prev-page-btn');
        this.nextPageBtn = document.getElementById('next-page-btn');
        this.pageInfo = document.getElementById('page-info');
        
        // 模态框
        this.modal = document.getElementById('word-edit-modal');
        this.modalTitle = document.getElementById('modal-title');
        this.closeModalBtn = document.getElementById('close-modal-btn');
        this.cancelBtn = document.getElementById('cancel-btn');
        this.saveWordBtn = document.getElementById('save-word-btn');
        
        // 表单元素
        this.wordInput = document.getElementById('word-input');
        this.languageSelect = document.getElementById('language-select');
        this.notesInput = document.getElementById('notes-input');
        this.posCheckboxes = document.querySelectorAll('.pos-checkbox input[type="checkbox"]');
        
        // 文件输入
        this.importFileInput = document.getElementById('import-file-input');
    }

    /**
     * 绑定事件监听器
     */
    bindEvents() {
        // 控制按钮事件
        this.addWordBtn?.addEventListener('click', () => this.openAddWordModal());
        this.importDictBtn?.addEventListener('click', () => this.importDictionary());
        this.exportDictBtn?.addEventListener('click', () => this.exportDictionary());
        
        // 搜索和过滤事件
        this.searchInput?.addEventListener('input', (e) => this.handleSearch(e.target.value));
        this.languageFilter?.addEventListener('change', (e) => this.handleLanguageFilter(e.target.value));
        
        // 分页事件
        this.prevPageBtn?.addEventListener('click', () => this.goToPreviousPage());
        this.nextPageBtn?.addEventListener('click', () => this.goToNextPage());
        
        // 模态框事件
        this.closeModalBtn?.addEventListener('click', () => this.closeModal());
        this.cancelBtn?.addEventListener('click', () => this.closeModal());
        this.saveWordBtn?.addEventListener('click', () => this.saveWord());
        
        // 点击模态框外部关闭
        this.modal?.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.closeModal();
            }
        });
        
        // 文件导入事件
        this.importFileInput?.addEventListener('change', (e) => this.handleFileImport(e));
        
        // 表单提交事件
        document.getElementById('word-edit-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveWord();
        });
    }

    /**
     * 初始化用户词典UI
     */
    async init() {
        // 从content script获取用户词典管理器引用
        try {
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tabs[0]) {
                const response = await chrome.tabs.sendMessage(tabs[0].id, {
                    action: 'getUserDictionaryManager'
                });
                
                if (response && response.success) {
                    // 这里我们不能直接获取管理器实例，需要通过消息传递来操作
                    this.hasUserDictionaryManager = true;
                    await this.refreshWordList();
                }
            }
        } catch (error) {
            console.log('Content script not available, user dictionary features disabled');
        }
    }

    /**
     * 发送消息到content script
     */
    async sendMessageToContentScript(message) {
        try {
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tabs[0]) {
                return await chrome.tabs.sendMessage(tabs[0].id, message);
            }
        } catch (error) {
            console.error('发送消息到content script失败:', error);
            throw error;
        }
    }

    /**
     * 设置用户词典管理器引用
     */
    setUserDictionaryManager(manager) {
        this.userDictionaryManager = manager;
        this.refreshWordList();
    }

    /**
     * 刷新词汇列表
     */
    async refreshWordList() {
        if (!this.hasUserDictionaryManager) {
            console.warn('用户词典管理器未可用');
            return;
        }

        try {
            const response = await this.sendMessageToContentScript({
                action: 'userDict_getAllWords'
            });

            if (response && response.success) {
                let words = response.words || [];

                // 应用语言过滤
                if (this.currentLanguageFilter) {
                    words = words.filter(word => word.language === this.currentLanguageFilter);
                }

                // 应用搜索过滤
                if (this.currentSearchQuery) {
                    const query = this.currentSearchQuery.toLowerCase();
                    words = words.filter(word => 
                        word.word.toLowerCase().includes(query) ||
                        (word.notes && word.notes.toLowerCase().includes(query))
                    );
                }

                this.renderWordList(words);
                this.updatePagination(words.length);
            }
        } catch (error) {
            console.error('Failed to refresh word list:', error);
        }
    }

    /**
     * 渲染词汇列表
     */
    renderWordList(words) {
        if (words.length === 0) {
            this.dictList.innerHTML = `<div class="dict-empty">${this.i18nManager.t('userDictionary.empty')}</div>`;
            this.pagination.style.display = 'none';
            return;
        }
        
        // 分页处理
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const pageWords = words.slice(startIndex, endIndex);
        
        const html = pageWords.map(word => this.createWordItemHTML(word)).join('');
        this.dictList.innerHTML = html;
        
        // 绑定词汇项事件
        this.bindWordItemEvents();
        
        this.pagination.style.display = words.length > this.itemsPerPage ? 'flex' : 'none';
    }

    /**
     * 创建词汇项HTML
     */
    createWordItemHTML(word) {
        const posLabels = word.pos.map(pos => this.i18nManager.t(`pos.${this.getPosKey(pos)}`)).join(', ');
        const languageName = this.getLanguageName(word.language);
        
        return `
            <div class="word-item" data-word="${word.word}" data-language="${word.language}">
                <div class="word-info">
                    <div class="word-text">${word.word}</div>
                    <div class="word-meta">
                        <span class="word-language">${languageName}</span>
                        <span class="word-pos">${posLabels}</span>
                    </div>
                    ${word.notes ? `<div class="word-notes">${word.notes}</div>` : ''}
                </div>
                <div class="word-actions">
                    <button class="action-btn small edit-word-btn" data-i18n="userDictionary.editWord">编辑</button>
                    <button class="action-btn small delete-word-btn" data-i18n="userDictionary.deleteWord">删除</button>
                </div>
            </div>
        `;
    }

    /**
     * 绑定词汇项事件
     */
    bindWordItemEvents() {
        // 编辑按钮事件
        document.querySelectorAll('.edit-word-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const wordItem = e.target.closest('.word-item');
                const word = wordItem.dataset.word;
                const language = wordItem.dataset.language;
                this.openEditWordModal(language, word);
            });
        });
        
        // 删除按钮事件
        document.querySelectorAll('.delete-word-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const wordItem = e.target.closest('.word-item');
                const word = wordItem.dataset.word;
                const language = wordItem.dataset.language;
                this.deleteWord(language, word);
            });
        });
    }

    /**
     * 获取词性键名
     */
    getPosKey(pos) {
        const posMap = {
            'n': 'noun',
            'v': 'verb',
            'adj': 'adjective',
            'adv': 'adverb',
            'prep': 'preposition',
            'conj': 'conjunction',
            'pron': 'pronoun',
            'num': 'numeral',
            'int': 'interjection'
        };
        return posMap[pos] || pos;
    }

    /**
     * 获取语言名称
     */
    getLanguageName(langCode) {
        const langMap = {
            'zh': '中文',
            'en': 'English',
            'fr': 'Français',
            'ru': 'Русский',
            'es': 'Español',
            'ja': '日本語'
        };
        return langMap[langCode] || langCode;
    }

    /**
     * 更新分页信息
     */
    updatePagination(totalItems) {
        const totalPages = Math.ceil(totalItems / this.itemsPerPage);
        
        this.prevPageBtn.disabled = this.currentPage <= 1;
        this.nextPageBtn.disabled = this.currentPage >= totalPages;
        
        this.pageInfo.textContent = `${this.currentPage} / ${totalPages}`;
    }

    /**
     * 处理搜索
     */
    handleSearch(query) {
        this.currentSearchQuery = query;
        this.currentPage = 1;
        this.refreshWordList();
    }

    /**
     * 处理语言过滤
     */
    handleLanguageFilter(language) {
        this.currentLanguageFilter = language;
        this.currentPage = 1;
        this.refreshWordList();
    }

    /**
     * 上一页
     */
    goToPreviousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.refreshWordList();
        }
    }

    /**
     * 下一页
     */
    goToNextPage() {
        this.currentPage++;
        this.refreshWordList();
    }

    /**
     * 打开添加词汇模态框
     */
    openAddWordModal() {
        this.isEditMode = false;
        this.editingWord = null;
        
        this.modalTitle.textContent = this.i18nManager.t('userDictionary.addWord');
        this.clearForm();
        this.showModal();
    }

    /**
     * 打开编辑词汇模态框
     */
    async openEditWordModal(language, word) {
        this.isEditMode = true;
        this.editingWord = { language, word };
        
        this.modalTitle.textContent = this.i18nManager.t('userDictionary.editWord');
        
        try {
            // 通过消息传递加载词汇数据
            const response = await this.sendMessageToContentScript({
                action: 'userDict_getWord',
                language: language,
                word: word
            });
            
            if (response && response.success && response.wordData) {
                const wordData = response.wordData;
                this.wordInput.value = word;
                this.languageSelect.value = language;
                this.notesInput.value = wordData.notes || '';
                
                // 设置词性复选框
                this.posCheckboxes.forEach(checkbox => {
                    checkbox.checked = wordData.pos.includes(checkbox.value);
                });
            }
        } catch (error) {
            console.error('Failed to load word data:', error);
        }
        
        this.showModal();
    }

    /**
     * 显示模态框
     */
    showModal() {
        this.modal.style.display = 'flex';
        this.wordInput.focus();
    }

    /**
     * 关闭模态框
     */
    closeModal() {
        this.modal.style.display = 'none';
        this.clearForm();
    }

    /**
     * 清空表单
     */
    clearForm() {
        this.wordInput.value = '';
        this.languageSelect.value = 'zh';
        this.notesInput.value = '';
        this.posCheckboxes.forEach(checkbox => {
            checkbox.checked = false;
        });
    }

    /**
     * 保存词汇
     */
    async saveWord() {
        const word = this.wordInput.value.trim();
        const language = this.languageSelect.value;
        const notes = this.notesInput.value.trim();
        
        // 获取选中的词性
        const selectedPos = Array.from(this.posCheckboxes)
            .filter(checkbox => checkbox.checked)
            .map(checkbox => checkbox.value);
        
        if (!word) {
            alert('请输入词汇');
            return;
        }
        
        if (selectedPos.length === 0) {
            alert('请至少选择一个词性');
            return;
        }
        
        try {
            let response;
            if (this.isEditMode) {
                // 编辑模式
                response = await this.sendMessageToContentScript({
                    action: 'userDict_editWord',
                    language: language,
                    word: word,
                    updates: {
                        pos: selectedPos,
                        notes: notes
                    }
                });
            } else {
                // 添加模式 - 先检查词汇是否存在
                const checkResponse = await this.sendMessageToContentScript({
                    action: 'userDict_hasWord',
                    language: language,
                    word: word
                });
                
                if (checkResponse && checkResponse.exists) {
                    alert(this.i18nManager.t('userDictionary.wordExists'));
                    return;
                }
                
                response = await this.sendMessageToContentScript({
                    action: 'userDict_addWord',
                    language: language,
                    word: word,
                    pos: selectedPos,
                    notes: notes
                });
            }
            
            if (response && response.success) {
                this.showMessage(this.isEditMode ? 
                    this.i18nManager.t('userDictionary.editSuccess') :
                    this.i18nManager.t('userDictionary.addSuccess'));
                
                this.closeModal();
                this.refreshWordList();
            } else {
                throw new Error(response?.error || 'Unknown error');
            }
            
        } catch (error) {
            console.error('Failed to save word:', error);
            alert('保存失败：' + error.message);
        }
    }

    /**
     * 删除词汇
     */
    async deleteWord(language, word) {
        if (!confirm(this.i18nManager.t('userDictionary.confirmDelete'))) {
            return;
        }
        
        try {
            const response = await this.sendMessageToContentScript({
                action: 'userDict_deleteWord',
                language: language,
                word: word
            });
            
            if (response && response.success) {
                this.showMessage(this.i18nManager.t('userDictionary.deleteSuccess'));
                this.refreshWordList();
            } else {
                throw new Error(response?.error || 'Unknown error');
            }
        } catch (error) {
            console.error('Failed to delete word:', error);
            alert('删除失败：' + error.message);
        }
    }

    /**
     * 导入词典
     */
    importDictionary() {
        this.importFileInput.click();
    }

    /**
     * 处理文件导入
     */
    async handleFileImport(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            
            const response = await this.sendMessageToContentScript({
                action: 'userDict_importDictionary',
                data: data,
                merge: true
            });
            
            if (response && response.success) {
                this.showMessage(this.i18nManager.t('userDictionary.importSuccess'));
                this.refreshWordList();
            } else {
                throw new Error(response?.error || 'Import failed');
            }
            
        } catch (error) {
            console.error('Failed to import dictionary:', error);
            alert(this.i18nManager.t('userDictionary.importError') + ': ' + error.message);
        } finally {
            // 清空文件输入
            event.target.value = '';
        }
    }

    /**
     * 导出词典
     */
    async exportDictionary() {
        try {
            const response = await this.sendMessageToContentScript({
                action: 'userDict_exportDictionary'
            });
            
            if (response && response.success && response.data) {
                const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                
                const a = document.createElement('a');
                a.href = url;
                a.download = `user-dictionary-${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                
                URL.revokeObjectURL(url);
                this.showMessage(this.i18nManager.t('userDictionary.exportSuccess'));
            } else {
                throw new Error(response?.error || 'Export failed');
            }
            
        } catch (error) {
            console.error('Failed to export dictionary:', error);
            alert('导出失败：' + error.message);
        }
    }

    /**
     * 显示消息
     */
    showMessage(message) {
        // 简单的消息显示，可以后续改进为更好的UI
        console.log(message);
        // 可以添加toast通知等
    }

    /**
     * 更新UI语言
     */
    updateLanguage() {
        // 刷新词汇列表以更新翻译
        this.refreshWordList();
    }
}

// 导出类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UserDictionaryUI;
}