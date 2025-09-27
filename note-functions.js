// 笔记页面相关方法
class NoteFunctions {
  constructor(controller) {
    this.controller = controller;
  }

  bindNoteEvents() {
    const addWordBtn = document.getElementById('add-word');
    if (addWordBtn) {
      addWordBtn.addEventListener('click', () => this.addWord());
    }
    
    const batchAddBtn = document.getElementById('batch-add');
    if (batchAddBtn) {
      batchAddBtn.addEventListener('click', () => this.batchAddWords());
    }
    
    const saveDictBtn = document.getElementById('save-dict');
    if (saveDictBtn) {
      saveDictBtn.addEventListener('click', () => this.saveDictionary());
    }
    
    const clearWordsBtn = document.getElementById('clear-words');
    if (clearWordsBtn) {
      clearWordsBtn.addEventListener('click', () => this.clearWords());
    }
    
    const dictNameInput = document.getElementById('dict-name');
    if (dictNameInput) {
      dictNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.saveDictionary();
        }
      });
    }
    
    const wordInput = document.getElementById('word-input');
    if (wordInput) {
      wordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.addWord();
        }
      });
    }
  }
  
  generateDictName() {
    const languageSelect = document.getElementById('dict-language');
    const language = languageSelect ? languageSelect.value : 'en';
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    
    return language + '-' + year + '-' + month + '-' + day + '-' + random;
  }
  
  addWord() {
    const wordInput = document.getElementById('word-input');
    const posSelect = document.getElementById('word-pos');
    
    if (!wordInput || !posSelect) return;
    
    const word = wordInput.value.trim();
    const pos = posSelect.value;
    
    if (!word) {
      alert('请输入词汇');
      return;
    }
    
    const exists = this.controller.currentWords.some(w => w.word === word && w.pos === pos);
    if (exists) {
      alert('该词汇已存在');
      return;
    }
    
    this.controller.currentWords.push({ word, pos });
    wordInput.value = '';
    this.updateWordList();
  }
  
  batchAddWords() {
    const batchInput = document.getElementById('batch-words');
    const posSelect = document.getElementById('word-pos');
    
    if (!batchInput || !posSelect) return;
    
    const text = batchInput.value.trim();
    const pos = posSelect.value;
    
    if (!text) {
      alert('请输入词汇');
      return;
    }
    
    const words = text.split(/[\s,。\n]+/)
      .map(w => w.trim())
      .filter(w => w.length > 0);
    
    let addedCount = 0;
    
    words.forEach(word => {
      const exists = this.controller.currentWords.some(w => w.word === word && w.pos === pos);
      if (!exists) {
        this.controller.currentWords.push({ word, pos });
        addedCount++;
      }
    });
    
    batchInput.value = '';
    this.updateWordList();
    alert('成功添加 ' + addedCount + ' 个词汇');
  }
  
  updateWordList() {
    const wordList = document.getElementById('word-list');
    if (!wordList) return;
    
    if (this.controller.currentWords.length === 0) {
      wordList.innerHTML = '<div class="empty-state">暂无词汇</div>';
      return;
    }
    
    const html = this.controller.currentWords.map((item, index) => {
      return '<div class="word-item">' +
        '<div class="word-info">' +
        '<span class="word-text">' + item.word + '</span>' +
        '<span class="word-pos">[' + item.pos + ']</span>' +
        '</div>' +
        '<button class="remove-word-btn" onclick="removeWord(' + index + ')">删除</button>' +
        '</div>';
    }).join('');
    
    wordList.innerHTML = html;
  }
  
  removeWord(index) {
    this.controller.currentWords.splice(index, 1);
    this.updateWordList();
  }
  
  clearWords() {
    if (this.controller.currentWords.length === 0) return;
    
    if (confirm('确定要清空所有词汇吗？')) {
      this.controller.currentWords = [];
      this.updateWordList();
    }
  }
  
  async saveDictionary() {
    const dictNameInput = document.getElementById('dict-name');
    const languageSelect = document.getElementById('dict-language');
    
    if (!dictNameInput || !languageSelect) return;
    
    let dictName = dictNameInput.value.trim();
    const language = languageSelect.value;
    
    if (!dictName) {
      dictName = this.generateDictName();
      dictNameInput.value = dictName;
    }
    
    if (this.controller.currentWords.length === 0) {
      alert('请至少添加一个词汇');
      return;
    }
    
    const exists = this.controller.userDictionaries.some(dict => dict.name === dictName);
    if (exists) {
      alert('词典名称已存在，请使用其他名称');
      return;
    }
    
    const dictionary = {
      id: Date.now().toString(),
      name: dictName,
      language: language,
      words: [...this.controller.currentWords],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    this.controller.userDictionaries.push(dictionary);
    await this.saveUserDictionaries();
    
    this.controller.currentWords = [];
    dictNameInput.value = '';
    
    this.updateWordList();
    this.updateSavedDictList();
    
    alert('词典保存成功！');
  }
  
  async loadUserDictionaries() {
    try {
      // 检查是否在扩展环境中
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const result = await chrome.storage.local.get(['userDictionaries']);
        this.controller.userDictionaries = result.userDictionaries || [];
      } else {
        // 测试环境使用localStorage
        const stored = localStorage.getItem('userDictionaries');
        this.controller.userDictionaries = stored ? JSON.parse(stored) : [];
      }
      this.updateSavedDictList();
    } catch (error) {
      console.error('加载用户词典失败:', error);
      this.controller.userDictionaries = [];
    }
  }
  
  async saveUserDictionaries() {
    try {
      // 检查是否在扩展环境中
      if (typeof chrome !== 'undefined' && chrome.storage) {
        await chrome.storage.local.set({ userDictionaries: this.controller.userDictionaries });
      } else {
        // 测试环境使用localStorage
        localStorage.setItem('userDictionaries', JSON.stringify(this.controller.userDictionaries));
      }
    } catch (error) {
      console.error('保存用户词典失败:', error);
    }
  }
  
  updateSavedDictList() {
    const savedDictList = document.getElementById('saved-dict-list');
    if (!savedDictList) return;
    
    if (this.controller.userDictionaries.length === 0) {
      savedDictList.innerHTML = '<div class="empty-state">暂无保存的词典</div>';
      return;
    }
    
    const html = this.controller.userDictionaries.map(dict => {
      const languageName = this.controller.supportedLanguages.find(lang => lang.code === dict.language)?.name || dict.language;
      const createdDate = new Date(dict.createdAt).toLocaleDateString();
      
      return '<div class="dict-item">' +
        '<div class="dict-header">' +
        '<span class="dict-name">' + dict.name + '</span>' +
        '<span class="dict-language">' + languageName + '</span>' +
        '</div>' +
        '<div class="dict-info">' +
        '创建时间: ' + createdDate + ' | 词汇数量: ' + dict.words.length +
        '</div>' +
        '<div class="dict-actions">' +
        '<button class="dict-action-btn edit-btn" onclick="editDictionary(\'' + dict.id + '\')">' + '编辑</button>' +
        '<button class="dict-action-btn export-btn" onclick="exportDictionary(\'' + dict.id + '\')">' + '导出</button>' +
        '<button class="dict-action-btn delete-btn" onclick="deleteDictionary(\'' + dict.id + '\')">' + '删除</button>' +
        '</div>' +
        '</div>';
    }).join('');
    
    savedDictList.innerHTML = html;
  }
  
  editDictionary(dictId) {
    const dict = this.controller.userDictionaries.find(d => d.id === dictId);
    if (!dict) return;
    
    const newName = prompt('请输入新的词典名称:', dict.name);
    if (newName && newName.trim() && newName.trim() !== dict.name) {
      const trimmedName = newName.trim();
      
      const exists = this.controller.userDictionaries.some(d => d.id !== dictId && d.name === trimmedName);
      if (exists) {
        alert('词典名称已存在，请使用其他名称');
        return;
      }
      
      dict.name = trimmedName;
      dict.updatedAt = new Date().toISOString();
      
      this.saveUserDictionaries();
      this.updateSavedDictList();
    }
  }
  
  exportDictionary(dictId) {
    const dict = this.controller.userDictionaries.find(d => d.id === dictId);
    if (!dict) return;
    
    const exportData = {};
    dict.words.forEach(word => {
      if (!exportData[word.pos]) {
        exportData[word.pos] = [];
      }
      exportData[word.pos].push(word.word);
    });
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = dict.name + '.json';
    link.click();
    
    URL.revokeObjectURL(url);
  }
  
  deleteDictionary(dictId) {
    const dict = this.controller.userDictionaries.find(d => d.id === dictId);
    if (!dict) return;
    
    if (confirm('确定要删除词典 "' + dict.name + '" 吗？此操作不可恢复。')) {
      this.controller.userDictionaries = this.controller.userDictionaries.filter(d => d.id !== dictId);
      this.saveUserDictionaries();
      this.updateSavedDictList();
    }
  }
}