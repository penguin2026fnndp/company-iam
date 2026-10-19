/* 路由与页面渲染。所有数据经 Api 获取，便于替换为真实后端。 */
(function () {
  var state = { me: 'wangui', identity: null, dict: null };

  var NAV = [
    { g: '我的工作', items: [
      { s: 'perms', label: '我的权限', path: '/perms' },
      { s: 'apply', label: '提交权限申请', path: '/apply' },
      { s: 'apps', label: '我的申请', path: '/apps' },
      { s: 'approvals', label: '待我审批', path: '/approvals' }
    ] },
    { g: '治理配置', items: [
      { s: 'roles', label: '角色与权限', path: '/roles' },
      { s: 'diff', label: '分公司差量', path: '/diff' },
      { s: 'projects', label: '项目权限', path: '/projects' },
      { s: 'org', label: '组织与账号', path: '/org' }
    ] },
    { g: '审计', items: [{ s: 'audit', label: '审计日志', path: '/audit' }] }
  ];

  function el(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function srcLabel(s) { return (state.dict.sources[s] || s); }
  function srcTag(s) {
    var cls = { TEMPLATE: 'grant', DEPT_DELTA: 'add', COMPANY_DELTA: 'add', EXCEPTION: 'except', PLATFORM: 'plain', PROJECT: 'pend', NONE: 'mute' }[s] || 'mute';
    return '<span class="tag ' + cls + '">' + esc(srcLabel(s)) + '</span>';
  }
  function levelTag(l) {
    var map = { L1: ['mute', 'L1 一般'], L2: ['sens', 'L2 重要'], L3: ['deny', 'L3 高敏'], P: ['plain', '平台'] };
    var v = map[l] || ['mute', l];
    return '<span class="tag ' + v[0] + '">' + v[1] + '</span>';
  }
  function opsHtml(ops) {
    if (!ops || !ops.length) { return '<span class="op">无</span>'; }
    return ops.map(function (o) { return '<span class="op on">' + o + '</span>'; }).join('');
  }
  function scopeText(s) {
    return { ALL: '—', SELF: '仅本人', PROJECT: '本项目', COMPANY: '本分公司' }[s] || '—';
  }
  function head(title, lead, cov, back) {
    return '<div class="screen-h">' +
      (back ? '<div class="actions" style="margin-bottom:9px"><button class="btn sm" data-go="' + back + '">← 返回</button></div>' : '') +
      '<h1>' + esc(title) + '</h1><p class="lead">' + lead + '</p>' +
      (cov ? '<div class="cov">' + cov + '</div>' : '') + '</div>';
  }
  function toast(msg) {
    var d = document.createElement('div');
    d.className = 'banner';
    d.style.cssText = 'position:fixed;left:50%;bottom:26px;transform:translateX(-50%);z-index:99;box-shadow:0 6px 20px rgba(0,0,0,.12)';
    d.textContent = msg;
    document.body.appendChild(d);
    setTimeout(function () { d.remove(); }, 2200);
  }

  /* ---------- 我的权限 ---------- */
  async function viewPerms() {
    var res = await Api.listMyPermissions(state.me);
    var rows = res.data, u = state.identity;
    var tmpl = rows.filter(function (r) { return r.source === 'TEMPLATE'; }).length;
    var delta = rows.filter(function (r) { return r.source === 'DEPT_DELTA' || r.source === 'COMPANY_DELTA'; }).length;
    var exc = rows.filter(function (r) { return r.source === 'EXCEPTION'; }).length;
    var isProj = u.screens.indexOf('projects') >= 0 && u.id === 'chenli';
    var kpi = [
      ['当前生效', rows.filter(function (r) { return (r.ops || []).length; }).length, '项', isProj ? '项目资源' : '仅统计有操作位的能力'],
      ['模板来源', tmpl, '项', '角色模板直接授予'],
      ['差量调整', delta, '项', '部门 / 分公司'],
      ['例外授予', exc, '项', exc ? '含突破禁用 1 项' : '无']
    ];
    var trs = rows.map(function (r) {
      var f = r.fnDetail || {};
      return '<tr style="cursor:pointer" data-go="/perms/' + r.fn + '">' +
        '<td><div class="who">' + esc(f.name) + '</div><div class="num">' + esc(f.sysName) + ' · ' + esc(f.mod) + '</div></td>' +
        '<td>' + opsHtml(r.ops) + '</td>' +
        '<td>' + srcTag(r.source) + '</td>' +
        '<td>' + (r.scope === 'SELF' ? '<span class="tag pend">仅本人</span>' : '<span class="muted">' + scopeText(r.scope) + '</span>') + '</td>' +
        '<td>' + (r.breakthrough ? '<span class="tag deny">突破禁用</span>' : '<span class="muted">—</span>') + '</td>' +
        '</tr>';
    }).join('');
    return head('我的权限', '这里回答三件事：我能对什么做什么、权限从哪来、能看到谁的数据。点击任意一行查看判定过程。',
      '数据来源 <b>员工表</b> <b>部门表</b> <b>权限清单</b> · ' + esc(u.role)) +
      '<div class="kpis">' + kpi.map(function (k) {
        return '<div class="kpi"><div class="k">' + k[0] + '</div><div class="v">' + k[1] + '<small>' + k[2] + '</small></div><div class="d">' + k[3] + '</div></div>';
      }).join('') + '</div>' +
      '<div class="panel" style="margin-top:14px"><div class="panel-h"><h2>权限台账</h2><span class="hint">共 ' + rows.length + ' 条 · 点击查看判定</span></div><div class="panel-b flush">' +
      '<table class="tbl"><thead><tr><th>功能点</th><th>操作</th><th>来源</th><th>数据范围</th><th>标记</th></tr></thead><tbody>' +
      trs + '</tbody></table></div></div>';
  }

  /* ---------- 权限详情 ---------- */
  async function viewPermDetail(fnId) {
    var res = await Api.getPermission(state.me, fnId);
    if (res.code !== 0) { return head('未找到', esc(res.message)); }
    var r = res.data, f = r.fnDetail, u = r.user;
    var isProj = r.source === 'PROJECT' || (f.sys === 'PROJ');
    var isPlat = r.source === 'PLATFORM' || r.source === 'NONE' && f.level === 'P';
    var steps = [];
    if (isProj) {
      steps = [
        { t: '项目角色：开发', d: '项目 ' + (r.project ? r.project.name : '') + ' 的项目角色', ok: true, n: '由项目负责人维护' },
        { t: '资源范围：' + f.mod + ' ' + f.name, d: '敏感级 ' + f.level, ok: (r.ops || []).length > 0, n: '项目内可见' },
        { t: '有效期', d: '账号有效期至 ' + (u.expire || '项目结束日'), ok: true, n: '项目结项即失效' }
      ];
    } else if (f.level === 'P') {
      steps = [
        { t: 'IAM 平台角色', d: u.roleName, ok: (r.ops || []).length > 0, n: '平台权限独立成树' },
        { t: '功能点：' + f.name, d: (r.ops || []).length ? '授予 ' + r.ops.join(' / ') : (r.note || '未授予'), ok: (r.ops || []).length > 0, n: '三权分立约束' }
      ];
    } else {
      var tmplOps = (f.ops && f.ops[({ 'R-EMP': 'EMP', 'R-MGR': 'MGR', 'R-PM': 'PM', 'R-LEAD': 'LEAD', 'R-SYS': 'SYS' }[u.roleId] || 'EMP')]) || [];
      var denies = (r.relatedDeltas || []).filter(function (d) { return d.type === 'DENY'; });
      var deptAdd = (r.relatedDeltas || []).filter(function (d) { return d.type === 'ADD' && d.level === 'DEPT'; });
      steps = [
        { t: '角色模板 · ' + u.roleName, d: tmplOps.length ? '包含 ' + tmplOps.join(' / ') : '不包含该功能点', ok: tmplOps.length > 0, n: '54 个岗位映射到 5 个模板' },
        { t: '分公司差量', d: denies.length ? '禁用 ' + denies[0].ops.join(' / ') + '，理由：' + denies[0].reason : '无调整', ok: !denies.length, n: denies.length ? '分公司级' : '无差异' },
        { t: '部门差量', d: deptAdd.length ? '追加 ' + deptAdd[0].ops.join(' / ') + '（' + deptAdd[0].dept + ' × ' + deptAdd[0].post + '）' : '无调整', ok: deptAdd.length > 0, n: deptAdd.length ? '部门级' : '无差异' },
        { t: '例外授予', d: r.exception ? '追加 ' + r.exception.ops.join(' / ') + '，单号 ' + r.exception.appId : '无', ok: !!r.exception, n: r.exception ? '审批 ' + r.exception.approver + ' · ' + r.exception.granted : '' }
      ];
    }
    var stepHtml = steps.map(function (s, i) {
      return '<div class="step ' + (s.ok ? 'done' : '') + '"><div class="dot">' + (s.ok ? '✓' : '·') + '</div><div>' +
        '<div class="s-t">' + esc(s.t) + '</div><div class="s-d">' + esc(s.d) + '</div>' +
        (s.n ? '<div class="s-n">' + esc(s.n) + '</div>' : '') + '</div></div>';
    }).join('') +
      '<div class="step ' + ((r.ops || []).length ? 'cur' : '') + '"><div class="dot">=</div><div><div class="s-t">最终结果</div><div class="s-d">' +
      ((r.ops || []).length ? r.ops.join(' / ') + '（' + scopeText(r.scope) + '）' : '不生效') + '</div></div></div>';

    var info = [
      ['所属系统', f.sysName], ['所属模块', f.mod], ['敏感级', levelTag(f.level)],
      ['授权来源', srcTag(r.source)], ['数据范围', scopeText(r.scope)], ['判定时间', '2026-10-17 14:02:11']
    ].map(function (x) { return '<dt>' + x[0] + '</dt><dd>' + x[1] + '</dd>'; }).join('');

    var app = r.app;
    var appPanel = app ? '<div class="panel"><div class="panel-h"><h2>关联单据</h2><span class="hint">' + esc(app.id) + '</span></div><div class="panel-b">' +
      '<dl class="kv"><dt>类型</dt><dd>' + esc(app.type) + ' · ' + levelTag(app.level) + '</dd><dt>申请人</dt><dd>' + esc(app.applicantUser.name) + '</dd>' +
      '<dt>事由</dt><dd>' + esc(app.reason) + '</dd><dt>状态</dt><dd>' + esc(app.status) + '</dd></dl>' +
      '<div class="actions" style="margin-top:10px"><button class="btn sm" data-go="/apps/' + app.id + '">查看审批链</button></div>' +
      '</div></div>' : '';

    var warn = r.breakthrough ? '<div class="banner warn"><div><b>突破禁用：</b>该功能点已被本分公司禁用（' +
      esc((r.relatedDeltas || []).filter(function (d) { return d.type === 'DENY'; }).map(function (d) { return d.reason; })[0] || '') +
      '），当前通过例外授予生效，已进入审计清单。</div></div>' : '';

    var logs = (MOCK.logs || []).filter(function (l) { return l.target === u.name || l.appId === (app && app.id); }).slice(0, 3);
    var logPanel = logs.length ? '<div class="panel" style="margin-top:14px"><div class="panel-h"><h2>相关审计记录</h2><span class="hint">只写不可删</span></div><div class="panel-b flush">' +
      '<table class="tbl"><thead><tr><th>时间</th><th>类型</th><th>操作人</th><th>摘要</th></tr></thead><tbody>' +
      logs.map(function (l) {
        return '<tr style="cursor:pointer" data-go="/audit/' + l.id + '"><td class="num">' + l.at + '</td><td>' + esc(l.type) + '</td><td>' + esc(l.actor) + '</td><td>' + esc(l.summary) + '</td></tr>';
      }).join('') + '</tbody></table></div></div>' : '';

    return head(f.name, esc(f.sysName) + ' · ' + esc(f.mod) + ' · ' + levelTag(f.level),
      esc(u.name) + ' · ' + esc(u.account) + ' · ' + esc(u.roleName), '/perms') +
      warn +
      '<div class="grid-2"><div class="panel"><div class="panel-h"><h2>判定过程</h2><span class="hint">模板 → 分公司 → 部门 → 例外</span></div>' +
      '<div class="panel-b"><div class="steps">' + stepHtml + '</div></div></div>' +
      '<div class="stack"><div class="panel"><div class="panel-h"><h2>权限信息</h2></div><div class="panel-b"><dl class="kv">' + info + '</dl></div></div>' +
      appPanel + '</div></div>' + logPanel;
  }

  /* ---------- 角色 ---------- */
  async function viewRoles() {
    var res = await Api.listRoles();
    var rows = res.data.map(function (r) {
      return '<tr style="cursor:pointer" data-go="/roles/' + r.id + '"><td><div class="who">' + esc(r.name) + '</div><div class="num">' + r.id + '</div></td>' +
        '<td>' + r.members + '</td><td>' + r.fnCount + ' / 359</td><td>' + r.ratio + '%</td></tr>';
    }).join('');
    return head('角色与权限', '5 个角色模板来自权限清单，54 个岗位通过映射表落入模板。点击查看每个模板的功能点与操作位。',
      '18 个系统 / 359 个功能点 / 5 个模板') +
      '<div class="panel"><div class="panel-h"><h2>角色模板</h2><span class="hint">人数按 54 个岗位映射</span></div><div class="panel-b flush">' +
      '<table class="tbl"><thead><tr><th>角色</th><th>人数</th><th>可访问功能点</th><th>覆盖</th></tr></thead><tbody>' + rows + '</tbody></table>' +
      '</div></div>';
  }

  async function viewRoleDetail(id) {
    var res = await Api.getRole(id);
    if (res.code !== 0) { return head('未找到', esc(res.message)); }
    var role = res.data.role, rows = res.data.rows;
    var bySys = {};
    rows.forEach(function (r) { (bySys[r.fn.sysName] = bySys[r.fn.sysName] || []).push(r); });
    var blocks = Object.keys(bySys).map(function (sys) {
      var list = bySys[sys];
      var on = list.filter(function (x) { return x.ops.length; }).length;
      return '<div class="pick" style="margin-bottom:10px"><div class="pick-h"><span>' + esc(sys) + '</span><span class="muted">可访问 ' + on + ' / ' + list.length + '</span></div>' +
        list.map(function (x) {
          return '<div class="pick-row"><span style="flex:1">' + esc(x.fn.name) + ' ' + levelTag(x.fn.level) + '</span>' + opsHtml(x.ops) + '</div>';
        }).join('') + '</div>';
    }).join('');
    return head(role.name, '共 ' + role.fnCount + ' 个功能点，覆盖 ' + role.ratio + '% · ' + esc(role.posts),
      '操作位固定五个：查看 / 新增 / 编辑 / 审批 / 导出', '/roles') +
      '<div class="banner"><div><b>保存影响：</b>该模板当前绑定 ' + role.members + ' 人，任何勾选变更都会立即失效缓存并踢出会话。</div></div>' +
      blocks +
      '<div class="actions" style="justify-content:flex-end"><button class="btn" data-act="history">变更历史</button><button class="btn pri" data-act="save">保存更改</button></div>';
  }

  /* ---------- 申请 ---------- */
  async function viewApps() {
    var res = await Api.listApplications({ applicant: state.me });
    var rows = res.data.map(function (a) {
      return '<tr style="cursor:pointer" data-go="/apps/' + a.id + '"><td><div class="who">' + esc(a.fnDetail.name) + '</div><div class="num">' + a.id + '</div></td>' +
        '<td>' + esc(a.type) + '</td><td>' + levelTag(a.level) + '</td><td>' + esc(a.status) + '</td><td class="num">' + esc(a.submitted) + '</td></tr>';
    }).join('');
    return head('我的申请', '看得到当前停在哪一级、审批人是谁、依据是什么。点击任意单据查看审批链。', '覆盖 4.6.3 / 5.3') +
      '<div class="panel"><div class="panel-h"><h2>申请记录</h2><span class="hint">共 ' + res.data.length + ' 条</span></div><div class="panel-b flush">' +
      '<table class="tbl"><thead><tr><th>申请内容</th><th>类型</th><th>敏感级</th><th>状态</th><th>提交时间</th></tr></thead><tbody>' + rows + '</tbody></table></div></div>';
  }

  async function viewAppDetail(id) {
    var res = await Api.getApplication(id);
    if (res.code !== 0) { return head('未找到', esc(res.message)); }
    var a = res.data;
    var chain = a.chain.map(function (c, i) {
      var st = c.result.indexOf('待处理') >= 0 ? 'cur' : (c.result.indexOf('未开始') >= 0 ? '' : 'done');
      return '<div class="step ' + st + '"><div class="dot">' + (st === 'done' ? '✓' : (i + 1)) + '</div><div>' +
        '<div class="s-t">' + esc(c.title) + ' · ' + esc(c.name) + '</div>' +
        '<div class="s-d">' + esc(c.result) + (c.at ? ' · ' + c.at : '') + '</div>' +
        '<div class="s-n">' + esc(c.basis) + '</div></div></div>';
    }).join('');
    var actions = a.status === '审批中' && a.current === state.me
      ? '<div class="actions" style="justify-content:flex-end"><button class="btn" data-act="forward">转办</button><button class="btn danger" data-act="reject" data-id="' + a.id + '">驳回</button><button class="btn pri" data-act="approve" data-id="' + a.id + '">同意</button></div>'
      : '';
    return head(a.fnDetail.name, esc(a.type) + ' · ' + levelTag(a.level) + ' · ' + esc(a.status), '单号 ' + a.id, '/apps') +
      (a.breakthrough ? '<div class="banner warn"><div><b>突破禁用：</b>该申请命中了本分公司禁用项，批准后将记录为突破禁用授权。</div></div>' : '') +
      '<div class="grid-2"><div class="panel"><div class="panel-h"><h2>审批链</h2><span class="hint">最多两级 · L3 三级</span></div><div class="panel-b"><div class="steps">' + chain + '</div></div></div>' +
      '<div class="stack"><div class="panel"><div class="panel-h"><h2>申请内容</h2></div><div class="panel-b">' +
      '<dl class="kv"><dt>申请人</dt><dd>' + esc(a.applicantUser.name) + ' · ' + esc(a.applicantUser.account) + '</dd>' +
      '<dt>部门</dt><dd>' + esc(a.applicantUser.dept) + '</dd>' +
      '<dt>功能点</dt><dd>' + esc(a.fnDetail.sysName) + ' · ' + esc(a.fnDetail.name) + '</dd>' +
      '<dt>操作</dt><dd>' + opsHtml(a.ops) + '</dd>' +
      '<dt>事由</dt><dd>' + esc(a.reason) + '</dd>' +
      '<dt>生效方式</dt><dd>' + esc(a.effective) + '</dd></dl>' + actions + '</div></div></div></div>';
  }

  async function viewApprovals() {
    var res = await Api.listApplications({ current: state.me });
    if (!res.data.length) {
      return head('待我审批', '当前没有需要你处理的单据。', '覆盖 4.6.4.5') +
        '<div class="panel"><div class="panel-b"><div class="muted">待办为空。新单据到达时会通过站内信与邮件提醒。</div></div></div>';
    }
    var rows = res.data.map(function (a) {
      return '<tr style="cursor:pointer" data-go="/apps/' + a.id + '"><td><div class="who">' + esc(a.applicantUser.name) + ' · ' + esc(a.fnDetail.name) + '</div><div class="num">' + a.id + '</div></td>' +
        '<td>' + esc(a.type) + '</td><td>' + levelTag(a.level) + '</td><td>' + (a.breakthrough ? '<span class="tag deny">突破禁用</span>' : '<span class="muted">—</span>') + '</td>' +
        '<td class="num">' + esc(a.submitted) + '</td></tr>';
    }).join('');
    return head('待我审批', '按当前身份过滤的待办。点开可看到"为什么派给我"和申请人现状。', '节点停留超 48 小时仅提醒，不自动通过') +
      '<div class="panel"><div class="panel-h"><h2>待办</h2><span class="hint">' + res.data.length + ' 条</span></div><div class="panel-b flush">' +
      '<table class="tbl"><thead><tr><th>申请人 / 内容</th><th>类型</th><th>敏感级</th><th>标记</th><th>提交时间</th></tr></thead><tbody>' + rows + '</tbody></table></div></div>';
  }

  async function viewApply() {
    var systems = [['OA', 'OA协同办公系统'], ['PA', '移动巡检APP'], ['PM', '工程项目管理系统(PMIS)'], ['FIN', '财务管理系统'], ['HR', '人力资源管理系统']];
    var ops = ['查看', '新增', '编辑', '审批', '导出'];
    return head('提交权限申请', '选系统、功能点与操作，系统按敏感级生成审批链；提交后单据进入暂存，审批通过即写入权限台账。', '覆盖 4.6.1 / 4.6.4') +
      '<div class="grid-2"><div class="panel"><div class="panel-h"><h2>申请内容</h2><span class="hint">一张单只含一个业务系统</span></div><div class="panel-b">' +
      '<div class="field"><label>业务系统</label><select class="inp" id="apSys">' +
      systems.map(function (s) { return '<option value="' + s[0] + '">' + s[1] + '</option>'; }).join('') + '</select></div>' +
      '<div class="field"><label>功能点</label><div class="pick" id="apList" style="max-height:250px;overflow:auto"></div></div>' +
      '<div class="field"><label>申请操作 <span class="need">*</span></label><div class="radio-row">' +
      ops.map(function (o) { return '<label><input type="checkbox" name="apOp" value="' + o + '"> ' + o + '</label>'; }).join('') + '</div></div>' +
      '<div class="field"><label>申请事由 <span class="need">*</span></label><textarea class="inp" id="apReason" placeholder="说明为什么需要；命中禁用项时须说明原因"></textarea></div>' +
      '<div class="field"><label>生效方式</label><div class="radio-row"><label><input type="radio" name="e" checked> 审批通过即生效</label><label><input type="radio" name="e"> 指定日期起生效</label></div></div>' +
      '<div class="actions" style="justify-content:flex-end"><button class="btn" data-act="draft">保存草稿</button><button class="btn pri" id="apSubmit">提交申请</button></div>' +
      '</div></div><div class="stack"><div class="panel"><div class="panel-h"><h2>审批链怎么来</h2><span class="hint">按敏感级</span></div><div class="panel-b">' +
      '<table class="tbl tight"><thead><tr><th>敏感级</th><th>审批链</th></tr></thead><tbody>' +
      '<tr><td>' + levelTag('L1') + '</td><td>部门负责人</td></tr>' +
      '<tr><td>' + levelTag('L2') + '</td><td>部门负责人 → 分公司管理员</td></tr>' +
      '<tr><td>' + levelTag('L3') + '</td><td>部门负责人 → 分公司管理员 → 总公司管理员</td></tr>' +
      '</tbody></table><div class="muted" style="margin-top:8px">审批人由部门信息表的"部门经理"自动解析，申请人不能指定。</div></div></div>' +
      '<div class="panel"><div class="panel-h"><h2>提交后会发生什么</h2></div><div class="panel-b"><ul style="margin:0;padding-left:18px;font-size:12.5px;color:var(--ink-2)">' +
      '<li>单据写入本地暂存，出现在"我的申请"</li><li>当前审批人登录后可在"待我审批"处理</li><li>末节点同意后，权限自动写入台账并标记来源</li></ul></div></div>' +
      '</div></div>';
  }

  /* ---------- 差量 ---------- */
  async function viewDiff() {
    var res = await Api.listDeltas({});
    var rows = res.data.map(function (d) {
      return '<tr><td><div class="who">' + esc(d.fnDetail.name) + '</div><div class="num">' + esc(d.fnDetail.sysName) + '</div></td>' +
        '<td>' + (d.level === 'COMPANY' ? '<span class="tag mute">分公司</span>' : '<span class="tag pend">部门</span>') + '</td>' +
        '<td>' + esc(d.dept || d.post) + '</td>' +
        '<td>' + (d.type === 'ADD' ? '<span class="pm plus">+ ' + d.ops.join('/') + '</span>' : '<span class="pm minus">− ' + d.ops.join('/') + '</span>') + '</td>' +
        '<td class="muted">' + esc(d.reason) + '</td></tr>';
    }).join('');
    return head('分公司与部门差量', '差量分两级：总公司维护分公司级，分公司维护部门级；只记录增与禁，主体是岗位。', '作用域 = 分公司 × 部门 × 岗位') +
      '<div class="panel" style="margin-bottom:14px"><div class="panel-b" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">' +
      '<span class="scope-k">作用域</span><select class="inp" style="width:170px"><option>道路工程分公司</option></select><span class="fop">×</span>' +
      '<select class="inp" style="width:170px"><option>第一项目经理部</option></select><span class="fop">×</span>' +
      '<select class="inp" style="width:130px"><option>技术员</option></select>' +
      '<span class="chip">映射模板：普通员工</span><span class="muted" style="margin-left:auto">分公司级由总公司维护，部门级由本分公司维护</span></div></div>' +
      '<div class="panel"><div class="panel-h"><h2>差量台账</h2><span class="hint">' + res.data.length + ' 条</span></div><div class="panel-b flush">' +
      '<table class="tbl"><thead><tr><th>功能点</th><th>层级</th><th>作用对象</th><th>调整</th><th>理由</th></tr></thead><tbody>' + rows + '</tbody></table></div></div>';
  }

  /* ---------- 项目 ---------- */
  async function viewProjects() {
    var res = await Api.listProjects();
    var rows = res.data.map(function (p) {
      return '<tr style="cursor:pointer" data-go="/projects/' + p.id + '"><td><div class="who">' + esc(p.name) + '</div><div class="num">' + p.id + '</div></td>' +
        '<td>' + esc(p.dept) + '</td><td>' + esc(p.lead) + '</td><td class="num">' + esc(p.start) + ' ~ ' + esc(p.end) + '</td>' +
        '<td>' + (p.status === '进行中' ? '<span class="tag grant">' + esc(p.status) + '</span>' : '<span class="tag mute">' + esc(p.status) + '</span>') + '</td></tr>';
    }).join('');
    return head('项目权限', '外包与外部人员不进组织架构，权限只到"项目 → 项目角色 → 项目资源"。项目结束，账号立即失效。', 'UserSource = 外包 / 外部') +
      '<div class="banner"><div><b>边界：</b>外包账号不出现在组织树与部门人数中；项目内增删成员免审批，扩大资源范围需走审批。</div></div>' +
      '<div class="panel"><div class="panel-h"><h2>项目清单</h2><span class="hint">' + res.data.length + ' 个</span></div><div class="panel-b flush">' +
      '<table class="tbl"><thead><tr><th>项目</th><th>归属部门</th><th>团队负责人</th><th>周期</th><th>状态</th></tr></thead><tbody>' + rows + '</tbody></table></div></div>';
  }

  async function viewProjectDetail(id) {
    var res = await Api.getProject(id);
    if (res.code !== 0) { return head('未找到', esc(res.message)); }
    var p = res.data.project, members = res.data.members, resources = res.data.resources;
    var mRows = members.map(function (m) {
      return '<tr><td class="who">' + esc(m.user.name) + '</td><td>' + esc(m.org) + '</td><td>' + esc(m.role) + '</td>' +
        '<td class="num">' + esc(m.expire) + '</td><td>' + (m.status === '正常' ? '<span class="tag grant">正常</span>' : '<span class="tag mute">' + esc(m.status) + '</span>') + '</td></tr>';
    }).join('');
    var rRows = resources.map(function (r) {
      return '<tr><td><div class="who">' + esc(r.fnDetail.name) + '</div><div class="num">' + esc(r.type) + '</div></td>' +
        '<td>' + levelTag(r.level) + '</td><td>' + (r.granted ? '<span class="tag grant">已授权</span>' : '<span class="tag mute">未授权</span>') + '</td></tr>';
    }).join('');
    return head(p.name, '归属 ' + esc(p.dept) + ' · 负责人 ' + esc(p.lead) + ' · ' + esc(p.start) + ' ~ ' + esc(p.end),
      '项目状态：' + esc(p.status) + ' · 团队 ' + members.length + ' 人', '/projects') +
      '<div class="grid-2"><div class="panel"><div class="panel-h"><h2>项目成员</h2><span class="hint">有效期随项目</span></div><div class="panel-b flush">' +
      '<table class="tbl"><thead><tr><th>姓名</th><th>外包公司</th><th>项目角色</th><th>有效期</th><th>状态</th></tr></thead><tbody>' + mRows + '</tbody></table></div></div>' +
      '<div class="stack"><div class="panel"><div class="panel-h"><h2>项目资源</h2><span class="hint">授权对象</span></div><div class="panel-b flush">' +
      '<table class="tbl tight"><thead><tr><th>资源</th><th>敏感级</th><th>状态</th></tr></thead><tbody>' + rRows + '</tbody></table></div></div>' +
      '<div class="panel"><div class="panel-b"><div class="muted">结项或成员移除后账号与会话立即失效，不存在"项目已结束但仍可登录"的窗口。</div>' +
      '<div class="actions" style="margin-top:10px;justify-content:flex-end"><button class="btn" data-act="remove">移除成员</button><button class="btn pri" data-act="add">添加成员</button></div></div></div></div></div>';
  }

  /* ---------- 组织 ---------- */
  async function viewOrg() {
    var ids = ['xuefeng', 'xuefu', 'zenglu', 'luxiaochao', 'shenxiang', 'wangui', 'liyong'];
    var rows = ids.map(function (id) {
      var u = MOCK.users[id];
      return '<tr style="cursor:pointer" data-go="/org/' + id + '"><td class="who">' + esc(u.name) + '</td><td class="num">' + esc(u.account) + '</td>' +
        '<td>' + esc(u.company) + '</td><td>' + esc(u.dept) + '</td><td>' + esc(u.post) + '</td><td><span class="tag mute">' + esc(u.roleName) + '</span></td></tr>';
    }).join('');
    var tree = ['综合办公室 · 卢晓超 · 18 人', '财务部 · 郭健 · 18 人', '工程技术部 · 卢敏 · 18 人', '安全质量部 · 姚文康 · 18 人',
      '物资设备部 · 梁志春 · 18 人', '市场经营部 · 范旭 · 18 人', '第一项目经理部 · 沈祥 · 250 人', '第二项目经理部 · 邓萍旭 · 250 人',
      '第三项目经理部 · 向秀 · 250 人', '第四项目经理部 · 段成 · 250 人'].map(function (t) {
      return '<div class="t2">' + esc(t) + '</div>';
    }).join('');
    return head('组织与账号', '内部员工来自 HR 同步；外包与外部人员不写入人事表，只在项目视图下可见。', '10 分公司 / 111 部门 / 10,000 人') +
      '<div class="grid-2" style="grid-template-columns:340px minmax(0,1fr)"><div class="panel"><div class="panel-h"><h2>道路工程分公司</h2><span class="hint">1,090 人</span></div><div class="panel-b"><div class="tree">' + tree + '</div></div></div>' +
      '<div class="panel"><div class="panel-h"><h2>人员样例</h2><span class="hint">点击查看详情</span></div><div class="panel-b flush">' +
      '<table class="tbl tight"><thead><tr><th>姓名</th><th>用户名</th><th>分公司</th><th>部门</th><th>岗位</th><th>角色</th></tr></thead><tbody>' + rows + '</tbody></table></div></div></div>';
  }

  async function viewUserDetail(uid) {
    var res = await Api.getUser(uid);
    if (res.code !== 0) { return head('未找到', esc(res.message)); }
    var u = res.data;
    var isSelf = uid === state.me;
    return head(u.name, esc(u.company || u.org) + ' · ' + esc(u.dept || u.projectId || '') + ' · ' + esc(u.post),
      'UserSource = ' + u.source + ' · 状态 ' + u.status, '/org') +
      '<div class="grid-2"><div class="panel"><div class="panel-h"><h2>账号信息</h2></div><div class="panel-b"><dl class="kv">' +
      '<dt>用户名</dt><dd>' + esc(u.account) + '</dd><dt>人员类型</dt><dd>' + u.source + '</dd>' +
      '<dt>所属单位</dt><dd>' + esc(u.company || u.org) + '</dd><dt>部门</dt><dd>' + esc(u.dept || '—（项目制）') + '</dd>' +
      '<dt>岗位</dt><dd>' + esc(u.post) + '</dd><dt>角色模板</dt><dd>' + esc(u.roleName) + '</dd>' +
      '<dt>电话</dt><dd>' + esc(u.phone || '—') + '</dd><dt>有效期</dt><dd>' + esc(u.expire || '随在职') + '</dd>' +
      '</dl></div></div>' +
      '<div class="panel"><div class="panel-h"><h2>权限概览</h2><span class="hint">' + (isSelf ? '点击进入台账' : '仅摘要') + '</span></div><div class="panel-b">' +
      '<div class="muted">' + (isSelf ? '查看自己的完整台账与判定过程。' : '按 4.5.4，部门负责人只能看到系统级汇总，不展开功能点明细。') + '</div>' +
      (isSelf ? '<div class="actions" style="margin-top:10px"><button class="btn sm" data-go="/perms">打开我的权限</button></div>' : '') +
      '</div></div></div>';
  }

  /* ---------- 审计 ---------- */
  async function viewAudit() {
    var res = await Api.listLogs({});
    var rows = res.data.map(function (l) {
      return '<tr style="cursor:pointer" data-go="/audit/' + l.id + '"><td class="num">' + l.at + '</td><td>' + esc(l.type) + '</td>' +
        '<td class="who">' + esc(l.actor) + '</td><td>' + esc(l.summary) + (l.anomaly ? ' <span class="tag deny">异常</span>' : '') + '</td><td class="num">' + l.ip + '</td></tr>';
    }).join('');
    return head('审计日志', '只写不可删。任何角色都没有删除入口，突破禁用的每一笔都能追到单号。', '在线 ≥ 1 年 · 归档 ≥ 3 年') +
      '<div class="banner deny"><div><b>只读：</b>导出需单独审批，导出行为本身也会留痕。</div></div>' +
      '<div class="panel"><div class="panel-h"><h2>操作记录</h2><span class="hint">' + res.data.length + ' 条</span></div><div class="panel-b flush">' +
      '<table class="tbl"><thead><tr><th>时间</th><th>类型</th><th>操作人</th><th>对象 / 变更</th><th>来源 IP</th></tr></thead><tbody>' + rows + '</tbody></table></div></div>';
  }

  async function viewLogDetail(id) {
    var res = await Api.getLog(id);
    if (res.code !== 0) { return head('未找到', esc(res.message)); }
    var l = res.data;
    return head('日志详情', esc(l.type) + ' · ' + esc(l.at), '只读记录，不可删除', '/audit') +
      '<div class="grid-2"><div class="panel"><div class="panel-h"><h2>变更前后</h2></div><div class="panel-b">' +
      '<table class="tbl tight"><thead><tr><th>对象</th><th>变更前</th><th>变更后</th></tr></thead><tbody><tr>' +
      '<td>' + esc(l.target) + '</td><td class="muted">' + esc(l.before) + '</td><td><span class="tag except">' + esc(l.after) + '</span></td>' +
      '</tr></tbody></table></div></div>' +
      '<div class="panel"><div class="panel-h"><h2>记录信息</h2></div><div class="panel-b"><dl class="kv">' +
      '<dt>操作人</dt><dd>' + esc(l.actor) + '</dd><dt>来源 IP</dt><dd>' + esc(l.ip) + '</dd>' +
      '<dt>摘要</dt><dd>' + esc(l.summary) + '</dd>' +
      '</dl>' + (l.appId ? '<div class="actions" style="margin-top:10px"><button class="btn sm" data-go="/apps/' + l.appId + '">查看关联单据</button></div>' : '') +
      '</div></div></div>';
  }

  /* ---------- 路由 ---------- */
  var ROUTES = [
    { re: /^\/perms$/, view: viewPerms, screen: 'perms' },
    { re: /^\/perms\/([\w-]+)$/, view: viewPermDetail, screen: 'perms' },
    { re: /^\/apply$/, view: viewApply, screen: 'apply' },
    { re: /^\/apps$/, view: viewApps, screen: 'apps' },
    { re: /^\/apps\/([\w-]+)$/, view: viewAppDetail, screen: 'apps' },
    { re: /^\/approvals$/, view: viewApprovals, screen: 'approvals' },
    { re: /^\/roles$/, view: viewRoles, screen: 'roles' },
    { re: /^\/roles\/([\w-]+)$/, view: viewRoleDetail, screen: 'roles' },
    { re: /^\/diff$/, view: viewDiff, screen: 'diff' },
    { re: /^\/projects$/, view: viewProjects, screen: 'projects' },
    { re: /^\/projects\/([\w-]+)$/, view: viewProjectDetail, screen: 'projects' },
    { re: /^\/org$/, view: viewOrg, screen: 'org' },
    { re: /^\/org\/([\w-]+)$/, view: viewUserDetail, screen: 'org' },
    { re: /^\/audit$/, view: viewAudit, screen: 'audit' },
    { re: /^\/audit\/([\w-]+)$/, view: viewLogDetail, screen: 'audit' }
  ];

  function buildNav() {
    var nav = el('nav');
    nav.innerHTML = '';
    NAV.forEach(function (g) {
      var items = g.items.filter(function (i) { return state.identity.screens.indexOf(i.s) >= 0; });
      if (!items.length) { return; }
      var box = document.createElement('div');
      box.className = 'nav-g';
      box.innerHTML = '<div class="nav-t">' + g.g + '</div>' + items.map(function (i) {
        return '<button class="nav-i" data-path="' + i.path + '">' + i.label + '</button>';
      }).join('');
      nav.appendChild(box);
    });
  }

  function markNav(path) {
    var base = '/' + (path.split('/')[1] || '');
    document.querySelectorAll('.nav-i').forEach(function (b) {
      var p = b.getAttribute('data-path');
      if (p === base || (base === '/perms' && p === '/perms')) { b.setAttribute('aria-current', 'true'); }
      else { b.removeAttribute('aria-current'); }
    });
  }

  async function route() {
    if (!state.identity) { return; }
    var path = location.hash.replace(/^#/, '') || '/perms';
    var hit = null, args = [];
    for (var i = 0; i < ROUTES.length; i++) {
      var m = path.match(ROUTES[i].re);
      if (m) { hit = ROUTES[i]; args = m.slice(1); break; }
    }
    if (!hit) { location.hash = '#/perms'; return; }
    if (state.identity.screens.indexOf(hit.screen) < 0) {
      location.hash = '#' + navDefault();
      return;
    }
    markNav(path);
    el('view').innerHTML = '<div class="muted" style="padding:24px 4px">载入中…</div>';
    try {
      var html = await hit.view.apply(null, args);
      el('view').innerHTML = html;
      bindView(path);
      window.scrollTo(0, 0);
    } catch (err) {
      el('view').innerHTML = '<div class="banner deny" style="margin:20px 0"><div><b>页面渲染失败：</b>' + esc(err.message) + '</div></div>';
      console.error(err);
    }
  }

  function navDefault() {
    var first = null;
    NAV.forEach(function (g) {
      g.items.forEach(function (i) {
        if (!first && state.identity.screens.indexOf(i.s) >= 0) { first = i.path; }
      });
    });
    return first || '/perms';
  }

  /* ---------- 登录 ---------- */
  function renderLogin() {
    document.body.classList.add('is-login');
    document.querySelectorAll('.nav-i').forEach(function (b) { b.removeAttribute('aria-current'); });
    el('whoName').textContent = '未登录';
    el('whoRole').textContent = '';
    el('view').innerHTML =
      '<div class="login-wrap"><div class="login-side"><div>' +
      '<div class="brand" style="border:0;padding:0"><div class="mark">权</div><div><div class="b-name">统一权限中心</div><div class="b-sub">市政公司</div></div></div>' +
      '<h1>一个工号，通行全部业务系统</h1>' +
      '<p>内部员工按岗位模板授权，外包团队按项目授权。登录后只能看到与身份匹配的菜单，权限变更经审批后生效。</p>' +
      '</div><div style="font-size:12px;color:#8b959d;line-height:1.9">10,000 员工 · 111 部门 · 18 系统 · 359 功能点<br>演示环境：登录态与申请单据暂存于浏览器本地</div></div>' +
      '<div class="login-form"><h2>登录</h2><div class="sub">账号为工号，初始密码 123456</div>' +
      '<div id="lgErr" class="lg-err" hidden></div>' +
      '<label class="lg-label">工号</label><input id="lgAcc" class="inp" placeholder="SG000292" autocomplete="username">' +
      '<label class="lg-label">密码</label><input id="lgPwd" class="inp" type="password" placeholder="••••••" autocomplete="current-password">' +
      '<button class="btn pri" id="lgBtn" style="margin-top:8px;justify-content:center;padding:8px">登录</button>' +
      '<div class="login-note">连续失败 5 次锁定 15 分钟；会话当日 23:59 失效。</div>' +
      '<div class="rule"></div><div class="sec-t">演示账号（点击填入）</div><div id="lgList"></div></div></div>';

    Api.listIdentities().then(function (res) {
      var box = el('lgList');
      res.data.forEach(function (i) {
        var d = document.createElement('div');
        d.className = 'acct';
        d.innerHTML = '<span>' + i.label + '</span><span class="n">' + i.account + '</span>';
        d.addEventListener('click', function () {
          el('lgAcc').value = i.account;
          el('lgPwd').value = '123456';
          el('lgPwd').focus();
        });
        box.appendChild(d);
      });
    });

    el('lgBtn').addEventListener('click', doLogin);
    el('lgPwd').addEventListener('keydown', function (e) { if (e.key === 'Enter') { doLogin(); } });
    el('lgAcc').focus();
  }

  async function doLogin() {
    var acc = el('lgAcc').value.trim();
    var pwd = el('lgPwd').value;
    var res = await Api.login(acc, pwd);
    if (res.code !== 0) {
      var e = el('lgErr'); e.hidden = false; e.textContent = res.message;
      return;
    }
    document.body.classList.remove('is-login');
    boot(res.data);
  }

  function boot(s) {
    state.me = s.userId;
    state.identity = s.identity;
    state.user = s.user;
    el('whoName').textContent = s.user.name + ' · ' + s.user.account;
    el('whoRole').textContent = s.identity.role;
    buildNav();
    if (!location.hash || location.hash === '#/login') { location.hash = '#' + navDefault(); }
    route();
  }

  function bindApply() {
    var sel = el('apSys');
    if (!sel) { return; }
    function list() {
      var sys = sel.value;
      var keys = Object.keys(MOCK.functions).filter(function (k) { return MOCK.functions[k].sys === sys; });
      el('apList').innerHTML = keys.map(function (k) {
        var f = MOCK.functions[k];
        return '<label class="pick-row" style="cursor:pointer"><input type="radio" name="apFn" value="' + k + '"><span style="flex:1">' + esc(f.name) + ' ' + levelTag(f.level) + '</span><span class="code">' + f.mod + '</span></label>';
      }).join('');
    }
    sel.onchange = list;
    list();
    el('apSubmit').onclick = async function () {
      var fn = document.querySelector('input[name=apFn]:checked');
      if (!fn) { toast('请选择一个功能点'); return; }
      var ops = Array.prototype.slice.call(document.querySelectorAll('input[name=apOp]:checked')).map(function (x) { return x.value; });
      if (!ops.length) { toast('请至少选择一个操作'); return; }
      var res = await Api.submitApplication({ applicant: state.me, fn: fn.value, ops: ops, reason: el('apReason').value });
      if (res.code !== 0) { toast(res.message); return; }
      toast('已提交 ' + res.data.id + '，等待审批');
      location.hash = '#/apps/' + res.data.id;
    };
  }

  function bindView(path) {
    if (path === '/apply') { bindApply(); }
  }

  document.addEventListener('click', async function (e) {
    var go = e.target.closest('[data-go]');
    if (go) { location.hash = '#' + go.getAttribute('data-go'); return; }
    var nav = e.target.closest('[data-path]');
    if (nav) { location.hash = '#' + nav.getAttribute('data-path'); return; }
    var act = e.target.closest('[data-act]');
    if (!act) { return; }
    var a = act.getAttribute('data-act');
    var id = act.getAttribute('data-id');
    if (a === 'approve' || a === 'reject') {
      var comment = '';
      if (a === 'reject') {
        comment = window.prompt('请填写驳回原因');
        if (comment === null) { return; }
      }
      var res = await Api.decideApplication(id, a, comment);
      if (res.code !== 0) { toast(res.message); return; }
      toast(a === 'approve' ? '已同意' + (res.data.status === '已生效' ? '，授权已生效' : '，进入下一节点') : '已驳回');
      route();
      return;
    }
    if (a === 'save') { toast('原型演示：已保存（未接后端）'); }
    else if (a === 'forward') { toast('原型演示：转办给上级'); }
    else if (a === 'history') { toast('原型演示：变更历史待接入'); }
    else if (a === 'add' || a === 'remove') { toast('原型演示：仅在项目资源范围内生效'); }
  });

  el('logout').addEventListener('click', async function () {
    await Api.logout();
    state.me = null;
    state.identity = null;
    state.user = null;
    location.hash = '';
    renderLogin();
  });

  window.addEventListener('hashchange', route);

  (async function init() {
    var d = await Api.dict();
    state.dict = d.data;
    var login = new URLSearchParams(location.search).get('login');
    if (login) { await Api.login(login, '123456'); }
    var s = await Api.getSession();
    if (s.code !== 0) { renderLogin(); return; }
    boot(s.data);
  })();
})();
