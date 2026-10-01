/**
 * 题库单一来源（服务端专用）
 *
 * - QUESTIONS：可下发给已登录考生的公开题面（题干 + 可见示例，无隐藏用例）
 * - TEST_SETS：永不下发，仅服务端做题目存在性校验 + 考后离线评分参考
 *
 * 学生端 EXE 不再内置任何题面，考前拿到包也看不到题。
 */

export const QUESTIONS = [
  {
    id: 'q1',
    title: '流水灯状态机',
    difficulty: 'medium',
    score: 10,
    timeLimit: '1s / 128MB',
    description:
      '【背景】实验室的 8 位流水灯用于信息文化节开幕式，8 颗 LED 围成一圈，亮灯位置编号 0~7（0 为最右侧）。每次时钟脉冲可让亮点向左移动一格，移出 7 后回到 0 循环。控制板另有使能开关与复位键，开幕式当天操作员会连续输入一串指令，要求程序精确模拟最终亮点位置。\n\n【任务】给定初始位置 p 与一串操作指令，模拟执行后输出亮点最终位置。指令集：C 表示时钟脉冲——若当前“使能”开启则 pos=(pos+1)%8，否则保持不动；R 表示复位——pos 直接置 0（不影响使能）；E 表示翻转使能——使能状态取反。初始使能为 true。\n\n【输入】两行：第一行整数 p（可能超出 0~7，需按 p%8 处理；空行视为 0）；第二行操作序列（可能为空行），仅 C/R/E 有效，其它字符（含空格、制表符）一律忽略。\n\n【输出】一行整数：最终位置 0~7。\n\n【约束】序列长度 ≤100000；必须严格按顺序处理，E 的翻转会影响其后所有 C 是否生效；R 不改变使能状态。\n\n【样例说明】3→C→4→C→5→E(关闭使能)，后续 C 不再生效，故输出 5。',
    samples: [
      { input: '3\nCCE', output: '5' },
      { input: '0\nCCCCCCCC', output: '0' },
      { input: '7\nECCCEC', output: '0' }
    ],
    starterCode: { python: '', java: '', c: '', cpp: '' }
  },
  {
    id: 'q2',
    title: '文创市集结算',
    difficulty: 'medium',
    score: 10,
    timeLimit: '1s / 128MB',
    description:
      '【背景】信息文化节文创市集上，顾客可叠加使用多张优惠券，但收银系统必须按顾客出示顺序逐张结算——前一张优惠会改变小计，从而影响下一张是否满足门槛。曾有摊主自行“优化”顺序导致账实不符，本题要求你严格复刻收银机行为。\n\n【任务】给定商品金额列表与优惠码序列，计算最终实付金额。优惠种类：M10 满100减10，M20 满200减20，F5 满50减5，P15 无门槛打85折，P10 无门槛打9折。满减类不满足门槛时跳过本张；折扣类直接乘系数；未知码忽略。\n\n【输入】两行：第一行空格分隔的商品价格（浮点，空行视为 0）；第二行空格分隔的优惠码（可能为空行，大小写敏感）。\n\n【输出】一行：最终金额，保留两位小数（四舍五入，格式如 110.50）。\n\n【约束】价格 ≤1e4，优惠码 ≤20 张；必须按输入顺序执行，不能自行排序或合并。\n\n【样例说明】50+60+30=140→M10(≥100)减10得130→P15打85折得110.50。注意若顺序颠倒结果不同。',
    samples: [
      { input: '50 60 30\nM10 P15', output: '110.50' },
      { input: '100 100\nP15 M20', output: '170.00' },
      { input: '30 20\nF5 P10', output: '40.50' }
    ],
    starterCode: { python: '', java: '', c: '', cpp: '' }
  },
  {
    id: 'q3',
    title: '实验室日志清洗',
    difficulty: 'easy',
    score: 10,
    timeLimit: '1s / 128MB',
    description:
      '【背景】实验室的温湿度传感器每天产生大量日志，但文件中混入了人工注释与空行。助教需要统计包含特定关键词的有效记录数，作为设备故障率的分子。注释判定稍有不慎就会多计或漏计。\n\n【任务】给定关键词 keyword 与若干日志行，统计包含该子串的有效行数（大小写敏感）。有效性规则：①空行或纯空白行不计；②将行首空格去除后若以 # 开头则视为注释行不计（例如 "  # reboot" 也是注释）；其余行即使行中含 # 仍视为有效。\n\n【输入】第一行 keyword（单个词，去除首尾空格后为空则直接输出 0）；之后每行一条日志，直至文件结束。\n\n【输出】一行整数：有效且包含 keyword 的行数。\n\n【约束】行数 ≤100000，每行长度 ≤500；关键词长度 ≤50；要求 O(总字符数) 一遍扫描。\n\n【样例说明】"  # test hidden" 虽含 test，但前导去空后以 # 开头，视为注释不计。',
    samples: [
      { input: 'ERROR\nERROR: disk fail\nINFO: ok\nERROR: net fail', output: '2' },
      { input: 'test\n  # test hidden\ntest line\n   \n # comment\ntest again', output: '2' },
      { input: 'key\nkey in line\n#key ignored\n key with space', output: '2' }
    ],
    starterCode: { python: '', java: '', c: '', cpp: '' }
  },
  {
    id: 'q4',
    title: '固件版本比较',
    difficulty: 'easy',
    score: 10,
    timeLimit: '1s / 128MB',
    description:
      '【背景】电子爱好者协会每年为文化节道具迭代固件，版本号如 1.2.3、1.10 等。发布系统需自动判断新旧，避免回滚烧录。版本号写法很不规范：前导零、连续点、缺段都可能出现。\n\n【任务】给定两个版本号 a、b，比较大小。每段按数值比较（忽略前导零，空段视为 0），缺失段自动补 0（如 1 等同于 1.0.0）。输出 1 表示 a>b，-1 表示 a<b，0 表示相等。\n\n【输入】一行：两个版本号用空格分隔（仅含数字与 .，可能含前导零或连续点）。\n\n【输出】一行：1 / -1 / 0。\n\n【约束】每段数值 ≤1e9，段数 ≤100；比较时按最长段数补 0 后逐段对比；空输入直接输出 0。\n\n【样例说明】1.01 与 1.001 均视为 [1,1]，故相等；2.5 与 2.4.9 先比第二段 5>4 直接得出 1。',
    samples: [
      { input: '1.01 1.001', output: '0' },
      { input: '1.0.0 1', output: '0' },
      { input: '2.5 2.4.9', output: '1' }
    ],
    starterCode: { python: '', java: '', c: '', cpp: '' }
  },
  {
    id: 'q5',
    title: '高原温室监测',
    difficulty: 'medium',
    score: 10,
    timeLimit: '1s / 128MB',
    description:
      '【背景】西藏大学高原温室需实时监测温度波动。系统以固定窗口持续计算平均温度，一旦均值超阈值即触发报警。值班同学需要一个小程序离线复核历史数据。\n\n【任务】给定温度序列、窗口大小 k 与阈值 t，对每个长度 k 的连续窗口计算平均值，若严格大于 t 则计一次报警（窗口可重叠，步长 1）。\n\n【输入】三行：第一行空格分隔的温度序列（浮点，可能空行）；第二行整数 k（可能是小数形式输入，需按整数处理）；第三行浮点 t。\n\n【输出】一行整数：报警窗口个数。若序列为空、k<=0 或 k>序列长度则输出 0。\n\n【约束】序列长度 ≤100000；平均值用双精度计算后直接比较（不做 epsilon）；朴素 O(nk) 在 n=1e5 时会超时，建议前缀和或滑窗 O(n)。\n\n【样例说明】3.0 3.5 2.8 3.2 取 k=2 时窗口 [3.0,3.5]=3.25>3.0 计1，[3.5,2.8]=3.15>3.0 计1，[2.8,3.2]=3.0 不计（严格大于），共2。',
    samples: [
      { input: '3.0 3.5 2.8 3.2\n2\n3.0', output: '2' },
      { input: '1 2 3 4 5\n3\n3.0', output: '1' },
      { input: '5 5 5\n3\n4.9', output: '1' }
    ],
    starterCode: { python: '', java: '', c: '', cpp: '' }
  },
  {
    id: 'q6',
    title: '校园网网段检查',
    difficulty: 'medium',
    score: 10,
    timeLimit: '1s / 128MB',
    description:
      '【背景】信息文化节期间，校园网临时划分多个 CIDR 网段供参赛设备接入，运维需要快速判断某 IP 是否属于指定网段。配错网段会导致设备拿不到地址，现场排障分秒必争。\n\n【任务】给定 CIDR（如 192.168.1.0/24）与待测 IP，判断后者是否在网段内。CIDR 前缀 0~32：/0 表示全网段（任何 IP 都为 true），/32 表示单主机（仅相等为 true）。\n\n【输入】一行：CIDR 与 IP 用空格分隔（保证格式合法，均为点分十进制）。\n\n【输出】一行：true 或 false（全小写）。\n\n【约束】需按位掩码比较：将 IP 转 32 位无符号整数，掩码为前缀个 1 后补 0，按位与后比对网络部分；注意 /0 时掩码为 0，移位需特判避免 UB。\n\n【样例说明】192.168.1.0/24 的掩码为 255.255.255.0，192.168.1.128 与网络地址前24位相同，故 true。',
    samples: [
      { input: '192.168.1.0/24 192.168.1.128', output: 'true' },
      { input: '10.0.0.0/8 11.0.0.1', output: 'false' },
      { input: '0.0.0.0/0 123.45.67.89', output: 'true' }
    ],
    starterCode: { python: '', java: '', c: '', cpp: '' }
  },
  {
    id: 'q7',
    title: '海报编辑器撤销',
    difficulty: 'medium',
    score: 10,
    timeLimit: '1s / 128MB',
    description:
      '【背景】文化节海报在现场用极简编辑器制作，只支持追加字符、撤销与重做。志愿者操作飞快，经常连续 UNDO/REDO，编辑器必须时刻保持一致。\n\n【任务】按顺序执行命令序列，输出最终文本。每条命令一行：TYPE x 追加单字符 x（仅取空格后首字符）；UNDO 撤销到上一次 TYPE 前的状态；REDO 重做最近一次被 UNDO 的状态。TYPE 会清空重做栈，UNDO/REDO 在对应栈空时无操作。\n\n【输入】多行命令直至文件结束（可能包含空行，空行忽略；首行若为数字且与后续行数吻合则视为行数，可兼容）。\n\n【输出】一行：最终文本（空则输出空行）。\n\n【约束】命令数 ≤100000；需维护 undo/redo 双栈：TYPE 压入历史并清 redo，UNDO 弹 undo 压 redo，REDO 反之；总复杂度 O(命令数)，文本总长 ≤100000。\n\n【样例说明】TYPE a→a，TYPE b→ab，UNDO→a，TYPE c→ac（注意 TYPE 清空了 redo）。',
    samples: [
      { input: 'TYPE a\nTYPE b\nUNDO\nTYPE c', output: 'ac' },
      { input: 'TYPE x\nTYPE y\nUNDO\nREDO', output: 'xy' },
      { input: 'TYPE a\nUNDO\nUNDO\nREDO', output: 'a' }
    ],
    starterCode: { python: '', java: '', c: '', cpp: '' }
  },
  {
    id: 'q8',
    title: '活动室预约统计',
    difficulty: 'medium',
    score: 10,
    timeLimit: '1s / 128MB',
    description:
      '【背景】活动室在文化节期间开放预约，预约记录可能乱序、端点反向，甚至包含单点预约。管理员需要合并后统计实际占用天数，作为保洁排班依据。\n\n【任务】给定一行区间列表，格式如 1-3,2-6,8-10（逗号分隔，空格随意，区间端点可反向如 10-1，单点如 5-5）。先将每个区间端点按小到大整理，再按起点排序，合并所有重叠或相邻的区间（1-3 与 4-5 视为相邻需合并），最后输出合并后覆盖的总长度（闭区间含端点，1-3 长度 3）。\n\n【输入】一行字符串，空行输出 0；非法片段（如缺 -）直接跳过。\n\n【输出】一行整数：总覆盖天数。\n\n【约束】区间数 ≤100000，端点绝对值 ≤1e9；合并条件为 next.l ≤ cur.r+1；排序 O(n log n)。\n\n【样例说明】1-3,2-6 合并为 1-6 长度6，8-10 长度3，共9。1-3 与 4-5 相邻也会合并为 1-5。',
    samples: [
      { input: '1-3,2-6,8-10', output: '9' },
      { input: '5-5,1-1,3-3', output: '3' },
      { input: '1-10,2-3,4-5', output: '10' }
    ],
    starterCode: { python: '', java: '', c: '', cpp: '' }
  },
  {
    id: 'q9',
    title: '竞赛排名',
    difficulty: 'hard',
    score: 10,
    timeLimit: '1s / 128MB',
    description:
      '【背景】文化节编程竞赛需现场排名，规则与常规 OJ 略有不同：高分优先，同分则年轻者优先，仍相同则按姓名 ASCII 字典序。主持人要求回车即出榜，排序必须一次写对。\n\n【任务】给定 n 名选手的 name score age，按 score 降序、age 升序、name 升序（大小写敏感，ASCII 比较，\'B\'(66) < \'a\'(97)）排序后输出。\n\n【输入】第一行整数 n（0≤n≤100000）；随后 n 行每行 name score age（name 无空格，含大小写）。\n\n【输出】一行：排序后 name 用空格拼接（n=0 输出空行，末尾无多余空格）。\n\n【约束】score、age 为整数（可为负）；必须稳定实现三关键字比较，禁止只比第一关键字；O(n log n)。\n\n【样例说明】alice 90 20、bob 90 19、carol 85 22 中 bob 与 alice 同分但 bob 更年轻排前，carol 分低排后。',
    samples: [
      { input: '3\nalice 90 20\nbob 90 19\ncarol 85 22', output: 'bob alice carol' },
      { input: '4\nd 100 30\nc 100 30\nb 100 30\na 90 25', output: 'b c d a' },
      { input: '2\nz 80 20\na 80 20', output: 'a z' }
    ],
    starterCode: { python: '', java: '', c: '', cpp: '' }
  },
  {
    id: 'q10',
    title: '遥测转义帧校验',
    difficulty: 'hard',
    score: 10,
    timeLimit: '1s / 128MB',
    description:
      '【背景】无人机遥测链路为避免载荷与帧头帧尾冲突，对载荷做了转义，回放时需先解转义再校验。链路偶发丢字节、错转义，任何一步失败整帧作废。\n\n【任务】给定一行十六进制帧：FF <payload+checksum 转义后> FE。转义仅针对中间字节：FD 01 还原为 FF，FD 02 还原为 FE，FD 03 还原为 FD，其余字节原样保留（大小写不敏感）。解码后最后 1 字节为校验和，需等于前面 payload 字节的按位异或（XOR）；若帧不以 FF 开头 / FE 结尾、转义非法（如 FD 后不跟 01/02/03，或帧尾孤零 FD）、校验失败、payload 为空则输出 -1，否则输出 payload 字节的十进制和。\n\n【输入】一行空格分隔的十六进制字节（大小写不敏感，空行视为非法）。\n\n【输出】一行：-1 或 payload 和。\n\n【约束】帧长度 ≤256 字节；payload 长度 ≥1；校验和为单字节 XOR；非法十六进制字符直接判 -1。\n\n【样例说明】FF 01 FD 01 FD 02 FE 解码得载荷 0x01 0xFF、校验 0xFE，0x01^0xFF=0xFE 校验通过，和为 1+255=256。',
    samples: [
      { input: 'FF 01 02 03 00 FE', output: '6' },
      { input: 'FF 01 FD 01 FD 02 FE', output: '256' },
      { input: 'FF 01 02 04 FE', output: '-1' }
    ],
    starterCode: { python: '', java: '', c: '', cpp: '' }
  }
]

