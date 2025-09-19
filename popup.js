// popup.js
class PopupController {
  constructor() {
    // 字典设置
    this.dictSettings = {
      enabled: true,
      dictionaries: {
        'cambridge': { name: 'Cambridge Dictionary', enabled: true },
        'oxford': { name: 'Oxford Dictionary', enabled: true },
        'collins': { name: 'Collins Dictionary', enabled: true },
        'merriam': { name: 'Merriam-Webster', enabled: true },
        'longman': { name: 'Longman Dictionary', enabled: true },
        'macmillan': { name: 'Macmillan Dictionary', enabled: true },
        'vocabulary': { name: 'Vocabulary.com', enabled: true },
        'wordnik': { name: 'Wordnik', enabled: true },
        'thesaurus': { name: 'Thesaurus.com', enabled: true },
        'etymonline': { name: 'Etymology Online', enabled: true },
        'urban': { name: 'Urban Dictionary', enabled: false },
        'wiktionary': { name: 'Wiktionary', enabled: false }
      }
    };

    // 颜色方案
    this.colorSchemes = {
      'default': {
        name: '默认',
        background: '#ffffff',
        text: '#333333',
        highlight: '#ffeb3b',
        border: '#e0e0e0'
      },
      'dark': {
        name: '深色',
        background: '#2d2d2d',
        text: '#ffffff',
        highlight: '#4caf50',
        border: '#555555'
      },
      'sepia': {
        name: '护眼',
        background: '#f4f1e8',
        text: '#5c4b37',
        highlight: '#d4af37',
        border: '#d4c5a9'
      }
    };

    this.init();
    this.initUpdateNotification();
  }

  async init() {
    await this.checkStatus();
    this.bindEvents();
    await this.loadDictSettings();
    await this.loadColorSettings();
    await this.loadTextSettings();
  }

