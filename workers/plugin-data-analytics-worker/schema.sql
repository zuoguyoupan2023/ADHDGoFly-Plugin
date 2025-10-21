-- 插件数据分析表
CREATE TABLE IF NOT EXISTS plugin_installations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL,
    user_hash TEXT NOT NULL,
    version TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    date TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_event_type ON plugin_installations(event_type);
CREATE INDEX IF NOT EXISTS idx_user_hash ON plugin_installations(user_hash);
CREATE INDEX IF NOT EXISTS idx_date ON plugin_installations(date);
CREATE INDEX IF NOT EXISTS idx_created_at ON plugin_installations(created_at);