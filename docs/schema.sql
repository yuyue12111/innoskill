-- innoskill 数据模型评审稿，2026-09-17。说明见 08-数据模型.md。
-- 仅用于空 PostgreSQL schema 的初始化；不是现有 SQLite / 旧 PG 方案的升级脚本。
-- UUID 由应用生成，不依赖 UUID 扩展。此文件不由现有运行代码加载。
-- 执行示例：psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f docs/schema.sql

BEGIN;

-- 一条技能记录对应一个已成功存储的完整压缩包。
CREATE TABLE skill (
    id          uuid PRIMARY KEY,
    name        varchar(256) NOT NULL CHECK (btrim(name) <> ''),
    description text NOT NULL CHECK (btrim(description) <> ''),
    object_key  text NOT NULL UNIQUE CHECK (btrim(object_key) <> ''),
    file_name   varchar(255) NOT NULL CHECK (btrim(file_name) <> ''),
    file_format varchar(16) NOT NULL CHECK (file_format IN ('zip', 'tar.gz')),
    file_size   bigint NOT NULL CHECK (file_size > 0),
    sha256      varchar(64) NOT NULL CHECK (sha256 ~ '^[0-9a-f]{64}$'),
    uploaded_by varchar(128) NOT NULL CHECK (btrim(uploaded_by) <> ''),
    created_at  timestamptz NOT NULL DEFAULT now()
);

-- 名称和哈希允许重复；使用 ID 定位，按时间及 ID 稳定分页。
CREATE INDEX idx_skill_created_at_id ON skill (created_at DESC, id DESC);

COMMENT ON TABLE skill IS '一个技能及其完整压缩包的描述；无命名空间和版本体系';
COMMENT ON COLUMN skill.object_key IS '配置 bucket 内的对象键，不是下载 URL';
COMMENT ON COLUMN skill.file_size IS '实际存储压缩包的字节数，不是解压后大小';
COMMENT ON COLUMN skill.sha256 IS '实际存储压缩包的 SHA-256，小写十六进制，不做唯一键';
COMMENT ON COLUMN skill.uploaded_by IS '网关传递的上传用户 ID，仅记录操作人，不作权限隔离键';

-- 一条记录代表一次已受理下载申请，不代表实际下载完成或安装成功。
CREATE TABLE skill_download (
    id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    skill_id   uuid NOT NULL REFERENCES skill(id) ON DELETE RESTRICT,
    user_id    varchar(128) NOT NULL CHECK (btrim(user_id) <> ''),
    created_at timestamptz NOT NULL DEFAULT now()
);

-- 允许同一用户多次下载；同时覆盖按 skill_id 查询及外键检查。
CREATE INDEX idx_skill_download_skill_created_at
    ON skill_download (skill_id, created_at DESC);

COMMENT ON TABLE skill_download IS '下载申请受理记录；临时 URL 发放不等于文件传输完成';
COMMENT ON COLUMN skill_download.user_id IS '网关传递的下载用户 ID，不关联本地用户表';

COMMIT;
