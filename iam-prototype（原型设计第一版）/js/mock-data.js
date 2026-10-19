/* 临时数据：结构与未来数据库表对应，页面不直接引用，统一经 js/api.js 读取 */
window.MOCK = (function () {
  var ALL = ['查看', '新增', '编辑', '审批', '导出'];
  var EMP = ['查看'], EMPC = ['查看', '新增'];
  var MGR = ['查看', '编辑'], MGRC = ['查看', '编辑', '审批'];
  var PM = ['查看', '新增'], LEAD = ['查看'];

  var identities = [
    { id: 'wangui', label: '万贵 · 技术员', role: '技术员 · 道路工程分公司 · 第一项目经理部', screens: ['perms', 'apply', 'apps'] },
    { id: 'shenxiang', label: '沈祥 · 项目经理', role: '第一项目经理部经理 · 道路工程分公司', screens: ['perms', 'approvals', 'apps', 'apply'] },
    { id: 'zenglu', label: '曾禄 · 分公司经理', role: '道路工程分公司经理', screens: ['perms', 'approvals', 'diff', 'apps'] },
    { id: 'zhoutao', label: '周涛 · 安全管理员', role: 'IAM 安全管理员 · 总部', screens: ['perms', 'roles', 'diff', 'org'] },
    { id: 'zhaomin', label: '赵敏 · 系统管理员', role: 'IAM 系统管理员 · 总部', screens: ['perms', 'org'] },
    { id: 'sunli', label: '孙莉 · 审计员', role: '审计员 · 总部', screens: ['perms', 'audit', 'roles', 'diff'] },
    { id: 'chenli', label: '陈立 · 外包项目经理', role: '外包项目经理 · 中软国际', screens: ['perms', 'projects'] }
  ];

  var users = {
    wangui: { id: 'wangui', name: '万贵', account: 'SG000292', source: 'INTERNAL', company: '道路工程分公司', dept: '第一项目经理部', post: '技术员', roleId: 'R-EMP', roleName: '普通员工', status: '正常', phone: '135****5940', manager: '沈祥' },
    shenxiang: { id: 'shenxiang', name: '沈祥', account: 'SG000188', source: 'INTERNAL', company: '道路工程分公司', dept: '第一项目经理部', post: '第一项目经理部经理', roleId: 'R-PM', roleName: '项目经理', status: '正常', phone: '150****2188', manager: '曾禄' },
    zenglu: { id: 'zenglu', name: '曾禄', account: 'SG000011', source: 'INTERNAL', company: '道路工程分公司', dept: '道路工程分公司', post: '分公司经理', roleId: 'R-MGR', roleName: '部门经理', status: '正常', phone: '139****0011', manager: '—' },
    zhoutao: { id: 'zhoutao', name: '周涛', account: 'SG900001', source: 'INTERNAL', company: '总公司', dept: '信息中心', post: '安全管理员', roleId: 'IAM-SEC', roleName: 'IAM 安全管理员', status: '正常', phone: '138****0001', manager: '—' },
    zhaomin: { id: 'zhaomin', name: '赵敏', account: 'SG900002', source: 'INTERNAL', company: '总公司', dept: '信息中心', post: '系统管理员', roleId: 'IAM-SYS', roleName: 'IAM 系统管理员', status: '正常', phone: '138****0002', manager: '—' },
    sunli: { id: 'sunli', name: '孙莉', account: 'SG900003', source: 'INTERNAL', company: '总公司', dept: '审计监察部', post: '审计员', roleId: 'IAM-AUD', roleName: '审计员', status: '正常', phone: '138****0003', manager: '钟杰' },
    chenli: { id: 'chenli', name: '陈立', account: 'OS000021', source: 'OUTSOURCE', company: '', dept: '', post: '外包项目经理', roleId: 'P-DEV', roleName: '项目角色：开发', status: '正常', phone: '137****0021', projectId: 'P-001', org: '中软国际', expire: '2026-12-31' },
    liyong: { id: 'liyong', name: '黎永', account: 'SG000213', source: 'INTERNAL', company: '道路工程分公司', dept: '财务部', post: '会计', roleId: 'R-EMP', roleName: '普通员工', status: '正常', phone: '151****6998', manager: '郭健' },
    luxiaochao: { id: 'luxiaochao', name: '卢晓超', account: 'SG000197', source: 'INTERNAL', company: '道路工程分公司', dept: '综合办公室', post: '主任', roleId: 'R-MGR', roleName: '部门经理', status: '正常', phone: '150****9290', manager: '曾禄' },
    xuefu: { id: 'xuefu', name: '薛福', account: 'SG000065', source: 'INTERNAL', company: '总公司', dept: '财务部', post: '部长', roleId: 'R-MGR', roleName: '部门经理', status: '正常', phone: '176****7036', manager: '—' },
    xuefeng: { id: 'xuefeng', name: '薛峰', account: 'SG000001', source: 'INTERNAL', company: '总公司', dept: '公司领导', post: '董事长', roleId: 'R-LEAD', roleName: '公司领导', status: '正常', phone: '139****7502', manager: '—' },
    zhaoyiming: { id: 'zhaoyiming', name: '赵一鸣', account: 'OS000022', source: 'OUTSOURCE', company: '', dept: '', post: '开发工程师', roleId: 'P-DEV', roleName: '项目角色：开发', status: '正常', org: '中软国际', projectId: 'P-001', expire: '2026-12-31' }
  };

  var roles = [
    { id: 'R-EMP', name: '普通员工', members: 9596, fnCount: 67, ratio: 19, posts: '技术员、安全员、施工员、造价员等 11 个员级岗位' },
    { id: 'R-MGR', name: '部门经理', members: 277, fnCount: 297, ratio: 83, posts: '部长、主任、主管、分公司经理等' },
    { id: 'R-PM', name: '项目经理', members: 108, fnCount: 161, ratio: 45, posts: '项目经理、项目副经理、项目总工程师' },
    { id: 'R-LEAD', name: '公司领导', members: 19, fnCount: 359, ratio: 100, posts: '董事长、总经理、副总经理、总工、总会计师' },
    { id: 'R-SYS', name: '业务系统管理员', members: 24, fnCount: 359, ratio: 100, posts: '按系统指定，由总公司管理员任命' }
  ];

  var functions = {
    'OA-DOC-01': { id: 'OA-DOC-01', sys: 'OA', sysName: 'OA协同办公系统', mod: '公文管理', name: '收文登记与流转', level: 'L1', ops: { EMP: EMP, MGR: MGR, PM: LEAD, LEAD: LEAD, SYS: ALL } },
    'OA-DOC-02': { id: 'OA-DOC-02', sys: 'OA', sysName: 'OA协同办公系统', mod: '公文管理', name: '发文拟稿与审核', level: 'L1', ops: { EMP: EMPC, MGR: MGRC, PM: LEAD, LEAD: ['查看', '审批'], SYS: ALL } },
    'OA-SEAL-01': { id: 'OA-SEAL-01', sys: 'OA', sysName: 'OA协同办公系统', mod: '印章证照管理', name: '用印申请与审批', level: 'L2', ops: { EMP: EMPC, MGR: MGRC, PM: LEAD, LEAD: ['查看', '审批'], SYS: ALL } },
    'OA-MEET-01': { id: 'OA-MEET-01', sys: 'OA', sysName: 'OA协同办公系统', mod: '会议管理', name: '会议室预约', level: 'L1', ops: { EMP: EMPC, MGR: MGR, PM: PM, LEAD: LEAD, SYS: ALL } },
    'OA-FLOW-02': { id: 'OA-FLOW-02', sys: 'OA', sysName: 'OA协同办公系统', mod: '流程审批管理', name: '流程发起与审批', level: 'L1', ops: { EMP: EMPC, MGR: MGRC, PM: ['查看', '新增', '编辑'], LEAD: ['查看', '审批'], SYS: ALL } },
    'OA-FLOW-05': { id: 'OA-FLOW-05', sys: 'OA', sysName: 'OA协同办公系统', mod: '流程审批管理', name: '流程数据统计', level: 'L2', ops: { EMP: [], MGR: ['查看', '导出'], PM: LEAD, LEAD: ['查看', '导出'], SYS: ALL } },
    'PA-EXE-01': { id: 'PA-EXE-01', sys: 'PA', sysName: '移动巡检APP', mod: '巡检执行管理', name: '现场巡检执行', level: 'L2', ops: { EMP: EMPC, MGR: LEAD, PM: PM, LEAD: LEAD, SYS: ALL } },
    'PA-REC-01': { id: 'PA-REC-01', sys: 'PA', sysName: '移动巡检APP', mod: '巡检执行管理', name: '巡检记录管理', level: 'L2', ops: { EMP: EMP, MGR: MGR, PM: PM, LEAD: LEAD, SYS: ALL } },
    'PA-HID-01': { id: 'PA-HID-01', sys: 'PA', sysName: '移动巡检APP', mod: '隐患闭环管理', name: '隐患上报', level: 'L2', ops: { EMP: EMPC, MGR: MGR, PM: PM, LEAD: LEAD, SYS: ALL } },
    'PA-HID-02': { id: 'PA-HID-02', sys: 'PA', sysName: '移动巡检APP', mod: '隐患闭环管理', name: '隐患整改', level: 'L2', ops: { EMP: [], MGR: MGR, PM: PM, LEAD: LEAD, SYS: ALL } },
    'PA-HID-03': { id: 'PA-HID-03', sys: 'PA', sysName: '移动巡检APP', mod: '隐患闭环管理', name: '隐患复核闭环', level: 'L2', ops: { EMP: [], MGR: MGR, PM: LEAD, LEAD: LEAD, SYS: ALL } },
    'PA-LOG-01': { id: 'PA-LOG-01', sys: 'PA', sysName: '移动巡检APP', mod: '现场作业管理', name: '施工日志填报', level: 'L2', ops: { EMP: EMPC, MGR: MGR, PM: PM, LEAD: LEAD, SYS: ALL } },
    'PA-EMG-01': { id: 'PA-EMG-01', sys: 'PA', sysName: '移动巡检APP', mod: '应急管理', name: '应急事件上报', level: 'L2', ops: { EMP: EMPC, MGR: MGR, PM: PM, LEAD: ['查看', '审批'], SYS: ALL } },
    'PA-TODO-01': { id: 'PA-TODO-01', sys: 'PA', sysName: '移动巡检APP', mod: '移动端协同', name: '待办事项处理', level: 'L2', ops: { EMP: EMP, MGR: ['查看', '审批'], PM: ['查看', '审批'], LEAD: LEAD, SYS: ALL } },
    'PA-TASK-02': { id: 'PA-TASK-02', sys: 'PA', sysName: '移动巡检APP', mod: '巡检任务管理', name: '巡检任务跟踪', level: 'L2', ops: { EMP: [], MGR: ['查看', '导出'], PM: LEAD, LEAD: LEAD, SYS: ALL } },
    'PM-WBS-01': { id: 'PM-WBS-01', sys: 'PM', sysName: '工程项目管理系统(PMIS)', mod: '进度管理', name: 'WBS任务分解', level: 'L2', ops: { EMP: [], MGR: MGR, PM: ['查看', '新增', '编辑'], LEAD: LEAD, SYS: ALL } },
    'PM-PLAN-01': { id: 'PM-PLAN-01', sys: 'PM', sysName: '工程项目管理系统(PMIS)', mod: '进度管理', name: '进度计划编制', level: 'L2', ops: { EMP: [], MGR: MGR, PM: PM, LEAD: LEAD, SYS: ALL } },
    'PM-QC-02': { id: 'PM-QC-02', sys: 'PM', sysName: '工程项目管理系统(PMIS)', mod: '质量管理', name: '质量巡检与整改', level: 'L2', ops: { EMP: EMP, MGR: MGR, PM: PM, LEAD: LEAD, SYS: ALL } },
    'PM-SAFE-02': { id: 'PM-SAFE-02', sys: 'PM', sysName: '工程项目管理系统(PMIS)', mod: '安全管理', name: '安全巡检与隐患管理', level: 'L2', ops: { EMP: EMP, MGR: MGR, PM: PM, LEAD: LEAD, SYS: ALL } },
    'PM-COST-03': { id: 'PM-COST-03', sys: 'PM', sysName: '工程项目管理系统(PMIS)', mod: '成本管理', name: '签证变更管理', level: 'L3', ops: { EMP: [], MGR: MGRC, PM: PM, LEAD: ['查看', '审批'], SYS: ALL } },
    'PM-APPR-02': { id: 'PM-APPR-02', sys: 'PM', sysName: '工程项目管理系统(PMIS)', mod: '项目立项管理', name: '项目立项审批', level: 'L3', ops: { EMP: [], MGR: ['查看', '审批'], PM: [], LEAD: ['查看', '审批'], SYS: ALL } },
    'FIN-GL-01': { id: 'FIN-GL-01', sys: 'FIN', sysName: '财务管理系统', mod: '总账管理', name: '凭证管理', level: 'L3', ops: { EMP: [], MGR: [], PM: [], LEAD: LEAD, SYS: ALL } },
    'FIN-RPT-01': { id: 'FIN-RPT-01', sys: 'FIN', sysName: '财务管理系统', mod: '财务报表', name: '财务报表', level: 'L3', ops: { EMP: [], MGR: ['查看', '导出'], PM: [], LEAD: ['查看', '导出'], SYS: ALL } },
    'HR-EMP-01': { id: 'HR-EMP-01', sys: 'HR', sysName: '人力资源管理系统', mod: '员工信息管理', name: '员工台账管理', level: 'L3', ops: { EMP: ['查看', '编辑'], MGR: MGR, PM: LEAD, LEAD: LEAD, SYS: ALL } },
    'HR-PAY-03': { id: 'HR-PAY-03', sys: 'HR', sysName: '人力资源管理系统', mod: '薪酬福利管理', name: '薪酬核算', level: 'L3', ops: { EMP: EMP, MGR: [], PM: [], LEAD: LEAD, SYS: ALL } },
    'IAM-ROLE-01': { id: 'IAM-ROLE-01', sys: 'IAM', sysName: 'IAM 平台', mod: '角色与权限', name: '角色模板管理', level: 'P', ops: {} },
    'IAM-MAP-01': { id: 'IAM-MAP-01', sys: 'IAM', sysName: 'IAM 平台', mod: '角色与权限', name: '岗位映射', level: 'P', ops: {} },
    'IAM-LEVEL-01': { id: 'IAM-LEVEL-01', sys: 'IAM', sysName: 'IAM 平台', mod: '功能点目录', name: '敏感级标记', level: 'P', ops: {} },
    'IAM-EXC-01': { id: 'IAM-EXC-01', sys: 'IAM', sysName: 'IAM 平台', mod: '授权', name: '例外授予', level: 'P', ops: {} },
    'IAM-DIFF-01': { id: 'IAM-DIFF-01', sys: 'IAM', sysName: 'IAM 平台', mod: '差量', name: '分公司与部门差量', level: 'P', ops: {} },
    'IAM-SYS-01': { id: 'IAM-SYS-01', sys: 'IAM', sysName: 'IAM 平台', mod: '系统管理', name: '系统档案', level: 'P', ops: {} },
    'IAM-ORG-01': { id: 'IAM-ORG-01', sys: 'IAM', sysName: 'IAM 平台', mod: '组织', name: '组织同步', level: 'P', ops: {} },
    'IAM-AUDIT-01': { id: 'IAM-AUDIT-01', sys: 'IAM', sysName: 'IAM 平台', mod: '审计', name: '审计日志', level: 'P', ops: {} },
    'RES-CODE': { id: 'RES-CODE', sys: 'PROJ', sysName: '项目资源', mod: '代码', name: 'oa-upgrade 代码库', level: 'L2', ops: {} },
    'RES-ENV': { id: 'RES-ENV', sys: 'PROJ', sysName: '项目资源', mod: '环境', name: 'OA 测试环境', level: 'L2', ops: {} },
    'RES-DATA': { id: 'RES-DATA', sys: 'PROJ', sysName: '项目资源', mod: '数据', name: '公文脱敏样本', level: 'L3', ops: {} },
    'RES-KEY': { id: 'RES-KEY', sys: 'PROJ', sysName: '项目资源', mod: '密钥', name: '接口联调密钥', level: 'L3', ops: {} }
  };

  var deltas = [
    { id: 'D-101', level: 'DEPT', company: '道路工程分公司', dept: '第一项目经理部', post: '技术员', fn: 'PA-HID-02', ops: ['查看', '新增'], type: 'ADD', reason: '项目部要求全员可整改' },
    { id: 'D-102', level: 'DEPT', company: '道路工程分公司', dept: '第一项目经理部', post: '技术员', fn: 'FIN-GL-01', ops: ['查看'], type: 'ADD', reason: '项目部会计需查成本凭证' },
    { id: 'D-201', level: 'COMPANY', company: '道路工程分公司', post: '普通员工', fn: 'OA-SEAL-01', ops: ['查看', '新增'], type: 'DENY', reason: '印章集中管理，统一由综合办公室办理' },
    { id: 'D-202', level: 'COMPANY', company: '道路工程分公司', post: '普通员工', fn: 'PA-HID-02', ops: ['导出'], type: 'DENY', reason: '隐患数据仅项目部内部流转' }
  ];

  var exceptions = {
    'EX-2026-0312': { id: 'EX-2026-0312', appId: 'AP-2026-0312', user: 'wangui', fn: 'OA-SEAL-01', ops: ['查看', '新增'], approver: '曾禄', granted: '2026-08-03 15:40', reason: '项目现场与业主办理签证用印', breakthrough: true, level: 'L2' },
    'EX-2026-0298': { id: 'EX-2026-0298', appId: 'AP-2026-0298', user: 'wangui', fn: 'PA-TASK-02', ops: ['查看', '导出'], approver: '曾禄', granted: '2026-07-11 10:20', reason: '承担项目部巡检统计', breakthrough: false, level: 'L2' }
  };

  var perms = {
    wangui: [
      { fn: 'PA-HID-01', ops: ['查看', '新增'], source: 'TEMPLATE', scope: 'ALL' },
      { fn: 'PA-HID-02', ops: ['查看', '新增'], source: 'DEPT_DELTA', scope: 'ALL', deltaId: 'D-101' },
      { fn: 'OA-SEAL-01', ops: ['查看', '新增'], source: 'EXCEPTION', scope: 'ALL', exId: 'EX-2026-0312', breakthrough: true },
      { fn: 'PA-TASK-02', ops: ['查看', '导出'], source: 'EXCEPTION', scope: 'ALL', exId: 'EX-2026-0298' },
      { fn: 'PA-EXE-01', ops: ['查看', '新增'], source: 'TEMPLATE', scope: 'ALL' },
      { fn: 'PA-LOG-01', ops: ['查看', '新增'], source: 'TEMPLATE', scope: 'ALL' },
      { fn: 'HR-EMP-01', ops: ['查看', '编辑'], source: 'TEMPLATE', scope: 'SELF' },
      { fn: 'HR-PAY-03', ops: ['查看'], source: 'TEMPLATE', scope: 'SELF' }
    ],
    shenxiang: [
      { fn: 'PM-WBS-01', ops: ['查看', '新增', '编辑'], source: 'TEMPLATE', scope: 'ALL' },
      { fn: 'PM-PLAN-01', ops: ['查看', '新增'], source: 'TEMPLATE', scope: 'ALL' },
      { fn: 'PM-QC-02', ops: ['查看', '新增'], source: 'TEMPLATE', scope: 'ALL' },
      { fn: 'PM-SAFE-02', ops: ['查看', '新增'], source: 'TEMPLATE', scope: 'ALL' },
      { fn: 'PM-COST-03', ops: ['查看', '新增'], source: 'TEMPLATE', scope: 'ALL' },
      { fn: 'PA-TODO-01', ops: ['查看', '审批'], source: 'TEMPLATE', scope: 'ALL' }
    ],
    zenglu: [
      { fn: 'PM-APPR-02', ops: ['查看', '审批'], source: 'TEMPLATE', scope: 'ALL' },
      { fn: 'PM-COST-03', ops: ['查看', '编辑', '审批'], source: 'TEMPLATE', scope: 'ALL' },
      { fn: 'FIN-RPT-01', ops: ['查看', '导出'], source: 'TEMPLATE', scope: 'ALL' },
      { fn: 'OA-SEAL-01', ops: ['查看', '审批'], source: 'TEMPLATE', scope: 'ALL' },
      { fn: 'IAM-DIFF-01', ops: ['查看', '编辑'], source: 'PLATFORM', scope: 'COMPANY' },
      { fn: 'IAM-EXC-01', ops: ['查看', '审批'], source: 'PLATFORM', scope: 'COMPANY' }
    ],
    zhoutao: [
      { fn: 'IAM-ROLE-01', ops: ['查看', '编辑'], source: 'PLATFORM', scope: 'ALL' },
      { fn: 'IAM-MAP-01', ops: ['查看', '编辑'], source: 'PLATFORM', scope: 'ALL' },
      { fn: 'IAM-LEVEL-01', ops: ['查看', '编辑'], source: 'PLATFORM', scope: 'ALL' },
      { fn: 'IAM-EXC-01', ops: ['查看', '新增'], source: 'PLATFORM', scope: 'ALL' },
      { fn: 'IAM-DIFF-01', ops: ['查看', '编辑'], source: 'PLATFORM', scope: 'ALL' },
      { fn: 'IAM-AUDIT-01', ops: [], source: 'NONE', scope: '—', note: '安全管理员无审计权' }
    ],
    zhaomin: [
      { fn: 'IAM-SYS-01', ops: ['查看', '编辑'], source: 'PLATFORM', scope: 'ALL' },
      { fn: 'IAM-ORG-01', ops: ['查看', '编辑'], source: 'PLATFORM', scope: 'ALL' },
      { fn: 'IAM-ROLE-01', ops: [], source: 'NONE', scope: '—', note: '系统管理员不参与授权' },
      { fn: 'IAM-AUDIT-01', ops: [], source: 'NONE', scope: '—', note: '无审计权' }
    ],
    sunli: [
      { fn: 'IAM-AUDIT-01', ops: ['查看', '导出'], source: 'PLATFORM', scope: 'ALL' },
      { fn: 'IAM-EXC-01', ops: ['查看', '导出'], source: 'PLATFORM', scope: 'ALL', note: '只读' },
      { fn: 'IAM-DIFF-01', ops: ['查看'], source: 'PLATFORM', scope: 'ALL', note: '只读' },
      { fn: 'IAM-ROLE-01', ops: ['查看'], source: 'PLATFORM', scope: 'ALL', note: '只读' }
    ],
    chenli: [
      { fn: 'RES-CODE', ops: ['读', '写'], source: 'PROJECT', scope: 'PROJECT', projectId: 'P-001' },
      { fn: 'RES-ENV', ops: ['读', '写', '部署'], source: 'PROJECT', scope: 'PROJECT', projectId: 'P-001' },
      { fn: 'RES-DATA', ops: ['读'], source: 'PROJECT', scope: 'PROJECT', projectId: 'P-001' },
      { fn: 'RES-KEY', ops: [], source: 'NONE', scope: '—', note: '高敏资源未授权' }
    ]
  };

  var applications = [
    {
      id: 'AP-2026-0312', applicant: 'wangui', fn: 'OA-SEAL-01', ops: ['查看', '新增'], type: '例外权限', level: 'L2',
      status: '已生效', submitted: '2026-08-03 09:12', effective: '审批通过即生效', reason: '项目现场急需与业主办理签证用印',
      breakthrough: true, current: null,
      chain: [
        { title: '第一项目经理部经理', name: '沈祥', at: '2026-08-03 10:12', result: '同意', basis: '申请人所在部门在部门信息表中的经理' },
        { title: '道路工程分公司经理', name: '曾禄', at: '2026-08-03 15:40', result: '同意（突破禁用）', basis: '例外权限由分公司管理员终审' }
      ]
    },
    {
      id: 'AP-2026-0298', applicant: 'wangui', fn: 'PA-TASK-02', ops: ['查看', '导出'], type: '例外权限', level: 'L2',
      status: '已生效', submitted: '2026-07-11 09:00', effective: '审批通过即生效', reason: '承担项目部巡检统计工作',
      breakthrough: false, current: null,
      chain: [
        { title: '第一项目经理部经理', name: '沈祥', at: '2026-07-11 09:40', result: '同意', basis: '部门负责人' },
        { title: '道路工程分公司经理', name: '曾禄', at: '2026-07-11 10:20', result: '同意', basis: '例外权限终审' }
      ]
    },
    {
      id: 'AP-2026-1206', applicant: 'wangui', fn: 'OA-FLOW-05', ops: ['查看', '导出'], type: '例外权限', level: 'L2',
      status: '审批中', submitted: '2026-10-17 09:12', effective: '审批通过即生效', reason: '需要按季度统计项目部流程办结率',
      breakthrough: false, current: 'shenxiang',
      chain: [
        { title: '第一项目经理部经理', name: '沈祥', at: '', result: '待处理', basis: '部门负责人' },
        { title: '道路工程分公司经理', name: '曾禄', at: '', result: '未开始', basis: '例外权限终审' }
      ]
    },
    {
      id: 'AP-2026-1207', applicant: 'liyong', fn: 'FIN-GL-01', ops: ['查看'], type: '例外权限', level: 'L3',
      status: '审批中', submitted: '2026-10-16 16:40', effective: '审批通过即生效', reason: '配合审计查阅总账凭证',
      breakthrough: false, current: 'shenxiang',
      chain: [
        { title: '财务部负责人', name: '郭健', at: '2026-10-16 17:10', result: '同意', basis: '部门负责人' },
        { title: '道路工程分公司经理', name: '曾禄', at: '', result: '待处理', basis: '例外权限 L3：分公司管理员' },
        { title: '总公司管理员', name: '周涛', at: '', result: '未开始', basis: '例外权限 L3：总公司终结' }
      ]
    }
  ];

  var projects = [
    {
      id: 'P-001', name: 'OA 协同办公升级改造', dept: '综合办公室', owner: '卢晓超', lead: '陈立', start: '2026-03-01', end: '2026-12-31', status: '进行中',
      resources: [
        { id: 'RES-CODE', type: '代码', level: 'L2', granted: true },
        { id: 'RES-ENV', type: '环境', level: 'L2', granted: true },
        { id: 'RES-DATA', type: '数据', level: 'L3', granted: true },
        { id: 'RES-KEY', type: '密钥', level: 'L3', granted: false }
      ],
      members: [
        { user: 'chenli', role: '项目经理', org: '中软国际', expire: '2026-12-31', status: '正常' },
        { user: 'zhaoyiming', role: '开发', org: '中软国际', expire: '2026-12-31', status: '正常' }
      ]
    },
    {
      id: 'P-002', name: '移动巡检 APP 一期', dept: '安全质量部', owner: '姚文康', lead: '孙浩', start: '2025-06-01', end: '2025-12-31', status: '已结项',
      resources: [{ id: 'RES-CODE', type: '代码', level: 'L2', granted: false }],
      members: [{ user: 'chenli', role: '开发', org: '中软国际', expire: '2025-12-31', status: '已失效' }]
    }
  ];

  var logs = [
    { id: 'L-1001', at: '2026-10-17 02:14', type: '权限变更', actor: '曾禄', target: '万贵', summary: '新增「用印申请与审批」查看/新增（突破禁用）', ip: '10.6.22.31', before: '无（分公司差量禁用）', after: '例外授予 查看/新增', appId: 'AP-2026-0312', anomaly: true },
    { id: 'L-1002', at: '2026-10-16 17:20', type: '审批', actor: '沈祥', target: 'AP-2026-0312', summary: '节点 1 同意', ip: '10.6.22.9', before: '—', after: '同意', appId: 'AP-2026-0312' },
    { id: 'L-1003', at: '2026-10-16 15:40', type: '权限变更', actor: '周涛', target: '角色「普通员工」', summary: '隐患上报 新增 查看/新增', ip: '10.1.2.9', before: '查看', after: '查看/新增' },
    { id: 'L-1004', at: '2026-10-16 08:03', type: '登录', actor: '万贵', target: '—', summary: '登录成功 · Chrome / Windows', ip: '10.12.3.44', before: '—', after: '成功' },
    { id: 'L-1005', at: '2026-10-15 23:41', type: '权限变更', actor: '曾禄', target: '道路工程分公司 × 普通员工', summary: '禁用「用印申请与审批」', ip: '10.6.22.31', before: '查看/新增', after: '禁用', anomaly: true }
  ];

  return { identities: identities, users: users, roles: roles, functions: functions, perms: perms, deltas: deltas, exceptions: exceptions, applications: applications, projects: projects, logs: logs };
})();
