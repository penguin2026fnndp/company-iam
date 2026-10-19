/* RBAC0 原型 v0.6：路由与页面渲染。
   权限不再写死在账号上，菜单、页面、按钮全部由“角色-权限”实时计算。 */
(function () {
  var state = {
    user: null,
    roles: [],
    permCodes: [],
    menus: [],
    dict: null,
    userQ: '',
    roleQ: '',
    permQ: '',
    permSys: '',
    editUserId: null,
    editRoleId: null
  };

  var ROUTES = [
    { re: /^\/perms$/, view: viewPerms, perm: 'ME:VIEW' },
    { re: /^\/report$/, view: viewReport, perm: 'FIN:RPT:VIEW' },
    { re: /^\/users$/, view: viewUsers, perm: 'USER:VIEW' },
    { re: /^\/users\/(\d+)$/, view: viewUser, perm: 'USER:VIEW' },
    { re: /^\/roles$/, view: viewRoles, perm: 'ROLE:VIEW' },
    { re: /^\/roles\/(\d+)$/, view: viewRole, perm: 'ROLE:VIEW' },
    { re: /^\/permissions$/, view: viewPermissions, perm: 'PERM:VIEW' }
  ];

  /* ---------- 基础工具 ---------- */
  function el(id) { return document.getElementById(id); }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function has(code) { return state.permCodes.indexOf(code) >= 0; }

  function tag(text, cls) {
    return '<span class="tag ' + (cls || 'mute') + '">' + esc(text) + '</span>';
  }

  function statusTag(status) {
    return Number(status) === 1 ? tag('启用', 'grant') : tag('停用', 'deny');
  }

  function roleTags(names) {
    if (!names || !names.length) { return '<span class="muted">无角色</span>'; }
    return names.map(function (n) { return tag(n, 'pend'); }).join(' ');
  }

  function codeTag(code) {
    return '<span class="perm-code">' + esc(code) + '</span>';
  }

  function head(title, lead, cov, back) {
    return '<div class="screen-h">' +
      (back ? '<div class="actions" style="margin-bottom:9px"><button class="btn sm" data-go="' + back + '">← 返回</button></div>' : '') +
      '<h1>' + esc(title) + '</h1>' +
      (lead ? '<p class="lead">' + lead + '</p>' : '') +
      (cov ? '<div class="cov">' + cov + '</div>' : '') +
      '</div>';
  }

  function toast(msg) {
    var d = document.createElement('div');
    d.className = 'banner';
    d.style.cssText = 'position:fixed;left:50%;bottom:26px;transform:translateX(-50%);z-index:99;box-shadow:0 6px 20px rgba(0,0,0,.12)';
    d.textContent = msg;
    document.body.appendChild(d);
    setTimeout(function () { d.remove(); }, 2400);
  }

  function errorView(res) {
    return head('操作失败', '') +
      '<div class="banner deny"><div>' + esc(res.message) + '</div></div>';
  }

  function roleNamesOf(roleList) {
    return (roleList || []).map(function (r) { return r.name; });
  }

  /* ---------- 登录 ---------- */
  function renderLogin() {
    document.body.classList.add('is-login');
    el('whoName').textContent = '未登录';
    el('whoRole').textContent = '';
    el('sessChip').textContent = '会话未建立';
    el('nav').innerHTML = '';

    el('view').innerHTML =
      '<div class="login-wrap"><div class="login-side"><div>' +
      '<div class="brand" style="border:0;padding:0"><div class="mark">权</div><div><div class="b-name">统一权限中心</div><div class="b-sub">市政公司 · RBAC0 原型 v0.6</div></div></div>' +
      '<h1>一个工号，通行全部业务系统</h1>' +
      '<p>账号不直接拥有权限。用户先分配角色，角色再绑定“功能点 × 操作”，登录后由系统实时算出菜单和接口权限。</p>' +
      '</div><div style="font-size:12px;color:#8b959d;line-height:1.9">本次范围：RBAC0<br>用户 / 角色 / 权限 / 用户角色 / 角色权限 / 会话<br>演示数据保存在浏览器本地</div></div>' +
      '<div class="login-form"><h2>登录</h2><div class="sub">账号为工号，演示密码 123456</div>' +
      '<div id="lgErr" class="lg-err" hidden></div>' +
      '<label class="lg-label">工号</label><input id="lgAcc" class="inp" placeholder="SG900001" autocomplete="username">' +
      '<label class="lg-label">密码</label><input id="lgPwd" class="inp" type="password" placeholder="••••••" autocomplete="current-password">' +
      '<button class="btn pri" id="lgBtn" style="margin-top:8px;justify-content:center;padding:8px">登录</button>' +
      '<div class="login-note">连续失败 5 次锁定 15 分钟；会话当日 23:59 失效。没有注册入口，账号由管理员创建。</div>' +
      '<div class="rule"></div><div class="sec-t">演示账号（点击填入）</div><div id="lgList"></div></div></div>';

    Api.listIdentities().then(function (res) {
      var box = el('lgList');
      res.data.forEach(function (i) {
        var d = document.createElement('div');
        d.className = 'acct';
        d.innerHTML = '<span>' + esc(i.label) + '</span><span class="n">' + esc(i.account) + '</span>';
        d.addEventListener('click', function () {
          el('lgAcc').value = i.account;
          el('lgPwd').value = '123456';
          el('lgPwd').focus();
        });
        box.appendChild(d);
      });
    });

    el('lgBtn').addEventListener('click', doLogin);
    el('lgPwd').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { doLogin(); }
    });
    el('lgAcc').focus();
  }

  async function doLogin() {
    var acc = el('lgAcc').value.trim();
    var pwd = el('lgPwd').value;
    var res = await Api.login(acc, pwd);
    if (res.code !== 0) {
      var e = el('lgErr');
      e.hidden = false;
      e.textContent = res.message;
      return;
    }
    document.body.classList.remove('is-login');
    boot(res.data);
  }

  function boot(data) {
    state.user = data.user;
    state.roles = data.roles;
    state.permCodes = data.permissions;
    state.menus = data.menus;
    state.editUserId = null;
    state.editRoleId = null;
    el('whoName').textContent = data.user.name + ' · ' + data.user.account;
    el('whoRole').textContent = roleNamesOf(data.roles).join(' / ') || '无角色';
    el('sessChip').textContent = '会话至 23:59';
    buildNav();
    if (!location.hash || location.hash === '#/login') {
      location.hash = '#' + (data.menus[0] ? data.menus[0].path : '/perms');
    }
    route();
  }

  async function refreshMe() {
    var res = await Api.me();
    if (res.code !== 0) {
      state.user = null;
      renderLogin();
      return false;
    }
    state.user = res.data.user;
    state.roles = res.data.roles;
    state.permCodes = res.data.permissions;
    state.menus = res.data.menus;
    el('whoName').textContent = res.data.user.name + ' · ' + res.data.user.account;
    el('whoRole').textContent = roleNamesOf(res.data.roles).join(' / ') || '无角色';
    buildNav();
    return true;
  }

  /* ---------- 导航 ---------- */
  function buildNav() {
    var nav = el('nav');
    nav.innerHTML = '';
    var groups = {};
    var order = [];
    state.menus.forEach(function (m) {
      if (!groups[m.group]) { groups[m.group] = []; order.push(m.group); }
      groups[m.group].push(m);
    });
    order.forEach(function (g) {
      var box = document.createElement('div');
      box.className = 'nav-g';
      box.innerHTML = '<div class="nav-t">' + esc(g) + '</div>' +
        groups[g].map(function (m) {
          return '<button class="nav-i" data-path="' + m.path + '">' + esc(m.label) + '</button>';
        }).join('');
      nav.appendChild(box);
    });
  }

  function markNav(path) {
    var base = '/' + (path.split('/')[1] || '');
    document.querySelectorAll('.nav-i').forEach(function (b) {
      if (b.getAttribute('data-path') === base) { b.setAttribute('aria-current', 'true'); }
      else { b.removeAttribute('aria-current'); }
    });
  }

  /* ---------- 路由 ---------- */
  async function route() {
    if (!state.user) { return; }
    var path = location.hash.replace(/^#/, '') || '/perms';
    var hit = null;
    var args = [];
    for (var i = 0; i < ROUTES.length; i++) {
      var m = path.match(ROUTES[i].re);
      if (m) { hit = ROUTES[i]; args = m.slice(1); break; }
    }
    if (!hit) { location.hash = '#/perms'; return; }

    if (hit.perm && !has(hit.perm)) {
      markNav('');
      render403(hit.perm, path);
      return;
    }

    markNav(path);
    el('view').innerHTML = '<div class="muted" style="padding:24px 4px">载入中…</div>';
    try {
      var html = await hit.view.apply(null, args);
      el('view').innerHTML = html;
      window.scrollTo(0, 0);
    } catch (err) {
      el('view').innerHTML = '<div class="banner deny"><div><b>页面渲染失败：</b>' + esc(err.message) + '</div></div>';
      console.error(err);
    }
  }

  function render403(perm, path) {
    if (!state.roles.length) {
      el('view').innerHTML =
        head('账号尚未分配角色', '账号已经创建，但还没有绑定任何角色，因此没有任何菜单和接口权限。请联系管理员分配角色后重新登录。', '默认拒绝：没有角色 = 没有权限') +
        '<div class="panel"><div class="panel-b">' +
        '<div class="banner warn"><div><b>当前账号：</b>' + esc(state.user.name) + ' · ' + esc(state.user.account) + '</div></div>' +
        '<button class="btn" data-act="logout">退出登录</button>' +
        '</div></div>';
      return;
    }
    el('view').innerHTML =
      head('403 · 无权限', '当前账号没有访问这个页面的权限。页面隐藏只是第一层，接口同样会返回 403。', '需要权限码：' + codeTag(perm)) +
      '<div class="panel"><div class="panel-b">' +
      '<div class="banner deny"><div><b>访问被拒绝：</b>' + esc(path) + ' 需要 <code>' + esc(perm) + '</code>。</div></div>' +
      '<div class="stat-line" style="margin-bottom:12px"><span>当前角色：' + roleTags(roleNamesOf(state.roles)) + '</span>' +
      '<span>已持有权限：<b>' + state.permCodes.length + '</b> 项</span></div>' +
      '<button class="btn pri" data-go="/perms">返回我的权限</button>' +
      '</div></div>';
  }

  /* ---------- 我的权限 ---------- */
  async function viewPerms() {
    var res = await Api.me();
    if (res.code !== 0) { return errorView(res); }
    var d = res.data;
    var rows = d.permissionRows;
    var sysMap = {};
    var sysOrder = [];
    rows.forEach(function (p) {
      if (!sysMap[p.sys]) { sysMap[p.sys] = { name: p.sysName, rows: [] }; sysOrder.push(p.sys); }
      sysMap[p.sys].rows.push(p);
    });

    var body = '';
    sysOrder.forEach(function (sys) {
      var g = sysMap[sys];
      body += '<tr class="sysrow"><td colspan="4">' + esc(g.name) + ' <span class="muted">' + esc(sys) + '</span></td></tr>';
      g.rows.forEach(function (p) {
        body += '<tr><td><div class="who">' + esc(p.fn) + '</div><div class="sub">' + esc(p.module) + '</div></td>' +
          '<td><span class="op">' + esc(p.opName) + '</span></td>' +
          '<td>' + roleTags(p.roleNames) + '</td>' +
          '<td>' + codeTag(p.code) + '</td></tr>';
      });
    });
    if (!body) {
      body = '<tr><td colspan="4"><div class="empty">当前账号没有任何权限，请联系管理员分配角色。</div></td></tr>';
    }

    var chain =
      '<div class="steps">' +
      '<div class="step done"><div class="dot">1</div><div><div class="s-t">账号</div><div class="s-d">' + esc(d.user.name) + ' · ' + esc(d.user.account) + '</div></div></div>' +
      '<div class="step done"><div class="dot">2</div><div><div class="s-t">角色</div><div class="s-d">' + (roleNamesOf(d.roles).join(' + ') || '无角色') + '</div></div></div>' +
      '<div class="step done"><div class="dot">3</div><div><div class="s-t">角色权限</div><div class="s-d">角色绑定的“功能点 × 操作”并集</div></div></div>' +
      '<div class="step cur"><div class="dot">4</div><div><div class="s-t">最终权限</div><div class="s-d">' + rows.length + ' 项，覆盖 ' + sysOrder.length + ' 个系统</div></div></div>' +
      '</div>';

    return head('我的权限',
      '这里回答三个问题：我能对什么做什么、这些权限从哪个角色来、系统凭什么这样判定。权限不落个人表，每次登录实时计算。',
      'RBAC0 · 用户 → 角色 → 权限码') +
      '<div class="kpis" style="margin-bottom:14px">' +
      '<div class="kpi"><div class="k">我的角色</div><div class="v">' + d.roles.length + '</div><div class="d">' + esc(roleNamesOf(d.roles).join(' / ') || '—') + '</div></div>' +
      '<div class="kpi"><div class="k">权限项</div><div class="v">' + rows.length + '</div><div class="d">功能点 × 操作去重</div></div>' +
      '<div class="kpi"><div class="k">覆盖系统</div><div class="v">' + sysOrder.length + '</div><div class="d">按系统分组展示</div></div>' +
      '<div class="kpi"><div class="k">可见菜单</div><div class="v">' + d.menus.length + '</div><div class="d">由权限码过滤</div></div>' +
      '</div>' +
      '<div class="grid-2"><div class="panel"><div class="panel-h"><h2>权限台账</h2><span class="hint">共 ' + rows.length + ' 项</span></div>' +
      '<div class="panel-b flush"><table class="tbl"><thead><tr><th>功能点</th><th>操作</th><th>来源角色</th><th>权限码</th></tr></thead><tbody>' + body + '</tbody></table></div></div>' +
      '<div class="stack"><div class="panel"><div class="panel-h"><h2>判定过程</h2><span class="hint">每次请求重新计算</span></div><div class="panel-b">' + chain + '</div></div>' +
      '<div class="panel"><div class="panel-h"><h2>口径</h2></div><div class="panel-b"><ul style="margin:0;padding-left:18px;font-size:12.5px;color:var(--ink-2)">' +
      '<li>账号只挂角色，不直接挂权限。</li><li>一个角色可以有多枚权限，一枚权限可以属于多个角色。</li>' +
      '<li>多个角色取并集，重复权限只算一次。</li><li>角色停用后，其权限立即从计算结果中消失。</li>' +
      '</ul></div></div></div></div>';
  }

  /* ---------- 财务报表（业务权限演示） ---------- */
  async function viewReport() {
    var res = await Api.report();
    if (res.code !== 0) { return errorView(res); }
    var rows = res.data.rows;
    var totalBudget = 0, totalSpent = 0, over = 0;
    rows.forEach(function (r) {
      totalBudget += r.budget;
      totalSpent += r.spent;
      if (r.status === '超支') { over++; }
    });
    var trs = rows.map(function (r) {
      var cls = r.status === '超支' ? 'deny' : (r.status === '预警' ? 'sens' : 'grant');
      return '<tr><td><div class="who">' + esc(r.project) + '</div></td>' +
        '<td class="num">' + r.budget + '</td><td class="num">' + r.spent + '</td>' +
        '<td class="num">' + r.rate.toFixed(1) + '%</td><td>' + tag(r.status, cls) + '</td></tr>';
    }).join('');

    return head('财务报表',
      '这是一个普通业务页面，不属于 RBAC0 核心。保留它是为了证明：业务菜单和按钮同样由角色权限驱动，而不是写死在账号上。',
      '需要 FIN:RPT:VIEW；导出按钮需要 FIN:RPT:EXPORT') +
      '<div class="kpis" style="margin-bottom:14px">' +
      '<div class="kpi"><div class="k">项目数</div><div class="v">' + rows.length + '</div><div class="d">演示数据</div></div>' +
      '<div class="kpi"><div class="k">预算合计</div><div class="v">' + totalBudget + '<small>万元</small></div><div class="d">—</div></div>' +
      '<div class="kpi"><div class="k">已发生</div><div class="v">' + totalSpent + '<small>万元</small></div><div class="d">执行率 ' + (totalSpent / totalBudget * 100).toFixed(1) + '%</div></div>' +
      '<div class="kpi"><div class="k">超支项目</div><div class="v">' + over + '</div><div class="d">需要关注</div></div>' +
      '</div>' +
      '<div class="panel"><div class="panel-h"><h2>项目成本月报</h2><span class="hint">' +
      '<button class="btn sm" data-act="report-export"' + (res.data.canExport ? '' : ' disabled title="缺少 FIN:RPT:EXPORT"') + '>导出</button>' +
      '</span></div><div class="panel-b flush"><table class="tbl"><thead><tr><th>项目</th><th>预算（万元）</th><th>已发生（万元）</th><th>执行率</th><th>状态</th></tr></thead><tbody>' + trs + '</tbody></table></div></div>' +
      '<div class="banner mute" style="margin-top:14px"><div>权限来源：当前账号通过角色获得 <code>FIN:RPT:VIEW</code>，所以能看到本页；是否显示导出按钮由 <code>FIN:RPT:EXPORT</code> 单独决定。</div></div>';
  }

  /* ---------- 用户管理 ---------- */
  async function viewUsers() {
    var res = await Api.listUsers({ keyword: state.userQ });
    if (res.code !== 0) { return errorView(res); }
    var rows = res.data.rows;
    var editing = null;
    if (state.editUserId) {
      var er = await Api.getUser(state.editUserId);
      if (er.code === 0) { editing = er.data; } else { state.editUserId = null; }
    }

    var trs = rows.map(function (u) {
      var acts = '<button class="btn sm" data-go="/users/' + u.id + '">查看</button>';
      if (has('USER:EDIT')) {
        acts += '<button class="btn sm" data-act="user-edit" data-id="' + u.id + '">编辑</button>';
        acts += '<button class="btn sm" data-act="user-status" data-id="' + u.id + '" data-status="' + u.status + '">' + (u.status === 1 ? '停用' : '启用') + '</button>';
        acts += '<button class="btn sm" data-act="user-reset" data-id="' + u.id + '">重置密码</button>';
      }
      if (has('USER:DELETE')) {
        acts += '<button class="btn sm danger" data-act="user-delete" data-id="' + u.id + '">删除</button>';
      }
      return '<tr><td><div class="who">' + esc(u.name) + '</div><div class="num">' + esc(u.account) + '</div></td>' +
        '<td>' + roleTags(u.roleNames) + '</td>' +
        '<td class="num">' + u.permCount + '</td>' +
        '<td>' + statusTag(u.status) + '</td>' +
        '<td class="r"><div class="actions" style="justify-content:flex-end">' + acts + '</div></td></tr>';
    }).join('') || '<tr><td colspan="5"><div class="empty">没有匹配的用户</div></td></tr>';

    var form = editing
      ? '<div class="field"><label>账号</label><input id="uAccount" class="inp" value="' + esc(editing.user.account) + '" readonly></div>' +
        '<div class="field"><label>姓名 <span class="need">*</span></label><input id="uName" class="inp" value="' + esc(editing.user.name) + '"></div>' +
        '<div class="field"><label>手机号</label><input id="uPhone" class="inp" value="' + esc(editing.user.phone || '') + '"></div>'
      : '<div class="field"><label>账号 <span class="need">*</span></label><input id="uAccount" class="inp" placeholder="SG000103"></div>' +
        '<div class="field"><label>姓名 <span class="need">*</span></label><input id="uName" class="inp" placeholder="王五"></div>' +
        '<div class="field"><label>手机号</label><input id="uPhone" class="inp" placeholder="13800000103"></div>' +
        '<div class="field"><label>初始密码</label><input id="uPwd" class="inp" value="123456"></div>';

    return head('用户管理',
      '用户只负责“是谁”，不直接配权限。新增用户后先分配角色，权限由角色带出来。',
      '需要 USER:VIEW；新增 / 编辑 / 停用 / 删除分别对应独立权限码') +
      '<div class="toolbar">' +
      '<form id="userSearch" class="actions" style="gap:6px"><input id="userQ" class="inp" style="width:220px" placeholder="账号或姓名" value="' + esc(state.userQ) + '"><button class="btn" type="submit">查询</button></form>' +
      '<span class="spacer"></span>' +
      (has('USER:ADD') ? '<button class="btn pri" data-act="user-new">新增用户</button>' : '') +
      '</div>' +
      '<div class="grid-2"><div class="panel"><div class="panel-h"><h2>用户列表</h2><span class="hint">共 ' + res.data.total + ' 人</span></div>' +
      '<div class="panel-b flush"><table class="tbl"><thead><tr><th>用户</th><th>角色</th><th>权限数</th><th>状态</th><th class="r">操作</th></tr></thead><tbody>' + trs + '</tbody></table></div></div>' +
      '<div class="panel form-side"><div class="panel-h"><h2>' + (editing ? '编辑用户' : '新增用户') + '</h2><span class="hint">' + (editing ? esc(editing.user.account) : '创建后可分配角色') + '</span></div>' +
      '<div class="panel-b">' + form +
      '<div class="actions" style="margin-top:14px"><button class="btn pri" data-act="user-save" data-id="' + (editing ? editing.user.id : '') + '">' + (editing ? '保存修改' : '创建用户') + '</button>' +
      (editing ? '<button class="btn" data-act="user-new">取消</button>' : '') + '</div>' +
      '<div class="help">账号创建后不可修改；初始密码统一为 123456。</div></div></div></div>';
  }

  async function viewUser(id) {
    var res = await Api.getUser(id);
    if (res.code !== 0) { return errorView(res); }
    var d = res.data;
    var roleList = d.roles.map(function (r) {
      return '<label><input type="checkbox" name="ur" value="' + r.id + '"' + (r.checked ? ' checked' : '') + '>' +
        '<span style="flex:1"><b>' + esc(r.name) + '</b><span class="perm-code" style="margin-left:6px">' + esc(r.code) + '</span>' +
        '<span class="d" style="display:block;font-size:11px;color:var(--ink-3)">' + esc(r.remark || '') + '</span></span></label>';
    }).join('');

    var perms = d.permissions.length
      ? d.permissions.map(function (c) { return codeTag(c); }).join(' ')
      : '<span class="muted">暂无权限</span>';

    return head(d.user.name + ' · ' + d.user.account,
      '这里只做一件事：把角色分配给用户。保存后该用户的会话立即失效，重新登录才会拿到新权限。',
      '查看需要 USER:VIEW；保存需要 USER:ASSIGN_ROLE', '/users') +
      '<div class="grid-2"><div class="stack">' +
      '<div class="panel"><div class="panel-h"><h2>账号信息</h2><span class="hint">' + statusTag(d.user.status) + '</span></div><div class="panel-b">' +
      '<dl class="kv"><dt>账号</dt><dd class="mono">' + esc(d.user.account) + '</dd>' +
      '<dt>姓名</dt><dd>' + esc(d.user.name) + '</dd>' +
      '<dt>手机号</dt><dd>' + esc(d.user.phone || '—') + '</dd>' +
      '<dt>状态</dt><dd>' + (d.user.status === 1 ? '启用' : '停用') + '</dd></dl></div></div>' +
      '<div class="panel"><div class="panel-h"><h2>当前算出的权限</h2><span class="hint">共 ' + d.permissions.length + ' 项</span></div><div class="panel-b">' + perms + '</div></div>' +
      '</div><div class="panel"><div class="panel-h"><h2>分配角色</h2><span class="hint">可多选</span></div><div class="panel-b">' +
      '<div class="checklist">' + roleList + '</div>' +
      (has('USER:ASSIGN_ROLE')
        ? '<div class="actions" style="margin-top:14px"><button class="btn pri" data-act="user-roles-save" data-id="' + d.user.id + '">保存角色</button></div>'
        : '<div class="banner mute" style="margin-top:14px"><div>当前账号没有 <code>USER:ASSIGN_ROLE</code>，只能查看。</div></div>') +
      '<div class="help">保存后强制该用户重新登录，避免旧会话继续使用旧权限。</div></div></div></div>';
  }

  /* ---------- 角色管理 ---------- */
  async function viewRoles() {
    var res = await Api.listRoles({ keyword: state.roleQ });
    if (res.code !== 0) { return errorView(res); }
    var rows = res.data.rows;
    var editing = null;
    if (state.editRoleId) {
      var er = await Api.getRole(state.editRoleId);
      if (er.code === 0) { editing = er.data; } else { state.editRoleId = null; }
    }

    var trs = rows.map(function (r) {
      var acts = '<button class="btn sm" data-go="/roles/' + r.id + '">查看</button>';
      if (has('ROLE:EDIT')) { acts += '<button class="btn sm" data-act="role-edit" data-id="' + r.id + '">编辑</button>'; }
      if (has('ROLE:DELETE')) { acts += '<button class="btn sm danger" data-act="role-delete" data-id="' + r.id + '">删除</button>'; }
      return '<tr><td><div class="who">' + esc(r.name) + '</div><div class="num">' + esc(r.code) + '</div></td>' +
        '<td class="num">' + r.memberCount + '</td>' +
        '<td class="num">' + r.permCount + '</td>' +
        '<td>' + statusTag(r.status) + '</td>' +
        '<td class="r"><div class="actions" style="justify-content:flex-end">' + acts + '</div></td></tr>';
    }).join('') || '<tr><td colspan="5"><div class="empty">没有匹配的角色</div></td></tr>';

    var form = editing
      ? '<div class="field"><label>角色编码</label><input id="rCode" class="inp" value="' + esc(editing.role.code) + '" readonly></div>' +
        '<div class="field"><label>角色名称 <span class="need">*</span></label><input id="rName" class="inp" value="' + esc(editing.role.name) + '"></div>' +
        '<div class="field"><label>备注</label><textarea id="rRemark" class="inp">' + esc(editing.role.remark || '') + '</textarea></div>' +
        '<div class="field"><label>状态</label><select id="rStatus" class="inp"><option value="1"' + (editing.role.status === 1 ? ' selected' : '') + '>启用</option><option value="0"' + (editing.role.status === 0 ? ' selected' : '') + '>停用</option></select></div>'
      : '<div class="field"><label>角色编码 <span class="need">*</span></label><input id="rCode" class="inp" placeholder="FIN_SPECIALIST"></div>' +
        '<div class="field"><label>角色名称 <span class="need">*</span></label><input id="rName" class="inp" placeholder="财务专员"></div>' +
        '<div class="field"><label>备注</label><textarea id="rRemark" class="inp" placeholder="这个角色解决什么问题"></textarea></div>';

    return head('角色管理',
      '角色是“权限包”。先把功能点 × 操作绑到角色上，再把角色分配给用户；不要给用户单独勾权限。',
      '需要 ROLE:VIEW；新增 / 编辑 / 删除 / 分配权限分别对应独立权限码') +
      '<div class="toolbar">' +
      '<form id="roleSearch" class="actions" style="gap:6px"><input id="roleQ" class="inp" style="width:220px" placeholder="编码或名称" value="' + esc(state.roleQ) + '"><button class="btn" type="submit">查询</button></form>' +
      '<span class="spacer"></span>' +
      (has('ROLE:ADD') ? '<button class="btn pri" data-act="role-new">新增角色</button>' : '') +
      '</div>' +
      '<div class="grid-2"><div class="panel"><div class="panel-h"><h2>角色列表</h2><span class="hint">共 ' + res.data.total + ' 个</span></div>' +
      '<div class="panel-b flush"><table class="tbl"><thead><tr><th>角色</th><th>成员</th><th>权限数</th><th>状态</th><th class="r">操作</th></tr></thead><tbody>' + trs + '</tbody></table></div></div>' +
      '<div class="panel form-side"><div class="panel-h"><h2>' + (editing ? '编辑角色' : '新增角色') + '</h2><span class="hint">' + (editing ? esc(editing.role.code) : '保存后去分配权限') + '</span></div>' +
      '<div class="panel-b">' + form +
      '<div class="actions" style="margin-top:14px"><button class="btn pri" data-act="role-save" data-id="' + (editing ? editing.role.id : '') + '">' + (editing ? '保存修改' : '创建角色') + '</button>' +
      (editing ? '<button class="btn" data-act="role-new">取消</button>' : '') + '</div>' +
      '<div class="help">角色编码创建后不可修改；删除前会检查是否仍有成员。</div></div></div></div>';
  }

  async function viewRole(id) {
    var res = await Api.getRole(id);
    if (res.code !== 0) { return errorView(res); }
    var d = res.data;
    var role = d.role;
    var perms = d.permissions;
    var checkedCount = perms.filter(function (p) { return p.checked; }).length;

    var groups = {};
    var order = [];
    perms.forEach(function (p) {
      var key = p.sys + '|' + p.module + '|' + p.fn;
      if (!groups[key]) {
        groups[key] = { sys: p.sys, sysName: p.sysName, module: p.module, fn: p.fn, ops: [] };
        order.push(key);
      }
      groups[key].ops.push(p);
    });

    var rows = '';
    var lastSys = '';
    order.forEach(function (key) {
      var g = groups[key];
      if (g.sys !== lastSys) {
        rows += '<tr class="sysrow"><td colspan="4">' + esc(g.sysName) + ' <span class="muted">' + esc(g.sys) + '</span></td></tr>';
        lastSys = g.sys;
      }
      rows += '<tr><td class="num">' + esc(g.module) + '</td><td class="fncell">' + esc(g.fn) + '</td><td colspan="2"><div class="opbox">' +
        g.ops.map(function (p) {
          return '<label><input type="checkbox" name="rp" value="' + p.id + '"' + (p.checked ? ' checked' : '') + '> ' + esc(p.opName) +
            ' <span class="perm-code">' + esc(p.code) + '</span></label>';
        }).join('') + '</div></td></tr>';
    });

    var members = d.members.length
      ? d.members.map(function (u) {
          return '<div class="list-item" style="padding:7px 0"><div class="t">' + esc(u.name) + ' <span class="perm-code">' + esc(u.account) + '</span></div></div>';
        }).join('')
      : '<div class="muted">暂无成员</div>';

    return head(role.name + ' · ' + role.code,
      '把这个角色需要的“功能点 × 操作”勾出来。角色权限变化后，所有持有该角色的用户下一次请求就按新结果判定。',
      '查看需要 ROLE:VIEW；保存需要 ROLE:ASSIGN_PERM', '/roles') +
      '<div class="grid-2"><div class="panel"><div class="panel-h"><h2>权限矩阵</h2><span class="hint">已选 ' + checkedCount + ' / ' + perms.length + '</span></div>' +
      '<div class="panel-b flush"><table class="tbl matrix"><thead><tr><th>模块</th><th>功能点</th><th colspan="2">操作</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      (has('ROLE:ASSIGN_PERM')
        ? '<div class="panel-b" style="border-top:1px solid var(--line)"><div class="actions"><button class="btn pri" data-act="role-perms-save" data-id="' + role.id + '">保存权限</button><span class="muted">取消勾选即收回该操作</span></div></div>'
        : '<div class="panel-b" style="border-top:1px solid var(--line)"><div class="banner mute"><div>当前账号没有 <code>ROLE:ASSIGN_PERM</code>，只能查看。</div></div></div>') +
      '</div><div class="stack"><div class="panel"><div class="panel-h"><h2>角色信息</h2><span class="hint">' + statusTag(role.status) + '</span></div><div class="panel-b">' +
      '<dl class="kv"><dt>编码</dt><dd class="mono">' + esc(role.code) + '</dd><dt>名称</dt><dd>' + esc(role.name) + '</dd>' +
      '<dt>备注</dt><dd>' + esc(role.remark || '—') + '</dd><dt>成员</dt><dd>' + d.members.length + ' 人</dd></dl></div></div>' +
      '<div class="panel"><div class="panel-h"><h2>持有该角色的用户</h2></div><div class="panel-b">' + members + '</div></div></div></div>';
  }

  /* ---------- 权限目录 ---------- */
  async function viewPermissions() {
    var sysRes = await Api.listSystems();
    if (sysRes.code !== 0) { return errorView(sysRes); }
    var res = await Api.listPermissions({ sys: state.permSys, keyword: state.permQ });
    if (res.code !== 0) { return errorView(res); }
    var rows = res.data.rows;

    var chips = '<button class="fchip" data-act="perm-sys" data-sys="" aria-pressed="' + (state.permSys === '' ? 'true' : 'false') + '">全部</button>' +
      sysRes.data.map(function (s) {
        return '<button class="fchip" data-act="perm-sys" data-sys="' + esc(s.code) + '" aria-pressed="' + (state.permSys === s.code ? 'true' : 'false') + '">' + esc(s.name) + '</button>';
      }).join('');

    var trs = rows.map(function (p) {
      return '<tr><td>' + esc(p.sysName) + '<div class="num">' + esc(p.sys) + '</div></td>' +
        '<td>' + esc(p.module) + '</td><td>' + esc(p.fn) + '</td>' +
        '<td><span class="op">' + esc(p.opName) + '</span></td>' +
        '<td>' + codeTag(p.code) + '</td></tr>';
    }).join('') || '<tr><td colspan="5"><div class="empty">没有匹配的权限</div></td></tr>';

    return head('权限目录',
      '权限由“系统 + 模块 + 功能点 + 操作”组成，一行就是一个最小授权单元。角色只能从这里勾选，不能手写权限字符串。',
      '需要 PERM:VIEW；本页只读，维护入口在角色详情') +
      '<div class="toolbar"><div class="chips">' + chips + '</div><span class="spacer"></span>' +
      '<form id="permSearch" class="actions" style="gap:6px"><input id="permQ" class="inp" style="width:200px" placeholder="权限码或功能点" value="' + esc(state.permQ) + '"><button class="btn" type="submit">查询</button></form></div>' +
      '<div class="panel"><div class="panel-h"><h2>权限清单</h2><span class="hint">共 ' + res.data.total + ' 条</span></div>' +
      '<div class="panel-b flush"><table class="tbl"><thead><tr><th>系统</th><th>模块</th><th>功能点</th><th>操作</th><th>权限码</th></tr></thead><tbody>' + trs + '</tbody></table></div></div>';
  }

  /* ---------- 事件 ---------- */
  document.addEventListener('click', async function (e) {
    var go = e.target.closest('[data-go]');
    if (go) { location.hash = '#' + go.getAttribute('data-go'); return; }

    var nav = e.target.closest('[data-path]');
    if (nav) { location.hash = '#' + nav.getAttribute('data-path'); return; }

    var actEl = e.target.closest('[data-act]');
    if (!actEl) { return; }
    var act = actEl.getAttribute('data-act');
    var id = actEl.getAttribute('data-id');

    if (act === 'logout') {
      await Api.logout();
      state.user = null;
      location.hash = '';
      renderLogin();
      return;
    }

    if (act === 'user-new') {
      state.editUserId = null;
      route();
      return;
    }

    if (act === 'user-edit') {
      state.editUserId = Number(id);
      route();
      return;
    }

    if (act === 'user-status') {
      var next = Number(actEl.getAttribute('data-status')) === 1 ? 0 : 1;
      if (!confirm(next === 0 ? '停用后该用户立即失去登录能力，确定停用？' : '确定启用该用户？')) { return; }
      var r1 = await Api.setUserStatus(id, next);
      if (r1.code !== 0) { toast(r1.message); return; }
      toast(next === 0 ? '已停用' : '已启用');
      route();
      return;
    }

    if (act === 'user-reset') {
      if (!confirm('重置后密码变为 123456，且该用户当前会话失效。继续？')) { return; }
      var r2 = await Api.resetPassword(id);
      if (r2.code !== 0) { toast(r2.message); return; }
      toast('密码已重置为 123456');
      return;
    }

    if (act === 'user-delete') {
      if (!confirm('删除用户后不可恢复，确定删除？')) { return; }
      var r3 = await Api.deleteUser(id);
      if (r3.code !== 0) { toast(r3.message); return; }
      if (String(id) === String(state.user.id)) { renderLogin(); return; }
      toast('已删除');
      route();
      return;
    }

    if (act === 'user-save') {
      var payload = {
        account: el('uAccount') ? el('uAccount').value : '',
        name: el('uName') ? el('uName').value : '',
        phone: el('uPhone') ? el('uPhone').value : ''
      };
      var res;
      if (id) {
        res = await Api.updateUser(id, payload);
        if (res.code !== 0) { toast(res.message); return; }
        toast('已保存');
        route();
      } else {
        payload.password = el('uPwd') ? el('uPwd').value : '123456';
        res = await Api.createUser(payload);
        if (res.code !== 0) { toast(res.message); return; }
        toast('已创建，请分配角色');
        state.editUserId = null;
        location.hash = '#/users/' + res.data.id;
      }
      return;
    }

    if (act === 'user-roles-save') {
      var ids = Array.prototype.slice.call(document.querySelectorAll('input[name=ur]:checked')).map(function (x) { return Number(x.value); });
      var r4 = await Api.setUserRoles(id, ids);
      if (r4.code !== 0) { toast(r4.message); return; }
      if (r4.data.self) {
        toast('自己的角色已变更，请重新登录');
        setTimeout(renderLogin, 600);
        return;
      }
      toast('角色已保存，该用户需重新登录');
      location.hash = '#/users';
      return;
    }

    if (act === 'role-new') {
      state.editRoleId = null;
      route();
      return;
    }

    if (act === 'role-edit') {
      state.editRoleId = Number(id);
      route();
      return;
    }

    if (act === 'role-delete') {
      if (!confirm('确定删除该角色？仍有成员时系统会拒绝。')) { return; }
      var r5 = await Api.deleteRole(id);
      if (r5.code !== 0) { toast(r5.message); return; }
      toast('已删除');
      route();
      return;
    }

    if (act === 'role-save') {
      var rp = {
        code: el('rCode') ? el('rCode').value : '',
        name: el('rName') ? el('rName').value : '',
        remark: el('rRemark') ? el('rRemark').value : ''
      };
      var res2;
      if (id) {
        rp.status = el('rStatus') ? el('rStatus').value : 1;
        res2 = await Api.updateRole(id, rp);
        if (res2.code !== 0) { toast(res2.message); return; }
        await refreshMe();
        toast('已保存');
        route();
      } else {
        res2 = await Api.createRole(rp);
        if (res2.code !== 0) { toast(res2.message); return; }
        toast('已创建，请分配权限');
        state.editRoleId = null;
        location.hash = '#/roles/' + res2.data.id;
      }
      return;
    }

    if (act === 'role-perms-save') {
      var pids = Array.prototype.slice.call(document.querySelectorAll('input[name=rp]:checked')).map(function (x) { return Number(x.value); });
      var r6 = await Api.setRolePerms(id, pids);
      if (r6.code !== 0) { toast(r6.message); return; }
      await refreshMe();
      toast('权限已保存');
      route();
      return;
    }

    if (act === 'perm-sys') {
      state.permSys = actEl.getAttribute('data-sys') || '';
      route();
      return;
    }

    if (act === 'report-export') {
      toast('已导出（演示环境不生成文件）');
      return;
    }
  });

  document.addEventListener('submit', function (e) {
    if (e.target.id === 'userSearch') {
      e.preventDefault();
      state.userQ = el('userQ').value.trim();
      route();
    }
    if (e.target.id === 'roleSearch') {
      e.preventDefault();
      state.roleQ = el('roleQ').value.trim();
      route();
    }
    if (e.target.id === 'permSearch') {
      e.preventDefault();
      state.permQ = el('permQ').value.trim();
      route();
    }
  });

  window.addEventListener('hashchange', route);

  /* ---------- 启动 ---------- */
  (async function init() {
    var d = await Api.dict();
    state.dict = d.data;
    var res = await Api.me();
    if (res.code !== 0) { renderLogin(); return; }
    boot(res.data);
  })();
})();
