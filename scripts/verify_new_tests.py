#!/usr/bin/env python3
"""
验证新10题的参考解与测试集预期值
"""
import math

# ---------- q1: 带复位/使能的状态机 ----------
def solve_q1(stdin: str) -> str:
    # 输入: 第一行初始位置 0-7, 第二行操作序列 (可能空行)
    # 操作: C=时钟脉冲(若enabled则pos=(pos+1)%8), R=复位到0, E=翻转enabled
    # 初始 enabled=True
    lines = stdin.splitlines()
    # 处理空输入的边界
    if len(lines)==0 or lines[0].strip()=="":
        return "0"
    try:
        pos = int(lines[0].strip())
    except:
        pos = 0
    pos = pos % 8
    seq = lines[1] if len(lines) > 1 else ""
    # 注意：seq 可能包含空格，需要只处理 C,R,E 字符，忽略其他空白
    enabled = True
    for ch in seq.strip():
        if ch == 'C':
            if enabled:
                pos = (pos + 1) % 8
        elif ch == 'R':
            pos = 0
        elif ch == 'E':
            enabled = not enabled
        elif ch in (' ', '\t', '\r'):
            continue
        else:
            # 未知字符忽略（容错）
            continue
    return str(pos)

def solve_q2(stdin: str) -> str:
    # 智能购物车折扣：第一行金额列表，第二行折扣码序列
    # 规则按顺序执行：
    #  M10: 若total>=100 则 total-=10
    #  F5: 若total>=50 则 total-=5
    #  P15: total *= 0.85  (无门槛)
    #  P10: total *= 0.90
    #  M20: 若total>=200 则 total-=20
    # 输入空行处理
    lines = stdin.splitlines()
    prices = []
    codes = []
    if len(lines) >= 1 and lines[0].strip() != "":
        try:
            prices = list(map(float, lines[0].strip().split()))
        except:
            prices = []
    if len(lines) >= 2 and lines[1].strip() != "":
        codes = lines[1].strip().split()
    total = sum(prices)
    for c in codes:
        if c == "M10":
            if total >= 100:
                total -= 10
        elif c == "F5":
            if total >= 50:
                total -= 5
        elif c == "P15":
            total *= 0.85
        elif c == "P10":
            total *= 0.90
        elif c == "M20":
            if total >= 200:
                total -= 20
        else:
            # 未知码忽略
            pass
    # 保留两位小数
    return f"{total:.2f}"

def solve_q3(stdin: str) -> str:
    # 日志清洗计数：第一行 keyword
    # 剩余行：统计包含keyword的行数，但忽略 空行/纯空白 或 去除前导空格后以'#'开头的行。大小写敏感。
    lines = stdin.splitlines()
    if len(lines)==0:
        return "0"
    keyword = lines[0].strip()
    if keyword == "":
        return "0"
    count = 0
    for line in lines[1:]:
        if line.strip() == "":
            continue
        if line.lstrip().startswith("#"):
            continue
        if keyword in line:
            count += 1
    return str(count)

def solve_q4(stdin: str) -> str:
    # 版本号比较：输入一行包含两个版本号空格分隔
    # 输出 1 / -1 / 0
    # 规则：按 '.'分割，每段按数值比较（去前导零，空段视为0），长度不等时缺失补0
    s = stdin.strip()
    if not s:
        return "0"
    parts = s.split()
    if len(parts) < 2:
        return "0"
    v1, v2 = parts[0], parts[1]
    def parse(v):
        segs = v.split('.')
        nums = []
        for seg in segs:
            # 空段视为0
            if seg == "":
                nums.append(0)
            else:
                try:
                    nums.append(int(seg))  # 自动去前导零
                except:
                    nums.append(0)
        return nums
    a = parse(v1)
    b = parse(v2)
    n = max(len(a), len(b))
    a += [0]*(n-len(a))
    b += [0]*(n-len(b))
    for x,y in zip(a,b):
        if x > y:
            return "1"
        if x < y:
            return "-1"
    return "0"

