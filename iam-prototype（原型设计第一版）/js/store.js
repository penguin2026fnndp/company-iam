/* 暂存层：登录态、申请单、已批准的授权都放在 localStorage。
   接数据库后，这一层整体替换为后端接口（见 README）。 */
window.Store = (function () {
  var K = { session: 'iam.session', apps: 'iam.apps', grants: 'iam.grants', lock: 'iam.lock', seeded: 'iam.seeded' };
  var PWD = '123456';
  var MAX_FAIL = 5, LOCK_MS = 15 * 60 * 1000;

  function read(k, d) {
    try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; }
  }
  function write(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function today() { return new Date().toISOString().slice(0, 10); }
  function now() {
    var d = new Date(), p = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function byName(name) {
    var ids = Object.keys(MOCK.users);
    for (var i = 0; i < ids.length; i++) { if (MOCK.users[ids[i]].name === name) { return MOCK.users[ids[i]]; } }
    return null;
  }

  function seed() {
    if (read(K.seeded, false)) { return; }
    var map = { '沈祥': 'shenxiang', '曾禄': 'zenglu', '周涛': 'zhoutao', '郭健': 'luxiaochao' };
    var apps = MOCK.applications.map(function (a) {
      var c = clone(a);
      c.chain = c.chain.map(function (n) {
        return Object.assign({}, n, { approverId: map[n.name] || null });
      });
      return c;
    });
    write(K.apps, apps);
    write(K.grants, []);
    write(K.seeded, true);
  }

  function login(account, password) {
    seed();
    account = String(account || '').trim();
    var lock = read(K.lock, {});
    var rec = lock[account];
    if (rec && rec.until && rec.until > Date.now()) {
      return { ok: false, code: 'LOCKED', message: '账号已锁定，请 ' + Math.ceil((rec.until - Date.now()) / 60000) + ' 分钟后重试' };
    }
    var u = null, ids = Object.keys(MOCK.users);
    for (var i = 0; i < ids.length; i++) {
      if (MOCK.users[ids[i]].account.toLowerCase() === account.toLowerCase()) { u = MOCK.users[ids[i]]; break; }
    }
    if (!u || password !== PWD) {
      rec = rec || { count: 0 };
      if (!rec.until || rec.until <= Date.now()) { rec.count = (rec.count || 0) + 1; }
      if (rec.count >= MAX_FAIL) { rec.until = Date.now() + LOCK_MS; rec.count = 0; }
      lock[account] = rec;
      write(K.lock, lock);
      var left = MAX_FAIL - (rec.count || 0);
      return {
        ok: false, code: 'BAD',
        message: rec.until && rec.until > Date.now()
          ? '连续失败 5 次，账号锁定 15 分钟'
          : '账号或密码不正确，还可尝试 ' + left + ' 次'
      };
    }
    delete lock[account];
    write(K.lock, lock);
    write(K.session, { userId: u.id, day: today(), at: Date.now() });
    return { ok: true, user: u };
  }

  function logout() { try { localStorage.removeItem(K.session); } catch (e) {} }

  function currentUser() {
    var s = read(K.session, null);
    if (!s) { return null; }
    if (s.day !== today()) { logout(); return null; }
    return MOCK.users[s.userId] || null;
  }

  function apps() { seed(); return read(K.apps, []); }
  function saveApps(list) { write(K.apps, list); }

  /* 合并：mock 基线 + 本地已批准授权 */
  function perms(userId) {
    var base = (MOCK.perms[userId] || []).map(clone);
    var grants = read(K.grants, []).filter(function (g) { return g.user === userId; });
    grants.forEach(function (g) {
      var row = { fn: g.fn, ops: g.ops.slice(), source: 'EXCEPTION', scope: g.scope || 'ALL', exId: g.appId, breakthrough: !!g.breakthrough };
      var idx = -1;
      for (var i = 0; i < base.length; i++) { if (base[i].fn === g.fn) { idx = i; break; } }
      if (idx >= 0) { base[idx] = Object.assign({}, base[idx], row); } else { base.push(row); }
    });
    return base;
  }

  function chainFor(user, level) {
    var list = [];
    var mgr = byName(user.manager);
    var adminId = user.company === '总公司' ? 'zhoutao' : 'zenglu';
    var first = (mgr && mgr.id !== user.id) ? mgr : MOCK.users[adminId];
    list.push({
      title: mgr && mgr.id !== user.id ? '部门负责人' : '分公司管理员（部门负责人不可用）',
      name: first.name, approverId: first.id, result: '待处理', at: '',
      basis: mgr && mgr.id !== user.id ? '部门信息表中的"部门经理"' : '部门负责人为空或为本人，自动顺延'
    });
    if (level === 'L2' || level === 'L3') {
      var admin = MOCK.users[adminId];
      if (admin.id !== first.id) {
        list.push({ title: '分公司管理员', name: admin.name, approverId: admin.id, result: '未开始', at: '', basis: '例外权限由分公司管理员终审' });
      }
    }
    if (level === 'L3') {
      var last = list[list.length - 1];
      if (last.approverId !== 'zhoutao') {
        list.push({ title: '总公司管理员', name: '周涛', approverId: 'zhoutao', result: '未开始', at: '', basis: 'L3 高敏：总公司终审' });
      }
    }
    return list;
  }

  function createApp(data) {
    var list = apps();
    var user = MOCK.users[data.applicant];
    var fn = MOCK.functions[data.fn];
    var chain = chainFor(user, fn.level);
    var seq = 1200;
    list.forEach(function (a) {
      var m = String(a.id).match(/^AP-2026-(\d+)$/);
      if (m) { seq = Math.max(seq, parseInt(m[1], 10)); }
    });
    seq += 1;
    var app = {
      id: 'AP-2026-' + seq,
      applicant: data.applicant,
      fn: data.fn,
      ops: data.ops,
      type: '例外权限',
      level: fn.level,
      status: '审批中',
      submitted: now(),
      effective: data.effective || '审批通过即生效',
      reason: data.reason || '',
      breakthrough: !!data.breakthrough,
      current: chain[0].approverId,
      chain: chain
    };
    list.push(app);
    saveApps(list);
    return app;
  }

  function decide(id, action, comment) {
    var list = apps();
    var app = null;
    for (var i = 0; i < list.length; i++) { if (list[i].id === id) { app = list[i]; break; } }
    if (!app) { return { ok: false, message: '单据不存在' }; }
    if (app.status !== '审批中') { return { ok: false, message: '单据不在审批中' }; }
    if (action === 'reject' && !String(comment || '').trim()) { return { ok: false, message: '驳回必须填写原因' }; }
    var idx = -1;
    for (var j = 0; j < app.chain.length; j++) { if (app.chain[j].result === '待处理') { idx = j; break; } }
    if (idx < 0) { return { ok: false, message: '没有待处理节点' }; }
    app.chain[idx].at = now();
    app.chain[idx].result = action === 'reject' ? '驳回' : '同意';
    app.chain[idx].comment = comment || '';
    if (action === 'reject') {
      app.status = '已驳回';
      app.current = null;
    } else {
      var next = null;
      for (var k = idx + 1; k < app.chain.length; k++) { if (app.chain[k].result === '未开始') { next = app.chain[k]; break; } }
      if (next) {
        next.result = '待处理';
        app.current = next.approverId;
      } else {
        app.status = '已生效';
        app.current = null;
        var grants = read(K.grants, []);
        var replaced = false;
        for (var g = 0; g < grants.length; g++) {
          if (grants[g].user === app.applicant && grants[g].fn === app.fn) {
            grants[g] = { user: app.applicant, fn: app.fn, ops: app.ops, appId: app.id, breakthrough: app.breakthrough, scope: 'ALL' };
            replaced = true;
          }
        }
        if (!replaced) { grants.push({ user: app.applicant, fn: app.fn, ops: app.ops, appId: app.id, breakthrough: app.breakthrough, scope: 'ALL' }); }
        write(K.grants, grants);
      }
    }
    saveApps(list);
    return { ok: true, app: app };
  }

  return {
    login: login, logout: logout, currentUser: currentUser,
    apps: apps, createApp: createApp, decide: decide, perms: perms,
    reset: function () { [K.session, K.apps, K.grants, K.lock, K.seeded].forEach(function (k) { localStorage.removeItem(k); }); }
  };
})();
