-- innoskill-hub 表结构 v1.1(PostgreSQL)。说明见 06-后端设计.md 第 3 节。

-- 租户 / 命名空间
create table namespace (
  id                 bigserial primary key,
  name               text not null unique,                 -- ^[a-z0-9][a-z0-9-]{1,31}$,official 保留
  display_name       text not null,
  kind               text not null check (kind in ('official','tenant')),
  created_at         timestamptz not null default now()   -- 首次发布时自动创建;租户身份由登录体系保证
);

-- 技能(坐标级,不含内容)
create table skill (
  id                bigserial primary key,
  namespace_id      bigint not null references namespace(id),
  slug              text not null,                          -- ^[a-z0-9][a-z0-9-]{1,63}$
  display_name      text not null,
  visibility        text not null check (visibility in ('public','tenant','private')),
  deprecated        boolean not null default false,
  latest_version_id bigint,                                 -- 最新 published 版本;发布/审核/yank 时维护
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (namespace_id, slug)
);

-- 版本(不可变;一行 = 一次发布)
create table skill_version (
  id            bigserial primary key,
  skill_id      bigint not null references skill(id),
  version       text not null,                              -- 语义化版本原文
  ver_major     int not null, ver_minor int not null, ver_patch int not null,   -- 排序用
  status        text not null check (status in ('pending','published','rejected','yanked')),  -- 一期只用 published / yanked
  sha256        text not null,                              -- → 对象存储 artifacts/
  size_bytes    bigint not null,
  file_count    int not null,
  has_scripts   boolean not null default false,
  frontmatter   jsonb not null,
  category      text, subject text, kind text, scenario text,   -- 从 frontmatter 提出建索引
  tagline       text, description text,
  body          text,                                       -- SKILL.md 正文
  changelog     text,
  published_by  text,                                       -- 发布令牌 id 或用户标识(字符串,不做外键)
  review_note   text,
  created_at    timestamptz not null default now(),
  published_at  timestamptz,
  unique (skill_id, version)
);
create index on skill_version (skill_id, status, ver_major desc, ver_minor desc, ver_patch desc);
create index on skill_version (sha256);

-- 文件清单(在线预览、完整性校验)
create table skill_file (
  version_id  bigint not null references skill_version(id) on delete cascade,
  path        text not null,
  size_bytes  bigint not null,
  sha256      text not null,
  mime        text,
  primary key (version_id, path)
);

-- 自定义标签(beta / stable…);latest 不存,由 skill.latest_version_id 派生
create table skill_tag (
  skill_id    bigint not null references skill(id),
  name        text not null,
  version_id  bigint not null references skill_version(id),
  primary key (skill_id, name)
);

-- 发布令牌(一期由部署方签发;一把令牌代表一个调用系统,如制作平台)
create table publish_token (
  id          bigserial primary key,
  name        text not null,
  token_hash  text not null unique,                         -- 只存哈希,明文只显示一次
  scopes      text[] not null default '{publish}',          -- publish / admin
  created_at  timestamptz not null default now(),
  expires_at  timestamptz,
  revoked_at  timestamptz
);

-- 搜索文档:每个技能一行,只反映最新已发布版(发布 / 审核通过 / yank / 改可见性时重写)
create table skill_search (
  skill_id      bigint primary key references skill(id) on delete cascade,
  namespace_id  bigint not null,
  visibility    text not null,
  category text, subject text, kind text, scenario text,
  published_at  timestamptz,
  downloads     bigint not null default 0,
  doc           tsvector not null                            -- 见第 4 节
);
create index on skill_search using gin (doc);
create index on skill_search (namespace_id, visibility, category, subject, kind);

-- 安装台账(InnoAgent 带 user_id 来;租户 = 用户所属 namespace)
create table user_install (
  id             bigserial primary key,
  namespace_id   bigint not null references namespace(id),
  user_id        text not null,                             -- ^[A-Za-z0-9_.:@-]{1,128}$
  skill_id       bigint not null references skill(id),
  version_id     bigint references skill_version(id),       -- 装的是哪个版本,可空 = latest
  installed_at   timestamptz not null default now(),
  uninstalled_at timestamptz,
  unique (user_id, skill_id)
);
create index on user_install (skill_id) where uninstalled_at is null;

-- 事件流水(下载 / 安装 / 浏览),只追加;统计从这里聚合
create table skill_event (
  id         bigserial primary key,
  skill_id   bigint not null,
  version_id bigint,
  type       text not null check (type in ('download','install','uninstall','view')),
  actor      text,                                          -- user_id / token id / 空
  at         timestamptz not null default now()
);
create index on skill_event (skill_id, type, at);

-- 统计快照(读接口只读这张,后台任务按分钟聚合)
create table skill_stat (
  skill_id   bigint primary key references skill(id) on delete cascade,
  downloads  bigint not null default 0,
  installs   bigint not null default 0,                     -- 未卸载的去重用户数
  views      bigint not null default 0,
  updated_at timestamptz not null default now()
);

-- 技能包(严选组合,属于某 namespace)
create table pack (
  id           bigserial primary key,
  namespace_id bigint not null references namespace(id),
  slug         text not null,
  name         text not null, description text, icon text, subject text,
  unique (namespace_id, slug)
);
create table pack_skill (
  pack_id  bigint references pack(id) on delete cascade,
  skill_id bigint references skill(id),
  ord      int not null,
  primary key (pack_id, skill_id)
);

-- 导入器运行记录(GitHub hub 等外部源)
create table import_run (
  id          bigserial primary key,
  source      text not null,                                -- 如 github:Chloris-Blaxk/inno-agent-hub@main
  commit_sha  text,
  status      text not null check (status in ('running','ok','failed')),
  message     text,
  started_at  timestamptz not null default now(),
  finished_at timestamptz
);
