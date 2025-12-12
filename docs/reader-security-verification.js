/**
 * Reader端安全验证代码示例
 * 将此代码集成到你的 Reader 项目中
 */

class ReaderSecurityVerifier {
  constructor() {
    // 必须与插件端保持一致
    this.BASE_SECRET = 'AGF-READER-2024-SECURE-CHANNEL-v1';
    this.ALLOWED_EXTENSION_IDS = [
      // 生产环境扩展ID（从Chrome Web Store获取）
      'your-chrome-store-extension-id',
      // Edge扩展ID（从Edge Add-ons获取）
      'your-edge-addon-extension-id'
    ];
    
    // 用于防重放攻击的nonce缓存
    this.usedNonces = new Set();
    this.nonceCleanupInterval = null;
    
    this.init();
  }

  init() {
    // 定期清理过期的nonce（每5分钟）
    this.nonceCleanupInterval = setInterval(() => {
      this.usedNonces.clear();
      console.log('🧹 Nonce缓存已清理');
    }, 5 * 60 * 1000);
  }

  /**
   * 验证来自插件的payload
   */
  async verifyPayload(payload) {
    try {
      // 1. 检查是否包含安全信息
      if (!payload._security) {
        console.warn('⚠️ 收到未签名的payload（开发模式？）');
        return { valid: false, reason: 'no_signature', allowDev: true };
      }

      const security = payload._security;

      // 2. 检查签名版本
      if (security.version !== 'v1') {
        console.error('❌ 不支持的签名版本:', security.version);
        return { valid: false, reason: 'unsupported_version' };
      }

      // 3. 验证时间戳（防止重放攻击）
      const age = Date.now() - security.timestamp;
      if (age > 60000) { // 超过60秒
        console.error('❌ 消息已过期:', age, 'ms');
        return { valid: false, reason: 'expired' };
      }
      if (age < -5000) { // 时间戳在未来（允许5秒时钟偏差）
        console.error('❌ 时间戳异常（未来时间）');
        return { valid: false, reason: 'invalid_timestamp' };
      }

      // 4. 检查nonce（防止重放攻击）
      if (this.usedNonces.has(security.nonce)) {
        console.error('❌ 检测到重放攻击（nonce已使用）');
        return { valid: false, reason: 'replay_attack' };
      }

      // 5. 验证扩展ID（可选，用于白名单控制）
      if (this.ALLOWED_EXTENSION_IDS.length > 0) {
        const isAllowed = this.ALLOWED_EXTENSION_IDS.includes(security.extensionId);
        if (!isAllowed) {
          console.warn('⚠️ 未知的扩展ID:', security.extensionId);
          // 注意：开发模式下扩展ID会变化，所以这里只警告不拒绝
        }
      }

      // 6. 验证内容哈希
      const contentCopy = { ...payload };
      delete contentCopy._security;
      const contentHash = await this.hash(JSON.stringify(contentCopy));
      
      // 7. 验证HMAC签名
      const message = `${security.timestamp}:${security.nonce}:${security.fingerprint}:${contentHash}`;
      const expectedSignature = await this.generateHMAC(message, this.BASE_SECRET);

      if (security.signature !== expectedSignature) {
        console.error('❌ 签名验证失败');
        console.debug('期望:', expectedSignature);
        console.debug('实际:', security.signature);
        return { valid: false, reason: 'invalid_signature' };
      }

      // 8. 验证payload大小
      const sizeBytes = new Blob([JSON.stringify(payload)]).size;
      const sizeMB = sizeBytes / (1024 * 1024);
      if (sizeMB > 10) {
        console.error('❌ Payload过大:', sizeMB.toFixed(2), 'MB');
        return { valid: false, reason: 'payload_too_large' };
      }

      // 9. 标记nonce为已使用
      this.usedNonces.add(security.nonce);

      console.log('✅ 签名验证通过', {
        extensionId: security.extensionId,
        version: security.extensionVersion,
        fingerprint: security.fingerprint.substring(0, 16) + '...',
        age: age + 'ms',
        size: sizeMB.toFixed(2) + 'MB'
      });

      return { valid: true };
    } catch (error) {
      console.error('❌ 验证过程出错:', error);
      return { valid: false, reason: 'verification_error', error: error.message };
    }
  }

  /**
   * 生成HMAC签名
   */
  async generateHMAC(message, secret) {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(message);

    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', key, messageData);
    return this.arrayBufferToHex(signature);
  }

  /**
   * 生成SHA-256哈希
   */
  async hash(text) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return this.arrayBufferToHex(hashBuffer);
  }

  /**
   * ArrayBuffer转十六进制字符串
   */
  arrayBufferToHex(buffer) {
    return Array.from(new Uint8Array(buffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * 清理资源
   */
  destroy() {
    if (this.nonceCleanupInterval) {
      clearInterval(this.nonceCleanupInterval);
    }
    this.usedNonces.clear();
  }
}

// ============================================
// 使用示例
// ============================================

const verifier = new ReaderSecurityVerifier();

// 监听来自插件的消息
window.addEventListener('message', async (event) => {
  const { type, payload } = event.data;

  if (type === 'AGF_DOC_V1') {
    console.log('📨 收到文档:', payload.title);

    // 验证payload
    const verification = await verifier.verifyPayload(payload);

    if (verification.valid) {
      // ✅ 验证通过，处理文档
      console.log('✅ 安全验证通过，加载文档');
      handleDocument(payload);
      
      // 发送确认消息
      window.postMessage({ type: 'AGF_DOC_RECEIVED' }, '*');
    } else if (verification.allowDev) {
      // ⚠️ 开发模式：未签名但允许
      console.warn('⚠️ 开发模式：接受未签名的payload');
      handleDocument(payload);
      window.postMessage({ type: 'AGF_DOC_RECEIVED' }, '*');
    } else {
      // ❌ 验证失败，拒绝
      console.error('❌ 安全验证失败:', verification.reason);
      alert(`安全验证失败: ${verification.reason}\n请确保使用官方版本的ADHDGoFly插件`);
    }
  } else if (type === 'AGF_READER_READY') {
    // 插件询问Reader是否就绪
    console.log('📡 发送就绪信号');
    window.postMessage({ type: 'AGF_READER_READY' }, '*');
  }
});

// 页面加载完成后发送就绪信号
window.addEventListener('load', () => {
  console.log('📡 Reader已就绪，发送信号');
  window.postMessage({ type: 'AGF_READER_READY' }, '*');
});

function handleDocument(payload) {
  // 移除安全元数据
  const cleanPayload = { ...payload };
  delete cleanPayload._security;

  // 处理文档内容
  console.log('📄 处理文档:', {
    title: cleanPayload.title,
    length: cleanPayload.content?.length || 0,
    format: cleanPayload.format,
    lang: cleanPayload.lang
  });

  // 你的文档处理逻辑...
  // 例如：渲染Markdown、显示在编辑器中等
}

// ============================================
// 配置说明
// ============================================

/*
1. 获取扩展ID：
   - Chrome Web Store: 在扩展管理页面查看
   - Edge Add-ons: 在扩展管理页面查看
   - 开发模式: 扩展ID会变化，建议不验证ID或使用宽松模式

2. 安全级别配置：
   - 严格模式: 必须验证签名和扩展ID
   - 标准模式: 验证签名，扩展ID仅警告
   - 开发模式: 允许未签名的payload

3. 环境变量配置示例：
   const isDev = import.meta.env.DEV;
   if (isDev) {
     verifier.ALLOWED_EXTENSION_IDS = []; // 开发模式不限制
   }
*/