def solve_q5(stdin: str) -> str:
    # 滑动窗口报警：第一行温度序列，第二行k，第三行t
    # 若序列为空或k<=0或k>len则0
    lines = stdin.splitlines()
    temps = []
    if len(lines)>=1 and lines[0].strip()!="":
        try:
            temps = list(map(float, lines[0].strip().split()))
        except:
            temps = []
    k = 0
    if len(lines)>=2 and lines[1].strip()!="":
        try:
            k = int(float(lines[1].strip()))  # 容错
        except:
            k = 0
    t = 0
    if len(lines)>=3 and lines[2].strip()!="":
        try:
            t = float(lines[2].strip())
        except:
            t = 0.0
    if k <= 0 or k > len(temps):
        return "0"
    cnt = 0
    for i in range(len(temps)-k+1):
        avg = sum(temps[i:i+k])/k
        if avg > t:
            cnt += 1
    return str(cnt)

def solve_q6(stdin: str) -> str:
    # IPv4 CIDR 包含判断：输入 "a.b.c.d/e ip" 或两行
    # 输出 true/false
    s = stdin.strip()
    if not s:
        return "false"
    # 支持空格或换行分隔
    tokens = s.split()
    if len(tokens) < 2:
        return "false"
    cidr = tokens[0]
    ip_str = tokens[1]
    try:
        if '/' in cidr:
            net, prefix = cidr.split('/')
            prefix = int(prefix)
        else:
            net = cidr
            prefix = 32
        def ip_to_int(ip):
            parts = ip.split('.')
            if len(parts)!=4:
                raise ValueError
            val=0
            for p in parts:
                val = (val<<8) + int(p)
                if not 0<=int(p)<=255:
                    raise ValueError
            return val
        net_int = ip_to_int(net)
        ip_int = ip_to_int(ip_str)
        if prefix == 0:
            mask = 0
        else:
            mask = (0xFFFFFFFF << (32-prefix)) & 0xFFFFFFFF
        return "true" if (net_int & mask) == (ip_int & mask) else "false"
    except:
        return "false"

def solve_q7(stdin: str) -> str:
    # 撤销编辑器：命令序列，每行一条 TYPE x / UNDO / REDO
    # 最终输出当前文本（若空则空字符串）
    lines = stdin.splitlines()
    # 支持第一行是命令数 N 的兼容？若第一行是纯数字且剩余行数匹配，则跳过
    # 但规范：直接是命令列表，无N。 为兼容两种，检测
    cmds = []
    if len(lines)>=1 and lines[0].strip().isdigit() and len(lines)-1 == int(lines[0].strip()):
        cmds = lines[1:]
    else:
        cmds = lines
    text = []  # list of chars
    undo_stack = []  # stack of actions: each action is char added? For TYPE we push char. For simplicity, TYPE adds one char at end.
    redo_stack = []
    # 更精确：维护文本栈，每次操作保存快照会更通用。采用快照栈。
    # 重构为快照方式：
    cur = ""
    undo = []  # stack of previous states
    redo = []
    for raw in cmds:
        line = raw.strip()
        if line == "":
            continue
        if line.startswith("TYPE "):
            # 取 TYPE 后的第一个字符（可能空格？）
            # 规范：TYPE x  where x is single char a-z
            parts = line.split(maxsplit=1)
            ch = parts[1] if len(parts)>1 else ""
            # 若 ch 长度>1 取第一个字符? 按样例 "TYPE a"
            if ch:
                ch = ch[0]
                # 保存状态
                undo.append(cur)
                cur = cur + ch
                redo.clear()
        elif line == "UNDO":
            if undo:
                redo.append(cur)
                cur = undo.pop()
        elif line == "REDO":
            if redo:
                undo.append(cur)
                cur = redo.pop()
        else:
            # 未知忽略
            pass
    return cur

