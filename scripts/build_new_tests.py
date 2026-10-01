#!/usr/bin/env python3
# 生成新10题的完整 TEST_SETS 并验证

import sys

def solve_q1(stdin: str) -> str:
    lines = stdin.splitlines()
    if len(lines)==0 or lines[0].strip()=="":
        return "0"
    try:
        pos = int(lines[0].strip()) % 8
    except:
        pos = 0
    seq = lines[1] if len(lines) > 1 else ""
    enabled = True
    for ch in seq.strip():
        if ch == 'C':
            if enabled:
                pos = (pos + 1) % 8
        elif ch == 'R':
            pos = 0
        elif ch == 'E':
            enabled = not enabled
        elif ch in (' ', '\t'):
            continue
    return str(pos)

def solve_q2(stdin: str) -> str:
    lines = stdin.splitlines()
    prices=[]
    codes=[]
    if len(lines)>=1 and lines[0].strip()!="":
        try:
            prices=list(map(float, lines[0].strip().split()))
        except:
            prices=[]
    if len(lines)>=2 and lines[1].strip()!="":
        codes=lines[1].strip().split()
    total=sum(prices)
    for c in codes:
        if c=="M10" and total>=100:
            total-=10
        elif c=="F5" and total>=50:
            total-=5
        elif c=="P15":
            total*=0.85
        elif c=="P10":
            total*=0.90
        elif c=="M20" and total>=200:
            total-=20
    return f"{total:.2f}"

def solve_q3(stdin: str) -> str:
    lines=stdin.splitlines()
    if not lines:
        return "0"
    keyword=lines[0].strip()
    if keyword=="":
        return "0"
    cnt=0
    for line in lines[1:]:
        if line.strip()=="":
            continue
        if line.lstrip().startswith("#"):
            continue
        if keyword in line:
            cnt+=1
    return str(cnt)

def solve_q4(stdin: str) -> str:
    s=stdin.strip()
    if not s:
        return "0"
    parts=s.split()
    if len(parts)<2:
        return "0"
    v1,v2=parts[0],parts[1]
    def parse(v):
        nums=[]
        for seg in v.split('.'):
            if seg=="":
                nums.append(0)
            else:
                try:
                    nums.append(int(seg))
                except:
                    nums.append(0)
        return nums
    a=parse(v1); b=parse(v2)
    n=max(len(a),len(b))
    a+=[0]*(n-len(a)); b+=[0]*(n-len(b))
    for x,y in zip(a,b):
        if x>y: return "1"
        if x<y: return "-1"
    return "0"

def solve_q5(stdin: str) -> str:
    lines=stdin.splitlines()
    temps=[]
    if len(lines)>=1 and lines[0].strip()!="":
        try:
            temps=list(map(float, lines[0].strip().split()))
        except:
            temps=[]
    k=0; t=0.0
    if len(lines)>=2 and lines[1].strip()!="":
        try: k=int(float(lines[1].strip()))
        except: k=0
    if len(lines)>=3 and lines[2].strip()!="":
        try: t=float(lines[2].strip())
        except: t=0.0
    if k<=0 or k>len(temps):
        return "0"
    cnt=0
    for i in range(len(temps)-k+1):
        avg=sum(temps[i:i+k])/k
        if avg>t:
            cnt+=1
    return str(cnt)

def solve_q6(stdin: str) -> str:
    s=stdin.strip()
    if not s: return "false"
    tokens=s.split()
    if len(tokens)<2: return "false"
    cidr=tokens[0]; ip_str=tokens[1]
    try:
        if '/' in cidr:
            net,prefix=cidr.split('/')
            prefix=int(prefix)
        else:
            net=cidr; prefix=32
        def ip_to_int(ip):
            parts=ip.split('.')
            if len(parts)!=4: raise ValueError
            val=0
            for p in parts:
                val=(val<<8)+int(p)
                if not 0<=int(p)<=255: raise ValueError
            return val
        net_int=ip_to_int(net); ip_int=ip_to_int(ip_str)
        mask=0 if prefix==0 else (0xFFFFFFFF << (32-prefix)) & 0xFFFFFFFF
        return "true" if (net_int & mask)==(ip_int & mask) else "false"
    except:
        return "false"

