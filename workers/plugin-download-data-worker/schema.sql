-- ADHDGoFly Plugin Download Data Database Schema
-- 专门用于下载数据收集和统计的数据库结构

-- 下载记录表
CREATE TABLE IF NOT EXISTS downloads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    version TEXT NOT NULL,              -- 插件版本号，如 "0.1.4"
    browser TEXT NOT NULL,              -- 浏览器类型：chrome, edge
    language TEXT NOT NULL,             -- 页面语言：zh, en
    country TEXT,                       -- 国家代码：CN, US, JP 等
    user_agent TEXT,                    -- 用户代理字符串
    referrer TEXT,                      -- 来源页面
    ip_hash TEXT,                       -- IP 哈希（用于去重，不存储真实 IP）
    created_at INTEGER NOT NULL,        -- Unix 时间戳（毫秒）
    date TEXT NOT NULL,                 -- 日期字符串，如 "2025-01-13"（便于按日期查询）
    is_duplicate INTEGER DEFAULT 0,     -- 是否为重复下载（0=否，1=是）
    created_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP  -- 数据库插入时间
);

-- 索引优化查询性能
CREATE INDEX IF NOT EXISTS idx_downloads_date ON downloads(date);
CREATE INDEX IF NOT EXISTS idx_downloads_browser ON downloads(browser);
CREATE INDEX IF NOT EXISTS idx_downloads_version ON downloads(version);
CREATE INDEX IF NOT EXISTS idx_downloads_country ON downloads(country);
CREATE INDEX IF NOT EXISTS idx_downloads_language ON downloads(language);
CREATE INDEX IF NOT EXISTS idx_downloads_ip_hash ON downloads(ip_hash);
CREATE INDEX IF NOT EXISTS idx_downloads_duplicate ON downloads(is_duplicate);

-- 每日汇总统计表
CREATE TABLE IF NOT EXISTS downloads_daily (
    date TEXT PRIMARY KEY,              -- 日期 YYYY-MM-DD
    total_downloads INTEGER DEFAULT 0,  -- 当日总下载数
    chrome_downloads INTEGER DEFAULT 0, -- Chrome 下载数
    edge_downloads INTEGER DEFAULT 0,   -- Edge 下载数
    zh_downloads INTEGER DEFAULT 0,     -- 中文页面下载数
    en_downloads INTEGER DEFAULT 0,     -- 英文页面下载数
    unique_countries INTEGER DEFAULT 0, -- 独特国家数
    created_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 版本统计表（可选，用于快速查询版本相关统计）
CREATE TABLE IF NOT EXISTS version_stats (
    version TEXT PRIMARY KEY,           -- 版本号
    total_downloads INTEGER DEFAULT 0,  -- 该版本总下载数
    first_download INTEGER,             -- 首次下载时间戳
    last_download INTEGER,              -- 最后下载时间戳
    chrome_downloads INTEGER DEFAULT 0, -- Chrome 下载数
    edge_downloads INTEGER DEFAULT 0,   -- Edge 下载数
    created_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 国家统计表（可选，用于地理分析）
CREATE TABLE IF NOT EXISTS country_stats (
    country TEXT PRIMARY KEY,           -- 国家代码
    total_downloads INTEGER DEFAULT 0,  -- 该国家总下载数
    first_download INTEGER,             -- 首次下载时间戳
    last_download INTEGER,              -- 最后下载时间戳
    created_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 创建触发器自动更新统计表（可选）
CREATE TRIGGER IF NOT EXISTS update_version_stats_on_insert
AFTER INSERT ON downloads
WHEN NEW.is_duplicate = 0
BEGIN
    INSERT OR REPLACE INTO version_stats (
        version, 
        total_downloads, 
        first_download, 
        last_download,
        chrome_downloads,
        edge_downloads,
        updated_timestamp
    ) VALUES (
        NEW.version,
        COALESCE((SELECT total_downloads FROM version_stats WHERE version = NEW.version), 0) + 1,
        COALESCE((SELECT first_download FROM version_stats WHERE version = NEW.version), NEW.created_at),
        NEW.created_at,
        COALESCE((SELECT chrome_downloads FROM version_stats WHERE version = NEW.version), 0) + 
            CASE WHEN NEW.browser = 'chrome' THEN 1 ELSE 0 END,
        COALESCE((SELECT edge_downloads FROM version_stats WHERE version = NEW.version), 0) + 
            CASE WHEN NEW.browser = 'edge' THEN 1 ELSE 0 END,
        CURRENT_TIMESTAMP
    );
END;

CREATE TRIGGER IF NOT EXISTS update_country_stats_on_insert
AFTER INSERT ON downloads
WHEN NEW.is_duplicate = 0 AND NEW.country != 'unknown'
BEGIN
    INSERT OR REPLACE INTO country_stats (
        country, 
        total_downloads, 
        first_download, 
        last_download,
        updated_timestamp
    ) VALUES (
        NEW.country,
        COALESCE((SELECT total_downloads FROM country_stats WHERE country = NEW.country), 0) + 1,
        COALESCE((SELECT first_download FROM country_stats WHERE country = NEW.country), NEW.created_at),
        NEW.created_at,
        CURRENT_TIMESTAMP
    );
END;