def solve_q8(stdin: str) -> str:
    # 会议室合并：输入一行 "1-3, 5-7,2-6"
    # 输出总覆盖长度（闭区间，包含端点）
    # 空输入 =>0
    s = stdin.strip()
    if not s:
        return "0"
    # 去除空格
    s_clean = s.replace(' ', '')
    if s_clean == "":
        return "0"
    parts = [p for p in s_clean.split(',') if p]
    intervals = []
    for p in parts:
        if '-' not in p:
            continue
        a,b = p.split('-',1)
        try:
            a = int(a); b = int(b)
        except:
            continue
        if a > b:
            a,b = b,a
        intervals.append((a,b))
    if not intervals:
        return "0"
    intervals.sort()
    merged = []
    cur_l, cur_r = intervals[0]
    for l,r in intervals[1:]:
        if l <= cur_r + 1:  # 注意：题目说闭区间且 touching算合并，即 [1,3] 和 [4,5] 是否合并？按 touching定义 [1,3]和[3,5]合并，但 [1,3]和[4,5]是否合并？通常合并条件 l <= cur_r+? 对于连续整数，3和4是连续但区间 [1,3]和[4,5]不重叠却相邻，是否算合并？我们定义 l <= cur_r+0? 题干说 touching算合并指端点重合即 l==cur_r+1? 例如 1-3 和4-5 端点3和4相邻，不算重叠但若按语义天数算应合并？为避免歧义，我们按 l <= cur_r+1 即相邻也合并，但这样 1-3,4-5 合并为1-5长度5。若按普通区间合并 l<=cur_r 则不合并长度6。需明确。测试集将按 l <= cur_r+1 设计，样例会体现。
            # 为了让样例 "1-3,2-6" 合并为1-6 两种都一样，需要区分样例
            # 增加样例 "1-3,4-5" -> 若按 l<=cur_r+1 则5，否则6
            # 我们采用 l <= cur_r + 0? 先采用 l <= cur_r+1 更严格覆盖，等待样例定义
            # 临时改为 l <= cur_r+1
            if l <= cur_r + 1:
                cur_r = max(cur_r, r)
            else:
                merged.append((cur_l, cur_r))
                cur_l, cur_r = l, r
        else:
            merged.append((cur_l, cur_r))
            cur_l, cur_r = l, r
    merged.append((cur_l, cur_r))
    total = sum(r - l + 1 for l,r in merged)
    return str(total)

def solve_q9(stdin: str) -> str:
    # 多关键字排序：第一行 n，随后 n 行 "name score age"
    # 排序：score降序, age升序, name升序(字典序大小写敏感)
    # 输出排序后的 name 用空格拼接
    lines = stdin.splitlines()
    if not lines or lines[0].strip()=="":
        return ""
    try:
        n = int(lines[0].strip())
    except:
        return ""
    rows = []
    for i in range(1, min(n+1, len(lines))):
        line = lines[i].strip()
        if not line:
            continue
        parts = line.split()
        if len(parts) < 3:
            continue
        name = parts[0]
        try:
            score = int(parts[1])
            age = int(parts[2])
        except:
            continue
        rows.append((name, score, age))
    # 若行数不足n，忽略
    rows.sort(key=lambda x: (-x[1], x[2], x[0]))
    return " ".join(r[0] for r in rows)

def solve_q10(stdin: str) -> str:
    # 带转义的串口帧校验：输入一行十六进制字节空格分隔
    # 帧结构：FF <payload> <checksum> FE  ，checksum = XOR(payload的反转义后字节)
    # 转义：payload和checksum区域中 FD 01 -> FF, FD 02 -> FE, FD 03 -> FD  （起始FF和结束FE不转义）
    # 需要先按原始字节切帧（找FF ... FE），再对帧内部做反转义，再校验
    # 若校验失败输出 -1，否则输出反转义后payload的十进制和
    # 若有多个帧？我们定义输入只含一个帧（样例单帧），但隐藏用例可能有单帧
    # 简化：输入整行作为一个帧解析
    s = stdin.strip()
    if not s:
        return "-1"
    tokens = s.split()
    # 转大写统一
    tokens = [t.upper() for t in tokens]
    # 必须以FF开头 FE结尾
    if len(tokens) < 4 or tokens[0] != "FF" or tokens[-1] != "FE":
        return "-1"
    inner = tokens[1:-1]  # payload + checksum 转义形式
    # 反转义
    decoded = []
    i=0
    while i < len(inner):
        if inner[i] == "FD":
            if i+1 >= len(inner):
                return "-1"  # 非法转义
            esc = inner[i+1]
            if esc == "01":
                decoded.append("FF")
            elif esc == "02":
                decoded.append("FE")
            elif esc == "03":
                decoded.append("FD")
            else:
                return "-1"
            i+=2
        else:
            # 非法字节检查：必须是00-FF
            try:
                int(inner[i],16)
            except:
                return "-1"
            decoded.append(inner[i])
            i+=1
    if len(decoded) < 1:
        return "-1"
    payload = decoded[:-1]
    checksum_hex = decoded[-1]
    try:
        checksum = int(checksum_hex,16)
    except:
        return "-1"
    # 计算payload XOR
    x = 0
    for b in payload:
        x ^= int(b,16)
    if x != checksum:
        return "-1"
    # 返回payload十进制和
    total = sum(int(b,16) for b in payload)
    return str(total)