def solve_q7(stdin: str) -> str:
    lines=stdin.splitlines()
    cmds=[]
    if len(lines)>=1 and lines[0].strip().isdigit() and len(lines)-1==int(lines[0].strip()):
        cmds=lines[1:]
    else:
        cmds=lines
    cur=""; undo=[]; redo=[]
    for raw in cmds:
        line=raw.strip()
        if line=="": continue
        if line.startswith("TYPE "):
            parts=line.split(maxsplit=1)
            ch=parts[1][0] if len(parts)>1 and parts[1] else ""
            if ch:
                undo.append(cur); cur+=ch; redo.clear()
        elif line=="UNDO":
            if undo: redo.append(cur); cur=undo.pop()
        elif line=="REDO":
            if redo: undo.append(cur); cur=redo.pop()
    return cur

def solve_q8(stdin: str) -> str:
    s=stdin.strip()
    if not s: return "0"
    s_clean=s.replace(' ','')
    if not s_clean: return "0"
    parts=[p for p in s_clean.split(',') if p]
    intervals=[]
    for p in parts:
        if '-' not in p: continue
        a,b=p.split('-',1)
        try: a=int(a); b=int(b)
        except: continue
        if a>b: a,b=b,a
        intervals.append((a,b))
    if not intervals: return "0"
    intervals.sort()
    cur_l,cur_r=intervals[0]
    merged=[]
    for l,r in intervals[1:]:
        if l <= cur_r+1:  # 相邻也合并
            cur_r=max(cur_r,r)
        else:
            merged.append((cur_l,cur_r))
            cur_l,cur_r=l,r
    merged.append((cur_l,cur_r))
    return str(sum(r-l+1 for l,r in merged))

def solve_q9(stdin: str) -> str:
    lines=stdin.splitlines()
    if not lines or lines[0].strip()=="": return ""
    try: n=int(lines[0].strip())
    except: return ""
    rows=[]
    for i in range(1, min(n+1, len(lines))):
        line=lines[i].strip()
        if not line: continue
        parts=line.split()
        if len(parts)<3: continue
        name=parts[0]
        try: score=int(parts[1]); age=int(parts[2])
        except: continue
        rows.append((name,score,age))
    rows.sort(key=lambda x: (-x[1], x[2], x[0]))
    return " ".join(r[0] for r in rows)

def solve_q10(stdin: str) -> str:
    s=stdin.strip()
    if not s: return "-1"
    tokens=[t.upper() for t in s.split()]
    if len(tokens)<4 or tokens[0]!="FF" or tokens[-1]!="FE": return "-1"
    inner=tokens[1:-1]
    decoded=[]
    i=0
    while i<len(inner):
        if inner[i]=="FD":
            if i+1>=len(inner): return "-1"
            esc=inner[i+1]
            if esc=="01": decoded.append("FF")
            elif esc=="02": decoded.append("FE")
            elif esc=="03": decoded.append("FD")
            else: return "-1"
            i+=2
        else:
            try: int(inner[i],16)
            except: return "-1"
            decoded.append(inner[i]); i+=1
    if len(decoded)<1: return "-1"
    payload=decoded[:-1]; chk=decoded[-1]
    try: chk_val=int(chk,16)
    except: return "-1"
    x=0
    for b in payload: x^=int(b,16)
    if x!=chk_val: return "-1"
    return str(sum(int(b,16) for b in payload))

solvers = {
    "q1": solve_q1, "q2": solve_q2, "q3": solve_q3, "q4": solve_q4, "q5": solve_q5,
    "q6": solve_q6, "q7": solve_q7, "q8": solve_q8, "q9": solve_q9, "q10": solve_q10
}