  bindEvents() {
    const toggleBtn = document.getElementById('toggleBtn');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => this.handleToggle());
    }

    // 绑定侧边栏事件
    this.bindSidebarEvents();
    
    // 绑定字典设置事件
    this.bindDictEvents();
    
    // 绑定颜色设置事件
    this.bindColorEvents();
    
    // 绑定文本设置事件
    this.bindTextEvents();
  }

  bindSidebarEvents() {
    const sidebarBtns = document.querySelectorAll('.sidebar-btn');
    sidebarBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        
        // 移除所有按钮的active状态
        sidebarBtns.forEach(b => b.classList.remove('active'));
        
        // 添加当前按钮的active状态
        btn.classList.add('active');
        
        // 显示对应页面
        const btnId = btn.getAttribute('data-page');
        this.handleSidebarClick(btnId);
      });
    });
  }

  handleSidebarClick(btnId) {
    switch(btnId) {
      case 'home':
        this.showPage('home-page');
        break;
      case 'dict':
        this.showPage('dict-page');
        break;
      case 'color':
        this.showPage('color-page');
        break;
      case 'text':
        this.showPage('text-page');
        break;
      default:
        this.showPage('home-page');
    }
  }

  // 初始化更新通知
  async initUpdateNotification() {
    try {
      const result = await chrome.storage.local.get(['updateAvailable', 'updateNotificationShown']);
      
      if (result.updateAvailable && !result.updateNotificationShown) {
        this.showUpdateNotification(result.updateAvailable);
      }
    } catch (error) {
      console.error('初始化更新通知失败:', error);
    }
  }

  // 显示更新通知
  showUpdateNotification(updateInfo) {
    const notification = document.getElementById('update-notification');
    const title = document.getElementById('update-title');
    const description = document.getElementById('update-description');
    const downloadBtn = document.getElementById('download-update-btn');
    const dismissBtn = document.getElementById('dismiss-update-btn');

    if (!notification) return;

    // 设置通知内容
    title.textContent = `发现新版本 ${updateInfo.version}！`;
    description.textContent = '点击下载最新版本，享受更好的阅读体验';

    // 显示通知
    notification.style.display = 'block';

    // 绑定下载按钮事件
    downloadBtn.onclick = () => {
      this.handleDownloadUpdate(updateInfo);
    };

    // 绑定关闭按钮事件
    dismissBtn.onclick = () => {
      this.dismissUpdateNotification();
    };

    // 标记通知已显示
    chrome.storage.local.set({ updateNotificationShown: true });
  }

  // 处理下载更新
  handleDownloadUpdate(updateInfo) {
    // 打开下载页面
    chrome.tabs.create({
      url: updateInfo.downloadUrl
    });

    // 显示安装指导
    this.showInstallGuide(updateInfo);
  }

  // 显示安装指导
  showInstallGuide(updateInfo) {
    // 创建安装指导弹窗
    const guideHtml = `
      <div class="install-guide-overlay">
        <div class="install-guide-modal">
          <div class="guide-header">
            <h3>📦 安装新版本指导</h3>
            <button class="close-guide-btn">×</button>
          </div>
          <div class="guide-content">
            <div class="guide-step">
              <div class="step-number">1</div>
              <div class="step-content">
                <h4>下载新版本</h4>
                <p>在打开的页面中，找到 <strong>Assets</strong> 区域，下载 <code>ADHDGoFly-Plugin-${updateInfo.version}.zip</code> 文件</p>
              </div>
            </div>
            <div class="guide-step">
              <div class="step-number">2</div>
              <div class="step-content">
                <h4>解压文件</h4>
                <p>将下载的 zip 文件解压到一个文件夹中</p>
              </div>
            </div>
            <div class="guide-step">
              <div class="step-number">3</div>
              <div class="step-content">
                <h4>移除旧版本</h4>
                <p>在 Chrome 扩展管理页面中，先移除当前版本的插件</p>
              </div>
            </div>
            <div class="guide-step">
              <div class="step-number">4</div>
              <div class="step-content">
                <h4>安装新版本</h4>
                <p>点击"加载已解压的扩展程序"，选择解压后的文件夹</p>
              </div>
            </div>
            <div class="guide-actions">
              <button class="btn-primary" onclick="chrome.tabs.create({url: 'chrome://extensions/'})">打开扩展管理</button>
              <button class="btn-secondary close-guide-btn">我知道了</button>
            </div>
          </div>
        </div>
      </div>
    `;

    // 添加到页面
    document.body.insertAdjacentHTML('beforeend', guideHtml);

    // 绑定关闭事件
    document.querySelectorAll('.close-guide-btn').forEach(btn => {
      btn.onclick = () => {
        document.querySelector('.install-guide-overlay').remove();
      };
    });
  }

  // 关闭更新通知
  dismissUpdateNotification() {
    const notification = document.getElementById('update-notification');
    notification.style.display = 'none';
    
    // 清除后台徽章
    chrome.runtime.sendMessage({ action: 'clearBadge' });
  }

  showPage(pageId) {
    // 隐藏所有页面
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => {
      page.style.display = 'none';
    });
    
    // 显示目标页面
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
      targetPage.style.display = 'block';
    }
  }

  bindDictEvents() {
    // 绑定字典开关事件
    const dictCheckboxes = document.querySelectorAll('.dict-checkbox');
    dictCheckboxes.forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        this.saveDictSettings();
      });
    });
    
    // 绑定保存按钮事件
    const saveDictBtn = document.getElementById('saveDictBtn');
    if (saveDictBtn) {
      saveDictBtn.addEventListener('click', () => {
        this.saveDictSettings();
      });
    }
  }

  async loadDictSettings() {
    try {
      const result = await chrome.storage.sync.get(['dictSettings']);
      if (result.dictSettings) {
        this.dictSettings = { ...this.dictSettings, ...result.dictSettings };
      }
      this.updateDictUI();
    } catch (error) {
      console.error('加载字典设置失败:', error);
    }
  }

  updateDictUI() {
    Object.keys(this.dictSettings.dictionaries).forEach(dictId => {
      const checkbox = document.getElementById(`dict-${dictId}`);
      if (checkbox) {
        checkbox.checked = this.dictSettings.dictionaries[dictId].enabled;
      }
    });
  }

  async saveDictSettings() {
    try {
      // 更新设置对象
      const dictCheckboxes = document.querySelectorAll('.dict-checkbox');
      dictCheckboxes.forEach(checkbox => {
        const dictId = checkbox.id.replace('dict-', '');
        if (this.dictSettings.dictionaries[dictId]) {
          this.dictSettings.dictionaries[dictId].enabled = checkbox.checked;
        }
      });
      
      // 保存到存储
      await chrome.storage.sync.set({ dictSettings: this.dictSettings });
      
      // 通知content script更新设置
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab) {
          await chrome.tabs.sendMessage(tab.id, {
            action: 'updateDictSettings',
            settings: this.dictSettings
          });
        }
      } catch (error) {
        // 忽略无法发送消息的错误（如在扩展页面）
      }
      
      // 显示保存成功提示
      this.showSaveSuccess();
    } catch (error) {
      console.error('保存字典设置失败:', error);
    }
  }

  async checkStatus() {
    try {
      const result = await chrome.storage.local.get(['enabled', 'stats']);
      const enabled = result.enabled !== false; // 默认启用
      const stats = result.stats || { wordsProcessed: 0, sessionsCount: 0 };
      
      this.updateUI(enabled);
      this.updateStats(stats);
    } catch (error) {
      console.error('检查状态失败:', error);
      // 默认状态
      this.updateUI(true);
      this.updateStats({ wordsProcessed: 0, sessionsCount: 0 });
    }
  }

  async handleToggle() {
    try {
      const result = await chrome.storage.local.get(['enabled']);
      const currentEnabled = result.enabled !== false;
      const newEnabled = !currentEnabled;
      
      await chrome.storage.local.set({ enabled: newEnabled });
      
      // 通知background script状态变化
      chrome.runtime.sendMessage({
        action: 'toggleExtension',
        enabled: newEnabled
      });
      
      this.updateUI(newEnabled);
    } catch (error) {
      console.error('切换状态失败:', error);
    }
  }

  updateUI(enabled) {
    const toggleBtn = document.getElementById('toggleBtn');
    const statusText = document.getElementById('statusText');
    const statusIcon = document.getElementById('statusIcon');
    
    if (toggleBtn) {
      toggleBtn.textContent = enabled ? '关闭插件' : '启用插件';
      toggleBtn.className = enabled ? 'btn btn-danger' : 'btn btn-success';
    }
    
    if (statusText) {
      statusText.textContent = enabled ? '已启用' : '已关闭';
      statusText.className = enabled ? 'status-text enabled' : 'status-text disabled';
    }
    
    if (statusIcon) {
      statusIcon.textContent = enabled ? '✓' : '✗';
      statusIcon.className = enabled ? 'status-icon enabled' : 'status-icon disabled';
    }
  }

  updateStats(stats) {
    const wordsCount = document.getElementById('wordsCount');
    const sessionsCount = document.getElementById('sessionsCount');
    
    if (wordsCount) {
      wordsCount.textContent = stats.wordsProcessed || 0;
    }
    
    if (sessionsCount) {
      sessionsCount.textContent = stats.sessionsCount || 0;
    }
  }

  bindColorEvents() {
    // 绑定颜色方案选择事件
    const colorOptions = document.querySelectorAll('.color-option');
    colorOptions.forEach(option => {
      option.addEventListener('click', () => {
        const scheme = option.getAttribute('data-scheme');
        this.selectColorScheme(scheme);
      });
    });
    
    // 绑定保存按钮事件
    const saveColorBtn = document.getElementById('saveColorBtn');
    if (saveColorBtn) {
      saveColorBtn.addEventListener('click', () => {
        this.saveColorSettings();
      });
    }
  }

  selectColorScheme(scheme) {
    // 移除所有选中状态
    const colorOptions = document.querySelectorAll('.color-option');
    colorOptions.forEach(option => {
      option.classList.remove('selected');
    });
    
    // 添加当前选中状态
    const selectedOption = document.querySelector(`[data-scheme="${scheme}"]`);
    if (selectedOption) {
      selectedOption.classList.add('selected');
    }
    
    // 更新当前选择
    this.currentColorScheme = scheme;
    
    // 实时预览
    this.previewColorScheme(scheme);
  }

  previewColorScheme(scheme) {
    const colors = this.colorSchemes[scheme];
    if (!colors) return;
    
    // 这里可以添加实时预览逻辑
    // 暂时只更新UI显示
  }

  async loadColorSettings() {
    try {
      const result = await chrome.storage.sync.get(['colorScheme']);
      const savedScheme = result.colorScheme || 'default';
      this.currentColorScheme = savedScheme;
      this.updateColorUI();
    } catch (error) {
      console.error('加载颜色设置失败:', error);
      this.currentColorScheme = 'default';
      this.updateColorUI();
    }
  }

  updateColorUI() {
    // 更新选中状态
    const colorOptions = document.querySelectorAll('.color-option');
    colorOptions.forEach(option => {
      const scheme = option.getAttribute('data-scheme');
      if (scheme === this.currentColorScheme) {
        option.classList.add('selected');
      } else {
        option.classList.remove('selected');
      }
    });
  }

  async saveColorSettings() {
    try {
      await chrome.storage.sync.set({ colorScheme: this.currentColorScheme });
      
      // 通知content script更新颜色设置
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab) {
          await chrome.tabs.sendMessage(tab.id, {
            action: 'updateColorScheme',
            scheme: this.currentColorScheme,
            colors: this.colorSchemes[this.currentColorScheme]
          });
        }
      } catch (error) {
        // 忽略无法发送消息的错误
      }
      
      this.showSaveSuccess();
    } catch (error) {
      console.error('保存颜色设置失败:', error);
    }
  }

  bindTextEvents() {
    // 文本设置默认值
    this.textSettings = {
      fontSize: 100,
      letterSpacing: 0,
      lineHeight: 1.5,
      paragraphSpacing: 16
    };
    
    // 绑定滑块事件
    const sliders = {
      'fontSize': { min: 80, max: 150, suffix: '%' },
      'letterSpacing': { min: -2, max: 5, suffix: 'px' },
      'lineHeight': { min: 1.0, max: 2.5, suffix: '' },
      'paragraphSpacing': { min: 8, max: 32, suffix: 'px' }
    };
    
    Object.keys(sliders).forEach(settingName => {
      const slider = document.getElementById(settingName);
      if (slider) {
        slider.addEventListener('input', (e) => {
          const value = parseFloat(e.target.value);
          this.textSettings[settingName] = value;
          this.updateTextValue(settingName, value + sliders[settingName].suffix);
          this.updateTextPreview();
        });
      }
    });
    
    // 绑定重置按钮
    const resetTextBtn = document.getElementById('resetTextBtn');
    if (resetTextBtn) {
      resetTextBtn.addEventListener('click', () => {
        this.resetTextSettings();
      });
    }
    
    // 绑定保存按钮
    const saveTextBtn = document.getElementById('saveTextBtn');
    if (saveTextBtn) {
      saveTextBtn.addEventListener('click', () => {
        this.saveTextSettings();
      });
    }
  }

  updateTextValue(settingName, value) {
    const valueElement = document.getElementById(settingName + 'Value');
    if (valueElement) {
      valueElement.textContent = value;
    }
  }

  updateTextPreview() {
    const preview = document.getElementById('textPreview');
    if (preview) {
      preview.style.fontSize = this.textSettings.fontSize + '%';
      preview.style.letterSpacing = this.textSettings.letterSpacing + 'px';
      preview.style.lineHeight = this.textSettings.lineHeight;
      preview.style.marginBottom = this.textSettings.paragraphSpacing + 'px';
    }
  }

  async loadTextSettings() {
    try {
      const result = await chrome.storage.sync.get(['textSettings']);
      if (result.textSettings) {
        this.textSettings = { ...this.textSettings, ...result.textSettings };
      }
      this.updateTextUI();
    } catch (error) {
      console.error('加载文本设置失败:', error);
    }
  }

  updateTextUI() {
    // 更新滑块值
    const fontSizeSlider = document.getElementById('fontSize');
    if (fontSizeSlider) {
      fontSizeSlider.value = this.textSettings.fontSize;
      this.updateTextValue('fontSize', this.textSettings.fontSize + '%');
    }
    
    const letterSpacingSlider = document.getElementById('letterSpacing');
    if (letterSpacingSlider) {
      letterSpacingSlider.value = this.textSettings.letterSpacing;
      this.updateTextValue('letterSpacing', this.textSettings.letterSpacing + 'px');
    }
    
    const lineHeightSlider = document.getElementById('lineHeight');
    if (lineHeightSlider) {
      lineHeightSlider.value = this.textSettings.lineHeight;
      this.updateTextValue('lineHeight', this.textSettings.lineHeight);
    }
    
    const paragraphSpacingSlider = document.getElementById('paragraphSpacing');
    if (paragraphSpacingSlider) {
      paragraphSpacingSlider.value = this.textSettings.paragraphSpacing;
      this.updateTextValue('paragraphSpacing', this.textSettings.paragraphSpacing + 'px');
    }
    
    // 更新预览
    this.updateTextPreview();
  }

  async saveTextSettings() {
    try {
      await chrome.storage.sync.set({ textSettings: this.textSettings });
      
      // 通知content script更新文本设置
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab) {
          await chrome.tabs.sendMessage(tab.id, {
            action: 'updateTextSettings',
            settings: this.textSettings
          });
        }
      } catch (error) {
        // 忽略无法发送消息的错误
      }
      
      this.showSaveSuccess();
    } catch (error) {
      console.error('保存文本设置失败:', error);
    }
  }

  resetTextSettings() {
    this.textSettings = {
      fontSize: 100,
      letterSpacing: 0,
      lineHeight: 1.5,
      paragraphSpacing: 16
    };
    
    this.updateTextUI();
  }

  showSaveSuccess() {
    // 创建成功提示
    const toast = document.createElement('div');
    toast.className = 'toast success';
    toast.textContent = '设置已保存';
    
    document.body.appendChild(toast);
    
    // 显示动画
    setTimeout(() => {
      toast.classList.add('show');
    }, 100);
    
    // 自动隐藏
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 300);
    }, 2000);
  }
}

// 全局引用，供HTML onclick使用
let popupController;

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  popupController = new PopupController();
});