# 测试用例
cases = {
    "q1": [
        ("3\nCCE", solve_q1("3\nCCE")),
        ("0\nCCCCCCCC", solve_q1("0\nCCCCCCCC")),
        ("7\nECCCEC", solve_q1("7\nECCCEC")),
    ],
    "q2": [
        ("50 60 30\nM10 P15", solve_q2("50 60 30\nM10 P15")),
        ("100 100\nP15 M20", solve_q2("100 100\nP15 M20")),
        ("30 20\nF5 P10", solve_q2("30 20\nF5 P10")),
    ],
    "q3": [
        ("ERROR\nERROR: disk fail\nINFO: ok\nERROR: net fail", solve_q3("ERROR\nERROR: disk fail\nINFO: ok\nERROR: net fail")),
        ("test\n  # test hidden\ntest line\n   \n # comment\ntest again", solve_q3("test\n  # test hidden\ntest line\n   \n # comment\ntest again")),
        ("key\nkey in line\n#key ignored\n key with space", solve_q3("key\nkey in line\n#key ignored\n key with space")),
    ],
    "q4": [
        ("1.01 1.001", solve_q4("1.01 1.001")),
        ("1.0.0 1", solve_q4("1.0.0 1")),
        ("2.5 2.4.9", solve_q4("2.5 2.4.9")),
    ],
    "q5": [
        ("3.0 3.5 2.8 3.2\n2\n3.0", solve_q5("3.0 3.5 2.8 3.2\n2\n3.0")),
        ("1 2 3 4 5\n3\n3.0", solve_q5("1 2 3 4 5\n3\n3.0")),
        ("5 5 5\n5\n4.9", solve_q5("5 5 5\n5\n4.9")),
    ],
    "q6": [
        ("192.168.1.0/24 192.168.1.128", solve_q6("192.168.1.0/24 192.168.1.128")),
        ("10.0.0.0/8 11.0.0.1", solve_q6("10.0.0.0/8 11.0.0.1")),
        ("0.0.0.0/0 123.45.67.89", solve_q6("0.0.0.0/0 123.45.67.89")),
    ],
    "q7": [
        ("TYPE a\nTYPE b\nUNDO\nTYPE c", solve_q7("TYPE a\nTYPE b\nUNDO\nTYPE c")),
        ("TYPE x\nTYPE y\nUNDO\nREDO", solve_q7("TYPE x\nTYPE y\nUNDO\nREDO")),
        ("TYPE a\nUNDO\nUNDO\nREDO", solve_q7("TYPE a\nUNDO\nUNDO\nREDO")),
    ],
    "q8": [
        ("1-3,2-6,8-10", solve_q8("1-3,2-6,8-10")),
        ("5-5,1-1,3-3", solve_q8("5-5,1-1,3-3")),
        ("1-10,2-3,4-5", solve_q8("1-10,2-3,4-5")),
    ],
    "q9": [
        ("3\nalice 90 20\nbob 90 19\ncarol 85 22", solve_q9("3\nalice 90 20\nbob 90 19\ncarol 85 22")),
        ("4\nd 100 30\nc 100 30\nb 100 30\na 90 25", solve_q9("4\nd 100 30\nc 100 30\nb 100 30\na 90 25")),
        ("2\nz 80 20\na 80 20", solve_q9("2\nz 80 20\na 80 20")),
    ],
    "q10": [
        ("FF 01 02 03 00 FE", solve_q10("FF 01 02 03 00 FE")),
        ("FF 01 FD 01 02 FD 02 03 FE", solve_q10("FF 01 FD 01 02 FD 02 03 FE")),  # payload contains FF, FE escaped, checksum?
        ("FF 01 02 04 FE", solve_q10("FF 01 02 04 FE")),
    ]
}

# 手工检查 q10 的第二个样例需要算 checksum
# q10 case2: payload 01, FF, 02, FE... 等等需要重新计算
# 我们打印所有case的输入与输出用于核对

for qid, lst in cases.items():
    print(f"=== {qid} ===")
    for inp, out in lst:
        # 展示输入转义
        esc = inp.replace("\n","\\n")
        print(f"in: {esc} -> {repr(out)}")

# 额外打印 q10 细节
print("\n--- q10 detail ---")
for inp, _ in cases["q10"]:
    print(inp, "=>", solve_q10(inp))

# 检查隐藏用例预期
print("\nAll sample outputs computed")