/** 隐藏测试用例：永不下发客户端，仅服务端校验题目存在性 + 考后离线评分参考 */
export const TEST_SETS = {
  q1: [
    { stdin: '3\nCCE', expected: '5' },
    { stdin: '0\nCCCCCCCC', expected: '0' },
    { stdin: '7\nECCCEC', expected: '0' },
    { stdin: '2\nECCRRECEC', expected: '1', hidden: true },
    { stdin: '5\nRRRECCC', expected: '0', hidden: true }
  ],
  q2: [
    { stdin: '50 60 30\nM10 P15', expected: '110.50' },
    { stdin: '100 100\nP15 M20', expected: '170.00' },
    { stdin: '30 20\nF5 P10', expected: '40.50' },
    { stdin: '200 50\nM20 P15 M10', expected: '185.50', hidden: true },
    { stdin: '120 80 50\nP10 P15 F5', expected: '186.25', hidden: true }
  ],
  q3: [
    { stdin: 'ERROR\nERROR: disk fail\nINFO: ok\nERROR: net fail', expected: '2' },
    { stdin: 'test\n  # test hidden\ntest line\n   \n # comment\ntest again', expected: '2' },
    { stdin: 'key\nkey in line\n#key ignored\n key with space', expected: '2' },
    { stdin: 'hi\nhi there\n  # hi hidden\nHi there\n hi hi\n# hi', expected: '2', hidden: true },
    { stdin: 'a\n a a a\n# a\n  a\nb a b', expected: '3', hidden: true }
  ],
  q4: [
    { stdin: '1.01 1.001', expected: '0' },
    { stdin: '1.0.0 1', expected: '0' },
    { stdin: '2.5 2.4.9', expected: '1' },
    { stdin: '1.10 1.2', expected: '1', hidden: true },
    { stdin: '1.0.0.0 1.00', expected: '0', hidden: true }
  ],
  q5: [
    { stdin: '3.0 3.5 2.8 3.2\n2\n3.0', expected: '2' },
    { stdin: '1 2 3 4 5\n3\n3.0', expected: '1' },
    { stdin: '5 5 5\n3\n4.9', expected: '1' },
    { stdin: '', expected: '0', hidden: true },
    { stdin: '10 20 30\n5\n15', expected: '0', hidden: true }
  ],
  q6: [
    { stdin: '192.168.1.0/24 192.168.1.128', expected: 'true' },
    { stdin: '10.0.0.0/8 11.0.0.1', expected: 'false' },
    { stdin: '0.0.0.0/0 123.45.67.89', expected: 'true' },
    { stdin: '192.168.1.1/32 192.168.1.1', expected: 'true', hidden: true },
    { stdin: '172.16.0.0/12 172.31.255.255', expected: 'true', hidden: true }
  ],
  q7: [
    { stdin: 'TYPE a\nTYPE b\nUNDO\nTYPE c', expected: 'ac' },
    { stdin: 'TYPE x\nTYPE y\nUNDO\nREDO', expected: 'xy' },
    { stdin: 'TYPE a\nUNDO\nUNDO\nREDO', expected: 'a' },
    { stdin: 'TYPE a\nTYPE b\nUNDO\nUNDO\nREDO\nREDO\nTYPE c', expected: 'abc', hidden: true },
    { stdin: 'TYPE h\nTYPE e\nTYPE l\nUNDO\nTYPE l\nTYPE o', expected: 'helo', hidden: true }
  ],
  q8: [
    { stdin: '1-3,2-6,8-10', expected: '9' },
    { stdin: '5-5,1-1,3-3', expected: '3' },
    { stdin: '1-10,2-3,4-5', expected: '10' },
    { stdin: '1-3,4-5', expected: '5', hidden: true },
    { stdin: '10-1,5-5,2-8', expected: '10', hidden: true }
  ],
  q9: [
    { stdin: '3\nalice 90 20\nbob 90 19\ncarol 85 22', expected: 'bob alice carol' },
    { stdin: '4\nd 100 30\nc 100 30\nb 100 30\na 90 25', expected: 'b c d a' },
    { stdin: '2\nz 80 20\na 80 20', expected: 'a z' },
    { stdin: '5\nalice 100 20\nbob 100 20\ncarol 100 20\ndave 99 18\neve 100 19', expected: 'eve alice bob carol dave', hidden: true },
    { stdin: '3\nBob 90 20\nbob 90 20\nalice 90 20', expected: 'Bob alice bob', hidden: true }
  ],
  q10: [
    { stdin: 'FF 01 02 03 00 FE', expected: '6' },
    { stdin: 'FF 01 FD 01 FD 02 FE', expected: '256' },
    { stdin: 'FF 01 02 04 FE', expected: '-1' },
    { stdin: 'FF 10 FD 03 ED FE', expected: '269', hidden: true },
    { stdin: 'FF AB AB FE', expected: '171', hidden: true }
  ]
}
