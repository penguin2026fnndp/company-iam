/* 接口层：页面只依赖 Api，不直接读 MOCK。
   接后端时，把每个方法体替换成 fetch 调用即可，返回结构保持 { code, data, message }。
   建议的 REST 路径见 README.md。 */
window.Api = (function () {
  var LATENCY = 120;

  function ok(data) {
    return new Promise(function (resolve) {
      setTimeout(function () { resolve({ code: 0, data: data, message: 'ok' }); }, LATENCY);
    });
  }
  function fail(code, message) {
    return Promise.resolve({ code: code, data: null, message: message });
  }
  function byId(list, id) {
    for (var i = 0; i < list.length; i++) { if (list[i].id === id) { return list[i]; } }
    return null;
  }

  return {
    /* GET /api/session */
    getSession: function () {
      var u = Store.currentUser();
      if (!u) { return fail(401, '未登录'); }
      return ok({ userId: u.id, identity: byId(MOCK.identities, u.id), user: u });
    },

    /* POST /api/auth/login  { account, password } */
    login: function (account, password) {
      var r = Store.login(account, password);
      if (!r.ok) { return fail(401, r.message); }
      return ok({ userId: r.user.id, identity: byId(MOCK.identities, r.user.id), user: r.user });
    },

    /* POST /api/auth/logout */
    logout: function () {
      Store.logout();
      return ok(true);
    },

    /* 演示用：登录页展示可用账号 */
    listIdentities: function () {
      return ok(MOCK.identities.map(function (i) {
        var u = MOCK.users[i.id];
        return Object.assign({}, i, { account: u.account, post: u.post });
      }));
    },

    /* GET /api/users/{id}/permissions */
    listMyPermissions: function (userId) {
      var rows = Store.perms(userId);
      return ok(rows.map(function (r) {
        return Object.assign({}, r, { fnDetail: MOCK.functions[r.fn] });
      }));
    },

    /* GET /api/users/{id}/permissions/{fnId} */
    getPermission: function (userId, fnId) {
      var rows = Store.perms(userId);
      for (var i = 0; i < rows.length; i++) {
        if (rows[i].fn === fnId) {
          var row = Object.assign({}, rows[i]);
          row.fnDetail = MOCK.functions[fnId];
          row.user = MOCK.users[userId];
          if (row.exId) { row.exception = MOCK.exceptions[row.exId]; }
          if (row.deltaId) { row.delta = byId(MOCK.deltas, row.deltaId); }
          if (row.projectId) { row.project = byId(MOCK.projects, row.projectId); }
          row.relatedDeltas = MOCK.deltas.filter(function (d) { return d.fn === fnId; });
          row.role = byId(MOCK.roles, row.user.roleId);
          if (row.exception && row.exception.appId) {
            var a = byId(MOCK.applications, row.exception.appId);
            row.app = a ? Object.assign({}, a, {
              applicantUser: MOCK.users[a.applicant],
              fnDetail: MOCK.functions[a.fn]
            }) : null;
          }
          return ok(row);
        }
      }
      return fail(404, '未找到该权限');
    },

    /* GET /api/roles */
    listRoles: function () {
      return ok(MOCK.roles);
    },
    /* GET /api/roles/{id} */
    getRole: function (id) {
      var role = byId(MOCK.roles, id);
      if (!role) { return fail(404, '角色不存在'); }
      var code = { 'R-EMP': 'EMP', 'R-MGR': 'MGR', 'R-PM': 'PM', 'R-LEAD': 'LEAD', 'R-SYS': 'SYS' }[id];
      var keys = Object.keys(MOCK.functions);
      var rows = [];
      for (var i = 0; i < keys.length; i++) {
        var f = MOCK.functions[keys[i]];
        if (f.level === 'P' || f.sys === 'PROJ') { continue; }
        rows.push({ fn: f, ops: (f.ops && f.ops[code]) || [] });
      }
      return ok({ role: role, rows: rows });
    },

    /* GET /api/deltas?company=&dept=&post= */
    listDeltas: function (scope) {
      var rows = MOCK.deltas.slice();
      if (scope && scope.company) { rows = rows.filter(function (d) { return d.company === scope.company; }); }
      if (scope && scope.level) { rows = rows.filter(function (d) { return d.level === scope.level; }); }
      return ok(rows.map(function (d) { return Object.assign({}, d, { fnDetail: MOCK.functions[d.fn] }); }));
    },

    /* GET /api/applications?status=&applicant=&current= */
    listApplications: function (filter) {
      var rows = Store.apps().slice();
      filter = filter || {};
      if (filter.applicant) { rows = rows.filter(function (a) { return a.applicant === filter.applicant; }); }
      if (filter.current) { rows = rows.filter(function (a) { return a.current === filter.current; }); }
      if (filter.status) { rows = rows.filter(function (a) { return a.status === filter.status; }); }
      return ok(rows.map(function (a) {
        return Object.assign({}, a, { fnDetail: MOCK.functions[a.fn], applicantUser: MOCK.users[a.applicant] });
      }));
    },
    /* GET /api/applications/{id} */
    getApplication: function (id) {
      var app = byId(Store.apps(), id);
      if (!app) { return fail(404, '单据不存在'); }
      return ok(Object.assign({}, app, { fnDetail: MOCK.functions[app.fn], applicantUser: MOCK.users[app.applicant] }));
    },
    /* POST /api/applications/{id}/decisions  { action, comment } */
    /* POST /api/applications  { applicant, fn, ops, reason, effective } */
    submitApplication: function (data) {
      if (!data || !data.fn || !data.ops || !data.ops.length) { return fail(400, '请至少选择一个操作'); }
      if (!data.reason || String(data.reason).trim().length < 4) { return fail(400, '申请事由至少 4 个字'); }
      var app = Store.createApp(data);
      return ok(app);
    },

    /* POST /api/applications/{id}/decisions  { action, comment } */
    decideApplication: function (id, action, comment) {
      var r = Store.decide(id, action, comment);
      return r.ok ? ok(r.app) : fail(400, r.message);
    },

    /* GET /api/projects */
    listProjects: function () {
      return ok(MOCK.projects);
    },
    /* GET /api/projects/{id} */
    getProject: function (id) {
      var p = byId(MOCK.projects, id);
      if (!p) { return fail(404, '项目不存在'); }
      var members = p.members.map(function (m) {
        return Object.assign({}, m, { user: MOCK.users[m.user] });
      });
      var resources = p.resources.map(function (r) {
        return Object.assign({}, r, { fnDetail: MOCK.functions[r.id] });
      });
      return ok({ project: p, members: members, resources: resources });
    },

    /* GET /api/users/{id} */
    getUser: function (id) {
      var u = MOCK.users[id];
      if (!u) { return fail(404, '用户不存在'); }
      return ok(u);
    },

    /* GET /api/logs?type=&actor= */
    listLogs: function (filter) {
      var rows = MOCK.logs.slice();
      filter = filter || {};
      if (filter.type) { rows = rows.filter(function (l) { return l.type === filter.type; }); }
      return ok(rows);
    },
    getLog: function (id) {
      var l = byId(MOCK.logs, id);
      return l ? ok(l) : fail(404, '日志不存在');
    },

    /* 演示环境的静态字典 */
    dict: function () {
      return ok({
        ops: ['查看', '新增', '编辑', '审批', '导出'],
        levels: { L1: '一般', L2: '重要', L3: '高敏', P: '平台' },
        sources: { TEMPLATE: '模板', DEPT_DELTA: '部门差量', COMPANY_DELTA: '分公司差量', EXCEPTION: '例外授予', PLATFORM: 'IAM 平台', PROJECT: '项目角色', NONE: '无' }
      });
    }
  };
})();
