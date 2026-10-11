import { createHash } from "node:crypto";
import { unzipSync, zipSync, type Unzipped } from "fflate";
import { badRequest, isAppError } from "./errors.js";

export const MAX_FILES = 100;
export const MAX_FILE_BYTES = 10 * 1024 * 1024;

export interface PackageFile {
  path: string;
  bytes: Uint8Array;
  contentType: string;
  sha256: string;
}

export interface Warning {
  code: "EXTENSION_NOT_ALLOWED" | "CONTENT_MISMATCH" | "POSSIBLE_SECRET";
  message: string;
  filePath: string | null;
}

export interface ParsedPackage {
  files: PackageFile[];
  totalSize: number;
  warnings: Warning[];
}

/**
 * 解压并校验技能包(03 §3.4):
 * 硬错误直接抛 400;扩展名 / 内容 / 密钥问题只产生 warning,由调用方决定是否放行。
 */
export function parsePackage(zip: Uint8Array): ParsedPackage {
  let entries: Unzipped;
  try {
    entries = unzipSync(zip, {
      filter: (f) => {
        if (f.name.endsWith("/") || isJunk(f.name)) return false;
        if (f.originalSize > MAX_FILE_BYTES) throw badRequest(`文件超过 10 MB：${f.name}`);
        return true;
      },
    });
  } catch (err) {
    if (isAppError(err)) throw err;
    throw badRequest("不是有效的 zip 文件");
  }

  let files = Object.entries(entries).map(([name, bytes]) => {
    if (bytes.length > MAX_FILE_BYTES) throw badRequest(`文件超过 10 MB：${name}`);
    return { path: normalizePath(name), bytes };
  });
  files = stripSingleRootDir(files);

  if (!files.some((f) => f.path === "SKILL.md")) throw badRequest("包的根目录缺少 SKILL.md");
  if (files.length > MAX_FILES) throw badRequest(`包内文件超过 ${MAX_FILES} 个`);

  const parsed = files.map((f) => ({
    path: f.path,
    bytes: f.bytes,
    contentType: contentTypeOf(f.path),
    sha256: createHash("sha256").update(f.bytes).digest("hex"),
  }));
  return {
    files: parsed,
    totalSize: parsed.reduce((sum, f) => sum + f.bytes.length, 0),
    warnings: parsed.flatMap(checkFile),
  };
}

/** 服务端重新打整包(上传时打一次;降级下载时现打) */
export function buildBundle(files: { path: string; bytes: Uint8Array }[]): Uint8Array {
  return zipSync(Object.fromEntries(files.map((f) => [f.path, f.bytes])));
}

function isJunk(name: string): boolean {
  const segments = name.replace(/\\/g, "/").split("/");
  const base = segments.at(-1) ?? "";
  return segments.includes("__MACOSX") || base === ".DS_Store" || base.startsWith("._");
}

function normalizePath(name: string): string {
  const path = name.replace(/\\/g, "/");
  const segments = path.split("/");
  if (path.startsWith("/") || /^[A-Za-z]:/.test(path) || segments.includes("..")) {
    throw badRequest(`文件路径越出了包的根目录：${name}`);
  }
  return segments.filter((s) => s !== "" && s !== ".").join("/");
}

/** 根目录没有 SKILL.md 且所有文件都在同一个顶层目录下时,剥掉这一层 */
function stripSingleRootDir<T extends { path: string }>(files: T[]): T[] {
  if (files.some((f) => f.path === "SKILL.md")) return files;
  const tops = new Set(files.map((f) => f.path.split("/")[0]));
  if (tops.size !== 1 || !files.every((f) => f.path.includes("/"))) return files;
  const prefix = `${[...tops][0]}/`;
  return files.map((f) => ({ ...f, path: f.path.slice(prefix.length) }));
}

// ---- warning 规则 ----

const TEXT_EXTENSIONS = new Set([
  "", "md", "txt", "py", "js", "mjs", "cjs", "ts", "json", "yaml", "yml", "toml",
  "ini", "cfg", "sh", "csv", "html", "css", "xml", "svg",
]);

const MAGIC_BYTES: Record<string, number[]> = {
  png: [0x89, 0x50, 0x4e, 0x47],
  jpg: [0xff, 0xd8, 0xff],
  jpeg: [0xff, 0xd8, 0xff],
  gif: [0x47, 0x49, 0x46, 0x38],
  pdf: [0x25, 0x50, 0x44, 0x46],
};

const SECRET_PATTERNS = [
  /AKIA[0-9A-Z]{16}/, // AWS access key
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /\bgh[pousr]_[A-Za-z0-9]{36,}/, // GitHub token
  /\bsk-[A-Za-z0-9_-]{20,}/, // OpenAI / Anthropic 风格 API key
];

function checkFile(file: PackageFile): Warning[] {
  const ext = extensionOf(file.path);
  const magic = MAGIC_BYTES[ext];
  const isText = TEXT_EXTENSIONS.has(ext);

  if (!isText && !magic) {
    return [{ code: "EXTENSION_NOT_ALLOWED", message: `不允许的文件类型：.${ext}`, filePath: file.path }];
  }
  if (magic && !magic.every((b, i) => file.bytes[i] === b)) {
    return [{ code: "CONTENT_MISMATCH", message: `文件内容与扩展名 .${ext} 不符`, filePath: file.path }];
  }
  if (isText) {
    const head = file.bytes.subarray(0, 8192);
    if (head.includes(0)) {
      return [{ code: "CONTENT_MISMATCH", message: "文本文件中含有二进制内容", filePath: file.path }];
    }
    const text = new TextDecoder().decode(file.bytes);
    if (SECRET_PATTERNS.some((re) => re.test(text))) {
      return [{ code: "POSSIBLE_SECRET", message: "疑似包含密钥", filePath: file.path }];
    }
  }
  return [];
}

const CONTENT_TYPES: Record<string, string> = {
  md: "text/markdown",
  txt: "text/plain",
  json: "application/json",
  yaml: "application/yaml",
  yml: "application/yaml",
  html: "text/html",
  css: "text/css",
  csv: "text/csv",
  xml: "application/xml",
  svg: "image/svg+xml",
  js: "text/javascript",
  mjs: "text/javascript",
  cjs: "text/javascript",
  py: "text/x-python",
  sh: "text/x-shellscript",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  pdf: "application/pdf",
};

function contentTypeOf(path: string): string {
  const ext = extensionOf(path);
  return CONTENT_TYPES[ext] ?? (TEXT_EXTENSIONS.has(ext) ? "text/plain" : "application/octet-stream");
}

function extensionOf(path: string): string {
  const base = path.split("/").at(-1) ?? "";
  const dot = base.lastIndexOf(".");
  return dot > 0 ? base.slice(dot + 1).toLowerCase() : "";
}
