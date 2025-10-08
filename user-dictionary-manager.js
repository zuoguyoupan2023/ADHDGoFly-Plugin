// 用户自建词典管理器
class UserDictionaryManager {
  constructor() {
    this.userDictionaries = new Map();
    this.maxDictionaries = 10;
    this.maxWordsPerDictionary = 2000;
    this.currentEditingDict = null;
    this.currentWords = new Map();
    
    this.init();
  }

  async init() {
    console.log('初始化用户词典管理器...');
    await this.loadUserDictionaries();
    this.bindEvents();
    this.updateUI();
  }

  bindEvents() {
    // 创建词典按钮
    const createBtn = document.getElementById('create-dict-btn');
    if (createBtn) {
      createBtn.addEventListener('click', () => this.showCreateDictionary());
    }

    // 返回按钮
    const backBtn = document.getElementById('back-to-dict-btn');
    if (backBtn) {
      backBtn.addEventListener('click', () => this.backToDictList());
    }

    // 保存词典按钮
    const saveBtn = document.getElementById('save-dict-btn');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.saveDictionary());
    }

    // 取消编辑按钮
    const cancelBtn = document.getElementById('cancel-edit-btn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.backToDictList());
    }

    // 添加词汇按钮
    const addWordBtn = document.getElementById('add-word-btn');
    if (addWordBtn) {
      addWordBtn.addEventListener('click', () => this.showAddWord());
    }

    // 批量导入按钮
    const importBtn = document.getElementById('import-words-btn');
    if (importBtn) {
      importBtn.addEventListener('click', () => this.showImportModal());
    }

    // 词汇搜索
    const searchInput = document.getElementById('word-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => this.filterWords(e.target.value));
    }

    // 词性筛选
    const posFilter = document.getElementById('pos-filter');
    if (posFilter) {
      posFilter.addEventListener('change', (e) => this.filterByPos(e.target.value));
    }

    // 排序
    const sortSelect = document.getElementById('word-sort');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => this.sortWords(e.target.value));
    }

    // 词汇编辑模态框事件
    this.bindWordEditorEvents();

    // 批量导入模态框事件
    this.bindImportModalEvents();
  }

  bindWordEditorEvents() {
    // 关闭词汇编辑模态框
    const closeBtn = document.getElementById('close-word-editor');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.hideWordEditor());
    }

    // 保存词汇
    const saveWordBtn = document.getElementById('save-word-btn');
    if (saveWordBtn) {
      saveWordBtn.addEventListener('click', () => this.saveWord());
    }

    // 取消词汇编辑
    const cancelWordBtn = document.getElementById('cancel-word-btn');
    if (cancelWordBtn) {
      cancelWordBtn.addEventListener('click', () => this.hideWordEditor());
    }
  }

  bindImportModalEvents() {
    // 关闭导入模态框
    const closeBtn = document.getElementById('close-import-modal');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.hideImportModal());
    }

    // 标签页切换
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tabId = e.target.dataset.tab;
        this.switchImportTab(tabId);
      });
    });

    // 预览导入
    const previewBtn = document.getElementById('preview-import-btn');
    if (previewBtn) {
      previewBtn.addEventListener('click', () => this.previewImport());
    }

    // 确认导入
    const confirmBtn = document.getElementById('confirm-import-btn');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => this.confirmImport());
    }

    // 取消导入
    const cancelBtn = document.getElementById('cancel-import-btn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.hideImportModal());
    }

    // 文件选择
    const fileInput = document.getElementById('import-file');
    if (fileInput) {
      fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
    }
  }

  // 加载用户词典
  async loadUserDictionaries() {
    try {
      const result = await chrome.storage.local.get(['userDictionaries']);
      if (result.userDictionaries) {
        this.userDictionaries = new Map(Object.entries(result.userDictionaries));
      }
    } catch (error) {
      console.error('加载用户词典失败:', error);
    }
  }

  // 保存用户词典到存储
  async saveUserDictionaries() {
    try {
      const dictObj = Object.fromEntries(this.userDictionaries);
      await chrome.storage.local.set({ userDictionaries: dictObj });
      console.log('用户词典已保存');
    } catch (error) {
      console.error('保存用户词典失败:', error);
      throw error;
    }
  }

  // 更新UI显示
  updateUI() {
    const listContainer = document.getElementById('user-dict-list');
    if (!listContainer) return;

    // 清空现有内容
    listContainer.innerHTML = '';

    if (this.userDictionaries.size === 0) {
      const emptyMsg = document.createElement('div');
      emptyMsg.className = 'empty-message';
      emptyMsg.setAttribute('data-i18n', 'pages.dict.userDictionaries.empty');
      emptyMsg.textContent = '暂无自建词典，点击上方按钮创建';
      listContainer.appendChild(emptyMsg);
      return;
    }

    // 按语言分组显示用户词典
    const dictsByLanguage = new Map();
    for (const [dictId, dict] of this.userDictionaries) {
      const lang = dict.meta.language;
      if (!dictsByLanguage.has(lang)) {
        dictsByLanguage.set(lang, []);
      }
      dictsByLanguage.get(lang).push({ id: dictId, ...dict });
    }

    // 渲染每个语言分组
    for (const [language, dicts] of dictsByLanguage) {
      const langGroup = this.createLanguageGroup(language, dicts);
      listContainer.appendChild(langGroup);
    }
  }

  createLanguageGroup(language, dicts) {
    const group = document.createElement('div');
    group.className = 'user-dict-language-group';
    
    const header = document.createElement('div');
    header.className = 'user-dict-lang-header';
    header.innerHTML = `
      <span class="lang-name">${this.getLanguageName(language)}</span>
      <span class="dict-count">(${dicts.length})</span>
    `;
    
    const list = document.createElement('div');
    list.className = 'user-dict-items';
    
    dicts.forEach(dict => {
      const item = this.createDictItem(dict);
      list.appendChild(item);
    });
    
    group.appendChild(header);
    group.appendChild(list);
    return group;
  }

  createDictItem(dict) {
    const item = document.createElement('div');
    item.className = 'user-dict-item';
    item.dataset.dictId = dict.id;
    
    const currentLang = window.i18n ? window.i18n.getCurrentLanguage() : 'zh';
    const displayName = dict.meta.displayName[currentLang] || dict.meta.displayName.zh;
    
    item.innerHTML = `
      <div class="user-dict-header">
        <div class="user-dict-name">${displayName}</div>
        <div class="user-dict-actions">
          <button class="edit-btn" onclick="userDictManager.editDictionary('${dict.id}')" data-i18n="pages.dict.userDictionaries.edit">编辑</button>
          <button class="delete-btn" onclick="userDictManager.deleteDictionary('${dict.id}')" data-i18n="pages.dict.userDictionaries.delete">删除</button>
          <button class="export-btn" onclick="userDictManager.exportDictionary('${dict.id}')" data-i18n="pages.dict.userDictionaries.export">导出</button>
        </div>
      </div>
      <div class="user-dict-info">
        <div class="user-dict-meta">
          <span>${dict.meta.wordCount || 0}词</span>
          <span>${dict.meta.domain}</span>
          <span>${new Date(dict.meta.createdAt).toLocaleDateString()}</span>
        </div>
        <div class="user-dict-toggle">
          <input type="checkbox" id="user-dict-${dict.id}" ${dict.meta.enabled ? 'checked' : ''} 
                 onchange="userDictManager.toggleDictionary('${dict.id}', this.checked)">
          <label for="user-dict-${dict.id}" data-i18n="pages.dict.userDictionaries.enable">启用</label>
        </div>
      </div>
    `;
    
    return item;
  }

  getLanguageName(langCode) {
    const names = {
      'zh': '中文',
      'en': 'English',
      'fr': 'Français',
      'es': 'Español',
      'ru': 'Русский',
      'ja': '日本語'
    };
    return names[langCode] || langCode;
  }

  // 显示创建词典页面
  showCreateDictionary() {
    this.currentEditingDict = null;
    this.currentWords.clear();
    this.resetForm();
    
    const editorTitle = document.getElementById('editor-title');
    if (editorTitle) {
      editorTitle.textContent = window.i18n ? window.i18n.t('pages.dictEditor.createTitle') : '创建词典';
    }
    
    this.showEditorPage();
  }

  // 编辑词典
  editDictionary(dictId) {
    const dict = this.userDictionaries.get(dictId);
    if (!dict) return;
    
    this.currentEditingDict = dictId;
    this.currentWords = new Map(Object.entries(dict.words || {}));
    this.populateForm(dict);
    
    const editorTitle = document.getElementById('editor-title');
    if (editorTitle) {
      editorTitle.textContent = window.i18n ? window.i18n.t('pages.dictEditor.editTitle') : '编辑词典';
    }
    
    this.showEditorPage();
    this.updateWordsDisplay();
  }

  // 删除词典
  async deleteDictionary(dictId) {
    const dict = this.userDictionaries.get(dictId);
    if (!dict) return;
    
    const currentLang = window.i18n ? window.i18n.getCurrentLanguage() : 'zh';
    const displayName = dict.meta.displayName[currentLang] || dict.meta.displayName.zh;
    const confirmMsg = currentLang === 'en' 
      ? `Are you sure you want to delete "${displayName}"?`
      : `确定要删除词典"${displayName}"吗？`;
    
    if (confirm(confirmMsg)) {
      this.userDictionaries.delete(dictId);
      await this.saveUserDictionaries();
      this.updateUI();
      
      // 通知popup更新词典设置
      if (window.popupController) {
        window.popupController.loadDictSettings();
      }
    }
  }

  // 切换词典启用状态
  async toggleDictionary(dictId, enabled) {
    const dict = this.userDictionaries.get(dictId);
    if (!dict) return;
    
    dict.meta.enabled = enabled;
    dict.meta.updatedAt = new Date().toISOString();
    
    await this.saveUserDictionaries();
    
    // 通知popup更新词典设置
    if (window.popupController) {
      window.popupController.loadDictSettings();
    }
  }

  // 导出词典
  exportDictionary(dictId) {
    const dict = this.userDictionaries.get(dictId);
    if (!dict) return;
    
    const exportData = {
      meta: dict.meta,
      words: dict.words,
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${dict.meta.name}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // 显示编辑器页面
  showEditorPage() {
    const dictPage = document.getElementById('dict-page');
    const editorPage = document.getElementById('dict-editor-page');
    
    if (dictPage) dictPage.classList.remove('active');
    if (editorPage) editorPage.classList.add('active');
  }

  // 返回词典列表
  backToDictList() {
    const dictPage = document.getElementById('dict-page');
    const editorPage = document.getElementById('dict-editor-page');
    
    if (editorPage) editorPage.classList.remove('active');
    if (dictPage) dictPage.classList.add('active');
    
    this.currentEditingDict = null;
    this.currentWords.clear();
  }

  // 重置表单
  resetForm() {
    const form = document.getElementById('dict-editor-page');
    if (!form) return;
    
    const inputs = form.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      if (input.type === 'checkbox') {
        input.checked = false;
      } else {
        input.value = '';
      }
    });
    
    // 设置默认值
    const langSelect = document.getElementById('dict-language');
    if (langSelect) langSelect.value = 'zh';
    
    const domainSelect = document.getElementById('dict-domain');
    if (domainSelect) domainSelect.value = 'general';
    
    this.updateWordCount();
    this.updateWordsDisplay();
  }

  // 填充表单（编辑模式）
  populateForm(dict) {
    const nameZh = document.getElementById('dict-name-zh');
    const nameEn = document.getElementById('dict-name-en');
    const language = document.getElementById('dict-language');
    const domain = document.getElementById('dict-domain');
    const descZh = document.getElementById('dict-desc-zh');
    const descEn = document.getElementById('dict-desc-en');
    
    if (nameZh) nameZh.value = dict.meta.displayName.zh || '';
    if (nameEn) nameEn.value = dict.meta.displayName.en || '';
    if (language) language.value = dict.meta.language || 'zh';
    if (domain) domain.value = dict.meta.domain || 'general';
    if (descZh) descZh.value = dict.meta.description?.zh || '';
    if (descEn) descEn.value = dict.meta.description?.en || '';
    
    this.updateWordCount();
  }

  // 保存词典
  async saveDictionary() {
    try {
      const formData = this.getFormData();
      if (!this.validateForm(formData)) {
        return;
      }
      
      const dictId = this.currentEditingDict || this.generateDictionaryId(formData.language);
      const now = new Date().toISOString();
      
      const dictData = {
        meta: {
          id: dictId,
          name: this.generateDictName(formData.nameZh),
          displayName: {
            zh: formData.nameZh,
            en: formData.nameEn
          },
          language: formData.language,
          type: 'local',
          domain: formData.domain,
          description: {
            zh: formData.descZh,
            en: formData.descEn
          },
          author: 'User',
          tags: [formData.domain],
          createdAt: this.currentEditingDict ? 
            this.userDictionaries.get(this.currentEditingDict).meta.createdAt : now,
          updatedAt: now,
          version: '1.0',
          wordCount: this.currentWords.size,
          priority: 45,
          enabled: true
        },
        words: Object.fromEntries(this.currentWords)
      };
      
      this.userDictionaries.set(dictId, dictData);
      await this.saveUserDictionaries();
      
      // 显示保存成功提示
      this.showSaveSuccess();
      
      // 返回列表页面
      setTimeout(() => {
        this.backToDictList();
        this.updateUI();
        
        // 通知popup更新词典设置
        if (window.popupController) {
          window.popupController.loadDictSettings();
        }
      }, 1000);
      
    } catch (error) {
      console.error('保存词典失败:', error);
      this.showSaveError(error.message);
    }
  }

  getFormData() {
    return {
      nameZh: document.getElementById('dict-name-zh')?.value.trim() || '',
      nameEn: document.getElementById('dict-name-en')?.value.trim() || '',
      language: document.getElementById('dict-language')?.value || 'zh',
      domain: document.getElementById('dict-domain')?.value || 'general',
      descZh: document.getElementById('dict-desc-zh')?.value.trim() || '',
      descEn: document.getElementById('dict-desc-en')?.value.trim() || ''
    };
  }

  validateForm(formData) {
    if (!formData.nameZh) {
      alert('请输入中文名称');
      return false;
    }
    
    if (!formData.nameEn) {
      alert('请输入英文名称');
      return false;
    }
    
    if (this.userDictionaries.size >= this.maxDictionaries && !this.currentEditingDict) {
      alert(`词典数量已达上限(${this.maxDictionaries})`);
      return false;
    }
    
    return true;
  }

  generateDictionaryId(language) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 6);
    return `user-${language}-${timestamp}-${random}`;
  }

  generateDictName(displayName) {
    return displayName.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_').toUpperCase();
  }

  showSaveSuccess() {
    const saveBtn = document.getElementById('save-dict-btn');
    if (saveBtn) {
      const originalText = saveBtn.textContent;
      saveBtn.textContent = '保存成功';
      saveBtn.style.backgroundColor = '#28a745';
      
      setTimeout(() => {
        saveBtn.textContent = originalText;
        saveBtn.style.backgroundColor = '';
      }, 1000);
    }
  }

  showSaveError(message) {
    alert(`保存失败: ${message}`);
  }

  // 词汇管理相关方法
  updateWordCount() {
    const countElement = document.getElementById('word-count');
    if (countElement) {
      const count = this.currentWords.size;
      countElement.textContent = `(${count}词)`;
    }
  }

  updateWordsDisplay() {
    const wordsList = document.getElementById('words-list');
    if (!wordsList) return;
    
    wordsList.innerHTML = '';
    
    if (this.currentWords.size === 0) {
      const emptyMsg = document.createElement('div');
      emptyMsg.className = 'empty-words-message';
      emptyMsg.textContent = '暂无词汇，点击"添加词汇"开始创建';
      wordsList.appendChild(emptyMsg);
      return;
    }
    
    for (const [word, data] of this.currentWords) {
      const item = this.createWordItem(word, data);
      wordsList.appendChild(item);
    }
    
    this.updateWordCount();
  }

  createWordItem(word, data) {
    const item = document.createElement('div');
    item.className = 'word-item';
    item.dataset.word = word;
    
    const posLabels = data.pos.map(pos => `<span class="word-pos">${pos}</span>`).join('');
    
    item.innerHTML = `
      <div class="word-info">
        <span class="word-text">${word}</span>
        ${posLabels}
      </div>
      <div class="word-item-actions">
        <button onclick="userDictManager.editWord('${word}')">编辑</button>
        <button onclick="userDictManager.deleteWord('${word}')">删除</button>
      </div>
    `;
    
    return item;
  }

  // 显示添加词汇模态框
  showAddWord() {
    this.currentEditingWord = null;
    this.resetWordForm();
    
    const title = document.getElementById('word-editor-title');
    if (title) {
      title.textContent = '添加词汇';
    }
    
    this.showWordEditor();
  }

  // 编辑词汇
  editWord(word) {
    const data = this.currentWords.get(word);
    if (!data) return;
    
    this.currentEditingWord = word;
    
    const wordText = document.getElementById('word-text');
    if (wordText) wordText.value = word;
    
    // 设置词性复选框
    const checkboxes = document.querySelectorAll('.pos-checkbox input[type="checkbox"]');
    checkboxes.forEach(cb => {
      cb.checked = data.pos.includes(cb.value);
    });
    
    const title = document.getElementById('word-editor-title');
    if (title) {
      title.textContent = '编辑词汇';
    }
    
    this.showWordEditor();
  }

  // 删除词汇
  deleteWord(word) {
    if (confirm(`确定要删除词汇"${word}"吗？`)) {
      this.currentWords.delete(word);
      this.updateWordsDisplay();
    }
  }

  // 显示词汇编辑器
  showWordEditor() {
    const modal = document.getElementById('word-editor-modal');
    if (modal) {
      modal.classList.add('show');
    }
  }

  // 隐藏词汇编辑器
  hideWordEditor() {
    const modal = document.getElementById('word-editor-modal');
    if (modal) {
      modal.classList.remove('show');
    }
  }

  // 重置词汇表单
  resetWordForm() {
    const wordText = document.getElementById('word-text');
    if (wordText) wordText.value = '';
    
    const checkboxes = document.querySelectorAll('.pos-checkbox input[type="checkbox"]');
    checkboxes.forEach(cb => cb.checked = false);
  }

  // 保存词汇
  saveWord() {
    const wordText = document.getElementById('word-text')?.value.trim();
    if (!wordText) {
      alert('请输入词汇');
      return;
    }
    
    const selectedPos = [];
    const checkboxes = document.querySelectorAll('.pos-checkbox input[type="checkbox"]:checked');
    checkboxes.forEach(cb => selectedPos.push(cb.value));
    
    if (selectedPos.length === 0) {
      alert('请选择至少一个词性');
      return;
    }
    
    if (this.currentWords.size >= this.maxWordsPerDictionary && !this.currentEditingWord) {
      alert(`词汇数量已达上限(${this.maxWordsPerDictionary})`);
      return;
    }
    
    // 如果是编辑模式且词汇名称改变了，删除旧词汇
    if (this.currentEditingWord && this.currentEditingWord !== wordText) {
      this.currentWords.delete(this.currentEditingWord);
    }
    
    this.currentWords.set(wordText, { pos: selectedPos });
    this.updateWordsDisplay();
    this.hideWordEditor();
  }

  // 筛选词汇
  filterWords(query) {
    const items = document.querySelectorAll('.word-item');
    items.forEach(item => {
      const word = item.dataset.word;
      const visible = !query || word.toLowerCase().includes(query.toLowerCase());
      item.style.display = visible ? 'flex' : 'none';
    });
  }

  // 按词性筛选
  filterByPos(pos) {
    const items = document.querySelectorAll('.word-item');
    items.forEach(item => {
      const word = item.dataset.word;
      const data = this.currentWords.get(word);
      const visible = !pos || (data && data.pos.includes(pos));
      item.style.display = visible ? 'flex' : 'none';
    });
  }

  // 排序词汇
  sortWords(sortType) {
    const wordsList = document.getElementById('words-list');
    if (!wordsList) return;
    
    const items = Array.from(wordsList.querySelectorAll('.word-item'));
    
    items.sort((a, b) => {
      const wordA = a.dataset.word;
      const wordB = b.dataset.word;
      
      switch (sortType) {
        case 'alpha':
          return wordA.localeCompare(wordB);
        case 'pos':
          const dataA = this.currentWords.get(wordA);
          const dataB = this.currentWords.get(wordB);
          return (dataA.pos[0] || '').localeCompare(dataB.pos[0] || '');
        case 'time':
        default:
          return 0; // 保持原有顺序
      }
    });
    
    // 重新排列DOM元素
    items.forEach(item => wordsList.appendChild(item));
  }

  // 批量导入相关方法
  showImportModal() {
    const modal = document.getElementById('import-modal');
    if (modal) {
      modal.classList.add('show');
    }
  }

  hideImportModal() {
    const modal = document.getElementById('import-modal');
    if (modal) {
      modal.classList.remove('show');
    }
    
    // 重置导入状态
    this.resetImportModal();
  }

  resetImportModal() {
    const textArea = document.getElementById('import-text');
    if (textArea) textArea.value = '';
    
    const fileInput = document.getElementById('import-file');
    if (fileInput) fileInput.value = '';
    
    const preview = document.getElementById('import-preview');
    if (preview) preview.style.display = 'none';
    
    const confirmBtn = document.getElementById('confirm-import-btn');
    if (confirmBtn) confirmBtn.disabled = true;
  }

  switchImportTab(tabId) {
    // 切换标签按钮状态
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });
    
    // 切换内容显示
    const tabs = document.querySelectorAll('.import-tab');
    tabs.forEach(tab => {
      tab.classList.toggle('active', tab.id === `${tabId}-import`);
    });
  }

  handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const fileInfo = document.getElementById('file-info');
    if (fileInfo) {
      fileInfo.textContent = `已选择: ${file.name} (${(file.size / 1024).toFixed(1)}KB)`;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      this.previewFileContent(content, file.type);
    };
    reader.readAsText(file);
  }

  previewFileContent(content, fileType) {
    const preview = document.getElementById('file-preview');
    if (!preview) return;
    
    preview.innerHTML = `<pre>${content.substring(0, 500)}${content.length > 500 ? '...' : ''}</pre>`;
  }

  previewImport() {
    const activeTab = document.querySelector('.import-tab.active');
    if (!activeTab) return;
    
    let content = '';
    if (activeTab.id === 'text-import') {
      content = document.getElementById('import-text')?.value || '';
    } else if (activeTab.id === 'file-import') {
      // 文件内容已在handleFileSelect中处理
      return;
    }
    
    if (!content.trim()) {
      alert('请输入要导入的内容');
      return;
    }
    
    const result = this.parseImportContent(content);
    this.showImportPreview(result);
  }

  parseImportContent(content) {
    const lines = content.split('\n').filter(line => line.trim());
    const result = {
      valid: [],
      duplicate: [],
      invalid: []
    };
    
    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;
      
      const parts = trimmed.split(/\s+/);
      const word = parts[0];
      const pos = parts.slice(1).join(',').split(',').filter(p => p.trim());
      
      if (!word) {
        result.invalid.push({ text: trimmed, reason: '词汇为空' });
        return;
      }
      
      if (this.currentWords.has(word)) {
        result.duplicate.push({ word, pos: pos.length > 0 ? pos : ['n'] });
        return;
      }
      
      result.valid.push({ word, pos: pos.length > 0 ? pos : ['n'] });
    });
    
    return result;
  }

  showImportPreview(result) {
    const preview = document.getElementById('import-preview');
    const validCount = document.getElementById('valid-count');
    const duplicateCount = document.getElementById('duplicate-count');
    const invalidCount = document.getElementById('invalid-count');
    const previewList = document.getElementById('preview-list');
    const confirmBtn = document.getElementById('confirm-import-btn');
    
    if (validCount) validCount.textContent = result.valid.length;
    if (duplicateCount) duplicateCount.textContent = result.duplicate.length;
    if (invalidCount) invalidCount.textContent = result.invalid.length;
    
    if (previewList) {
      previewList.innerHTML = '';
      
      // 显示有效词汇
      result.valid.forEach(item => {
        const div = document.createElement('div');
        div.className = 'preview-item valid';
        div.textContent = `${item.word} [${item.pos.join(', ')}]`;
        previewList.appendChild(div);
      });
      
      // 显示重复词汇
      result.duplicate.forEach(item => {
        const div = document.createElement('div');
        div.className = 'preview-item duplicate';
        div.textContent = `${item.word} [${item.pos.join(', ')}] - 已存在`;
        previewList.appendChild(div);
      });
      
      // 显示无效词汇
      result.invalid.forEach(item => {
        const div = document.createElement('div');
        div.className = 'preview-item invalid';
        div.textContent = `${item.text} - ${item.reason}`;
        previewList.appendChild(div);
      });
    }
    
    if (preview) preview.style.display = 'block';
    if (confirmBtn) confirmBtn.disabled = result.valid.length === 0;
    
    // 保存解析结果供确认导入使用
    this.pendingImport = result;
  }

  confirmImport() {
    if (!this.pendingImport || this.pendingImport.valid.length === 0) {
      return;
    }
    
    // 检查词汇数量限制
    const totalWords = this.currentWords.size + this.pendingImport.valid.length;
    if (totalWords > this.maxWordsPerDictionary) {
      alert(`导入后词汇总数将超过限制(${this.maxWordsPerDictionary})，请减少导入数量`);
      return;
    }
    
    // 添加有效词汇
    this.pendingImport.valid.forEach(item => {
      this.currentWords.set(item.word, { pos: item.pos });
    });
    
    this.updateWordsDisplay();
    this.hideImportModal();
    
    // 显示导入成功提示
    alert(`成功导入 ${this.pendingImport.valid.length} 个词汇`);
  }
}

// 创建全局实例
window.userDictManager = new UserDictionaryManager();