# 设计新 TEST_SETS（可见3 + 隐藏2）
TEST_SETS_RAW = {
    "q1": [
        ("3\nCCE", False),
        ("0\nCCCCCCCC", False),
        ("7\nECCCEC", False),
        ("2\nECCRRECEC", True),
        ("5\nRRRECCC", True),
    ],
    "q2": [
        ("50 60 30\nM10 P15", False),
        ("100 100\nP15 M20", False),
        ("30 20\nF5 P10", False),
        ("200 50\nM20 P15 M10", True),
        ("120 80 50\nP10 P15 F5", True),
    ],
    "q3": [
        ("ERROR\nERROR: disk fail\nINFO: ok\nERROR: net fail", False),
        ("test\n  # test hidden\ntest line\n   \n # comment\ntest again", False),
        ("key\nkey in line\n#key ignored\n key with space", False),
        ("hi\nhi there\n  # hi hidden\nHi there\n hi hi\n# hi", True),
        ("a\n a a a\n# a\n  a\nb a b", True),
    ],
    "q4": [
        ("1.01 1.001", False),
        ("1.0.0 1", False),
        ("2.5 2.4.9", False),
        ("1.10 1.2", True),
        ("1.0.0.0 1.00", True),
    ],
    "q5": [
        ("3.0 3.5 2.8 3.2\n2\n3.0", False),
        ("1 2 3 4 5\n3\n3.0", False),
        ("5 5 5\n3\n4.9", False),
        ("", True),  # 空输入
        ("10 20 30\n5\n15", True),  # k>len
    ],
    "q6": [
        ("192.168.1.0/24 192.168.1.128", False),
        ("10.0.0.0/8 11.0.0.1", False),
        ("0.0.0.0/0 123.45.67.89", False),
        ("192.168.1.1/32 192.168.1.1", True),
        ("172.16.0.0/12 172.31.255.255", True),
    ],
    "q7": [
        ("TYPE a\nTYPE b\nUNDO\nTYPE c", False),
        ("TYPE x\nTYPE y\nUNDO\nREDO", False),
        ("TYPE a\nUNDO\nUNDO\nREDO", False),
        ("TYPE a\nTYPE b\nUNDO\nUNDO\nREDO\nREDO\nTYPE c", True),
        ("TYPE h\nTYPE e\nTYPE l\nUNDO\nTYPE l\nTYPE o", True),
    ],
    "q8": [
        ("1-3,2-6,8-10", False),
        ("5-5,1-1,3-3", False),
        ("1-10,2-3,4-5", False),
        ("1-3,4-5", True),  # 相邻合并为 1-5 =>5
        ("10-1,5-5,2-8", True),  # 乱序+反向
    ],
    "q9": [
        ("3\nalice 90 20\nbob 90 19\ncarol 85 22", False),
        ("4\nd 100 30\nc 100 30\nb 100 30\na 90 25", False),
        ("2\nz 80 20\na 80 20", False),
        ("5\nalice 100 20\nbob 100 20\ncarol 100 20\ndave 99 18\neve 100 19", True),
        ("3\nBob 90 20\nbob 90 20\nalice 90 20", True),
    ],
    "q10": [
        ("FF 01 02 03 00 FE", False),
        # payload 01 FF -> XOR FE, encoded as FD 02, so frame FF 01 FD 01 FD 02 FE
        ("FF 01 FD 01 FD 02 FE", False),
        ("FF 01 02 04 FE", False),  # invalid checksum
        # payload 10 FD -> XOR E7, payload [10, FD] => 0x10 ^ 0xFD = 0xED
        # encoded payload 10 FD 03 -> decoded 10 FD, checksum ED
        ("FF 10 FD 03 ED FE", True),
        # payload empty? Actually payload must >=1, so 1 byte payload AB, checksum AB
        ("FF AB AB FE", True),
    ],
}

# 特殊隐藏用例的 stdin 需要精确构造，检查 \n
# q5 的空输入用 ""，q5 的第二个隐藏已有了

# 计算并打印
for qid, cases in TEST_SETS_RAW.items():
    print(f"--- {qid} ---")
    for stdin, hidden in cases:
        expected = solvers[qid](stdin)
        # 验证：用 repr 展示
        esc = stdin.replace("\n","\\n")
        flag = "hidden" if hidden else "visible"
        print(f'{flag}: stdin="{esc}" => expected="{expected}"')
        # 断言非空
        assert expected is not None

print("\nAll expected values computed successfully")

# 额外验证 q10 的两个新用例
print("\nq10 detailed check:")
for stdin, _ in TEST_SETS_RAW["q10"]:
    print(stdin, "=>", solve_q10(stdin))
