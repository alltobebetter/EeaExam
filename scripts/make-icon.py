"""从 scripts/logo-raw.png 生成任务栏/打包用图标（白底转透明，多尺寸 ICO）。"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "scripts" / "logo-raw.png"
OUT_DIR = ROOT / "build"
OUT_DIR.mkdir(exist_ok=True)

img = Image.open(SRC).convert("RGB")
# 白底转透明：近白像素按距离羽化，避免锯齿白边
px = img.load()
w, h = img.size
alpha = Image.new("L", (w, h))
apx = alpha.load()
for y in range(h):
    for x in range(w):
        r, g, b = px[x, y]
        m = min(r, g, b)
        if m >= 248:
            apx[x, y] = 0
        elif m >= 235:
            apx[x, y] = int((m - 235) / (248 - 235) * 255)
        else:
            apx[x, y] = 255
img.putalpha(alpha)

# 主 PNG（Electron BrowserWindow 用，dev + prod 通用；窗口取 resources/ 下这份）
icon_png = OUT_DIR / "icon.png"
res_png = ROOT / "resources" / "icon.png"
img.resize((512, 512), Image.LANCZOS).save(icon_png)
img.resize((512, 512), Image.LANCZOS).save(res_png)
print(f"saved {icon_png} {(512, 512)}")
print(f"saved {res_png} {(512, 512)}")

# ICO（含 16~256 六档，Windows 任务栏/资源管理器/打包 EXE 共用）
sizes = [(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
icon_ico = OUT_DIR / "icon.ico"
img.save(icon_ico, sizes=sizes)
print(f"saved {icon_ico} {sizes} {icon_ico.stat().st_size // 1024}KB")
