#!/usr/bin/env python3
"""终验：用参考解跑 server/db.mjs 的 TEST_SETS 全量用例，逐一比对"""
import subprocess, json, sys, pathlib

# 读取 db.mjs 中的 TEST_SETS（正则提取）
import re
db_path = pathlib.Path(r"D:\School\ElecEnthAssoc\EeaExam\server\db.mjs")
text = db_path.read_text(encoding="utf-8")
# 用 node 导出 json 避免解析麻烦
node_code = """
import { TEST_SETS } from './server/db.mjs';
console.log(JSON.stringify(TEST_SETS));
"""
open("_tmp.mjs","w",encoding="utf-8").write(node_code)
result = subprocess.run(["node","_tmp.mjs"], capture_output=True, text=True, cwd=r"D:\School\ElecEnthAssoc\EeaExam")
if result.returncode != 0:
    print("node error:", result.stderr)
    sys.exit(1)
TEST_SETS = json.loads(result.stdout)

# 引入参考解
from build_new_tests import solvers

ok = True
for qid in sorted(TEST_SETS.keys()):
    cases = TEST_SETS[qid]
    solver = solvers[qid]
    print(f"\n=== {qid} ({len(cases)} cases) ===")
    for i, c in enumerate(cases):
        stdin = c["stdin"]
        expected = c["expected"]
        actual = solver(stdin)
        passed = actual == expected
        mark = "PASS" if passed else "FAIL"
        if not passed:
            ok = False
            esc = stdin.replace("\n","\\n")[:60]
            print(f"  case {i} {mark}: stdin='{esc}' expected='{expected}' actual='{actual}'")
        else:
            esc = stdin.replace("\n","\\n")[:40]
            print(f"  case {i} PASS: '{esc}' => '{expected}'")

if ok:
    print("\n✅ 全部 50 用例验证通过")
else:
    print("\n❌ 存在失败用例")
    sys.exit(1)

# 额外：模拟本地判题的 normalize 比对（trim + \\r\\n 统一）
print("\n--- 模拟 judge normalize ---")
def normalize(s): return s.replace("\r\n","\n").strip()
for qid in ["q2","q8","q10"]:
    sample = TEST_SETS[qid][0]
    print(qid, "normalize ok:", normalize(solvers[qid](sample["stdin"])) == normalize(sample["expected"]))
