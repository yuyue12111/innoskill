#!/usr/bin/env python3
"""把小赖字体(Xiaolai,OFL)裁成两片 woff2,并生成带 unicode-range 的 @font-face。

  L1:GB2312 一级常用汉字(3755)+ 符号/标点/全角(区 1-9)   → 大多数页面只需要这一片
  L2:GB2312 二级次常用汉字(3008)                          → 出现生僻字才会下载
  GB2312 之外的字由 CSS 里排在小赖后面的系统字体兜底(浏览器按字回落)。

用法:
  pip install fonttools brotli
  python3 scripts/subset-xiaolai.py            # 自动从 GitHub release 下载 Xiaolai-Regular.ttf
  python3 scripts/subset-xiaolai.py 本地.ttf   # 用本地字体文件
产物:public/fonts/xiaolai/Xiaolai-L1.woff2、Xiaolai-L2.woff2、app/xiaolai.css
"""
import os, subprocess, sys, tempfile, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "public", "fonts", "xiaolai")
CSS = os.path.join(ROOT, "app", "xiaolai.css")
RELEASE = "https://github.com/lxgw/kose-font/releases/download/v3.126/Xiaolai-Regular.ttf"

def gb2312_slices():
    l1, l2 = [], []
    for cp in range(0x80, 0x10000):
        try:
            b = chr(cp).encode("gb2312")
        except UnicodeEncodeError:
            continue
        if len(b) != 2: continue
        if 0xA1 <= b[0] <= 0xA9 or 0xB0 <= b[0] <= 0xD7: l1.append(cp)
        elif 0xD8 <= b[0] <= 0xF7: l2.append(cp)
    return l1, l2

def ranges(cps):
    cps = sorted(set(cps)); out = []; s = p = cps[0]
    for c in cps[1:]:
        if c == p + 1: p = c; continue
        out.append((s, p)); s = p = c
    out.append((s, p))
    return ",".join(f"U+{a:04X}" if a == b else f"U+{a:04X}-{b:04X}" for a, b in out)

def main():
    src = sys.argv[1] if len(sys.argv) > 1 else None
    if not src:
        src = os.path.join(tempfile.gettempdir(), "Xiaolai-Regular.ttf")
        if not os.path.exists(src):
            print("downloading", RELEASE); urllib.request.urlretrieve(RELEASE, src)
    os.makedirs(OUT, exist_ok=True)
    l1, l2 = gb2312_slices()
    faces = []
    for name, cps in (("L1", l1), ("L2", l2)):
        out = os.path.join(OUT, f"Xiaolai-{name}.woff2")
        subprocess.run([sys.executable, "-m", "fontTools.subset", src, f"--unicodes={ranges(cps)}",
                        "--flavor=woff2", f"--output-file={out}", "--no-hinting", "--desubroutinize",
                        "--layout-features=*", "--name-IDs=*"], check=True)
        print(f"{name}: {len(cps)} 字 → {os.path.getsize(out)/1048576:.2f} MB")
        faces.append(f'''@font-face {{
  font-family: "Xiaolai";
  src: url("/fonts/xiaolai/Xiaolai-{name}.woff2") format("woff2");
  font-weight: 400;
  font-style: normal;
  font-display: swap;
  unicode-range: {ranges(cps)};
}}''')
    with open(CSS, "w", encoding="utf-8") as f:
        f.write("/* 由 scripts/subset-xiaolai.py 生成,不要手改。小赖字体 (Xiaolai) OFL 1.1,见 public/fonts/xiaolai/LICENSE */\n")
        f.write("\n".join(faces) + "\n")
    print("wrote", CSS)

if __name__ == "__main__":
    main()
