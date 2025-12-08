/**
 * ADHDGoFly Reader 安全通信助手
 * 支持所有安装方式：Chrome Web Store / Edge Add-ons / 手动安装
 */

class SecurityHelper {
  constructor() {
    // 预置基础密钥（所有安装共享）
    this.BASE_SECRET = 'AGF-READER-2024-SECURE-CHANNEL-v1';
    this.SIGNATURE_VERSION = 'v1';
  }

  /**
   * 获取扩展指纹（用于识别扩展实例）
   */
  async getExtensionFingerprint() {
    try {
      const result = await chrome.storage.local.get(['agfFingerprint', 'agfFingerprintCreated']);
      
      if (result.agfFingerprint) {
        return result.agfFingerprint;
      }

      // 生成新指纹
      const fingerprint = await this.generateFingerprint();
      await chrome.storage.local.set({
        agfFingerprint: fingerprint,
        agfFingerprintCreated: Date.now()
      });

      console.log('✅ 扩展指纹已生成');
      return fingerprint;
    } catch (error) {
      console.error('获取扩展指纹失败:', error);
      // 降级：使用临时指纹
      return 'temp-' + Date.now();
    }
  }

  /**
   * 生成扩展指纹
   */
  async generateFingerprint() {
    const components = [
      chrome.runtime.id,                    // 扩展ID
      chrome.runtime.getManifest().version, // 版本号
      Date.now(),                           // 首次生成时间
      crypto.randomUUID()                   // 随机UUID
    ];

    const fingerprintString = components.join(':');
    return await this.hash(fingerprintString);
  }

  /**
   * 为payload生成安全签名
   */
  async signPayload(payload) {
    const timestamp = Date.now();
    const nonce = crypto.randomUUID();
    const fingerprint = await this.getExtensionFingerprint();

    // 构建签名消息
    const signatureData = {
      timestamp,
      nonce,
      fingerprint,
      extensionId: chrome.runtime.id,
      version: chrome.runtime.getManifest().version,
      contentHash: await this.hash(JSON.stringify(payload))
    };

    // 生成签名
    const message = `${timestamp}:${nonce}:${fingerprint}:${signatureData.contentHash}`;
    const signature = await this.generateHMAC(message, this.BASE_SECRET);

    return {
      ...payload,
      _security: {
        version: this.SIGNATURE_VERSION,
        timestamp,
        nonce,
        signature,
        fingerprint,
        extensionId: chrome.runtime.id,
        extensionVersion: chrome.runtime.getManifest().version
      }
    };
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
   * 验证payload大小（防DoS）
   */
  validatePayloadSize(payload, maxSizeMB = 10) {
    const sizeBytes = new Blob([JSON.stringify(payload)]).size;
    const sizeMB = sizeBytes / (1024 * 1024);
    
    if (sizeMB > maxSizeMB) {
      throw new Error(`Payload过大: ${sizeMB.toFixed(2)}MB (限制: ${maxSizeMB}MB)`);
    }
    
    return true;
  }
}

// 导出单例
window.securityHelper = new SecurityHelper();
