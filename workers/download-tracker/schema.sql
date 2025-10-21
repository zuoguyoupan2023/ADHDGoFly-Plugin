-- ADHDGoFly 下载统计数据库表结构

CREATE TABLE IF NOT EXISTS downloads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    version TEXT NOT NULL,              -- 插件版本号，如 "0.1.4"
    browser TEXT NOT NULL,              -- 浏览器类型：chrome, edge
    language TEXT NOT NULL,             -- 页面语言：zh, en
    country TEXT,                       -- 国家代码：CN, US, JP 等
    user_agent TEXT,                    -- 用户代理字符串（可选）
    referrer TEXT,                      -- 来源页面（可选）
    ip_hash TEXT,                       -- IP 哈希（用于去重，不存储真实 IP）
    created_at INTEGER NOT NULL,        -- Unix 时间戳（毫秒）
    date TEXT NOT NULL                  -- 日期字符串，如 "2025-10-13"（便于按日期查询）
);

-- 索引优化查询性能
CREATE INDEX IF NOT EXISTS idx_downloads_date ON downloads(date);
CREATE INDEX IF NOT EXISTS idx_downloads_browser ON downloads(browser);
CREATE INDEX IF NOT EXISTS idx_downloads_version ON downloads(version);
CREATE INDEX IF NOT EXISTS idx_downloads_country ON downloads(country);
CREATE INDEX IF NOT EXISTS idx_downloads_language ON downloads(language);

-- 创建每日汇总表（用于长期数据保留）
CREATE TABLE IF NOT EXISTS downloads_daily (
    date TEXT PRIMARY KEY,
    total_downloads INTEGER DEFAULT 0,
    chrome_downloads INTEGER DEFAULT 0,
    edge_downloads INTEGER DEFAULT 0,
    zh_downloads INTEGER DEFAULT 0,
    en_downloads INTEGER DEFAULT 0,
    unique_countries INTEGER DEFAULT 0
);
