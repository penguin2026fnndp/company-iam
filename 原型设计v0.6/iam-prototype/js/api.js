/* 接口层：页面的唯一数据入口。
   真实后端接进来时，把方法体替换为 fetch，返回结构保持 { code, data, message }。
   这里的权限校验模拟服务端：先查会话，再查角色-权限。 */
window.Api = (function () {
  var LATENCY = 90;

  function ok(data) {
    return new Promise(function (resolve) {
      setTimeout(function () { resolve({ code: 0, data: data, message: 'ok' }); }, LATENCY);
    });
  }

  function fail(code, message) {
    return Promise.resolve({ code: code, data: null, message: message });
  }

  function guard(permCode) {
    var user = Store.currentUser();
    if (!user) { return { code: 401, message: '未登录或会话已失效' }; }
    if (permCode && !Store.hasPerm(user.id, permCode)) {
      return { code: 403, message: '无权限：' + permCode };
    }
    return null;
  }

  function byId(list, id) {
    for (var i = 0; i < list.length; i++) {
      if (String(list[i].id) === String(id)) { return list[i]; }
    }
    return null;
  }

  function meData(user) {
    var roleList = Store.rolesOf(user.id);
    var perms = Store.permissionsOf(user.id);
    var rows = perms.map(function (p) {
      var names = roleList.filter(function (r) {
        return (r.permIds || []).indexOf(p.id) >= 0;
      }).map(function (r) { return r.name; });
      return Object.assign({}, p, { roleNames: names });
    });
    return {
      user: {
        id: user.id, account: user.account, name: user.name,
        phone: user.phone, status: user.status, roleIds: user.roleIds
      },
      roles: roleList,
      permissions: perms.map(function (p) { return p.code; }),
      permissionRows: rows,
      menus: Store.menusOf(user.id),
      session: Store.currentSession()
    };
  }

  function validAccount(account) {
    return /^[A-Za-z0-9_-]{3,32}$/.test(String(account || ''));
  }

  function roleIdsOfUser(user) {
    return (user.roleIds || []).map(String);
  }

  return {
    /* ---------- 认证 ---------- */

    login: function (account, password) {
      var r = Store.login(account, password);
      if (!r.ok) { return fail(401, r.message); }
      return ok(meData(r.user));
    },

    logout: function () {
      Store.logout();
      return ok(true);
    },

    me: function () {
      var user = Store.currentUser();
      if (!user) { return fail(401, '未登录或会话已失效'); }
      return ok(meData(user));
    },

    listIdentities: function () {
      return ok(MOCK.users.map(function (u) {
        var roles = Store.rolesOf(u.id).map(function (r) { return r.name; });
        var label = u.name;
        if (roles.length && roles[0] !== u.name) { label += ' · ' + roles.join(' / '); }
        else if (roles.length) { label += ' · 全部权限'; }
        return {
          account: u.account,
          name: u.name,
          label: label,
          roles: roles
        };
      }));
    },

    /* ---------- 用户 ---------- */

    listUsers: function (filter) {
      var g = guard('USER:VIEW');
      if (g) { return fail(g.code, g.message); }
      filter = filter || {};
      var keyword = String(filter.keyword || '').trim().toLowerCase();
      var rows = Store.users().filter(function (u) {
        if (!keyword) { return true; }
        return String(u.account).toLowerCase().indexOf(keyword) >= 0 ||
               String(u.name).toLowerCase().indexOf(keyword) >= 0;
      }).map(function (u) {
        var roles = Store.rolesOf(u.id);
        return Object.assign({}, u, {
          password: undefined,
          roleNames: roles.map(function (r) { return r.name; }),
          permCount: Store.permissionsOf(u.id).length
        });
      });
      return ok({ total: rows.length, rows: rows });
    },

    getUser: function (id) {
      var g = guard('USER:VIEW');
      if (g) { return fail(g.code, g.message); }
      var user = Store.findUserById(id);
      if (!user) { return fail(404, '用户不存在'); }
      var allRoles = Store.roles().filter(function (r) { return r.status === 1; }).map(function (r) {
        return {
          id: r.id, code: r.code, name: r.name, remark: r.remark,
          checked: roleIdsOfUser(user).indexOf(String(r.id)) >= 0
        };
      });
      var perms = Store.permissionsOf(user.id).map(function (p) { return p.code; });
      return ok({
        user: {
          id: user.id, account: user.account, name: user.name,
          phone: user.phone, status: user.status
        },
        roles: allRoles,
        permissions: perms
      });
    },

    createUser: function (data) {
      var g = guard('USER:ADD');
      if (g) { return fail(g.code, g.message); }
      data = data || {};
      var account = String(data.account || '').trim();
      var name = String(data.name || '').trim();
      if (!validAccount(account)) { return fail(400, '账号需为 3–32 位字母、数字、下划线或短横线'); }
      if (!name) { return fail(400, '请填写姓名'); }
      if (Store.findUserByAccount(account)) { return fail(409, '账号已存在'); }

      var list = Store.users();
      var id = 1;
      list.forEach(function (u) { id = Math.max(id, Number(u.id) + 1); });
      var user = {
        id: id,
        account: account,
        password: String(data.password || '123456'),
        name: name,
        phone: String(data.phone || '').trim(),
        status: 1,
        roleIds: []
      };
      list.push(user);
      Store.saveUsers(list);
      return ok({
        id: user.id, account: user.account, name: user.name,
        phone: user.phone, status: user.status, roleIds: user.roleIds
      });
    },

    updateUser: function (id, data) {
      var g = guard('USER:EDIT');
      if (g) { return fail(g.code, g.message); }
      var list = Store.users();
      var user = byId(list, id);
      if (!user) { return fail(404, '用户不存在'); }
      if (data.name !== undefined) {
        if (!String(data.name).trim()) { return fail(400, '姓名不能为空'); }
        user.name = String(data.name).trim();
      }
      if (data.phone !== undefined) { user.phone = String(data.phone).trim(); }
      Store.saveUsers(list);
      return ok({
        id: user.id, account: user.account, name: user.name,
        phone: user.phone, status: user.status, roleIds: user.roleIds
      });
    },

    setUserStatus: function (id, status) {
      var g = guard('USER:EDIT');
      if (g) { return fail(g.code, g.message); }
      var me = Store.currentUser();
      if (String(me.id) === String(id) && Number(status) !== 1) {
        return fail(400, '不能停用当前登录账号');
      }
      var list = Store.users();
      var user = byId(list, id);
      if (!user) { return fail(404, '用户不存在'); }
      user.status = Number(status) === 1 ? 1 : 0;
      Store.saveUsers(list);
      if (user.status === 0) { Store.logoutUser(user.id); }
      return ok({ id: user.id, account: user.account, name: user.name, status: user.status });
    },

    resetPassword: function (id) {
      var g = guard('USER:EDIT');
      if (g) { return fail(g.code, g.message); }
      var list = Store.users();
      var user = byId(list, id);
      if (!user) { return fail(404, '用户不存在'); }
      user.password = '123456';
      Store.saveUsers(list);
      Store.logoutUser(user.id);
      return ok(true);
    },

    deleteUser: function (id) {
      var g = guard('USER:DELETE');
      if (g) { return fail(g.code, g.message); }
      var me = Store.currentUser();
      if (String(me.id) === String(id)) { return fail(400, '不能删除当前登录账号'); }
      var list = Store.users();
      var user = byId(list, id);
      if (!user) { return fail(404, '用户不存在'); }
      Store.saveUsers(list.filter(function (u) { return String(u.id) !== String(id); }));
      Store.logoutUser(id);
      return ok(true);
    },

    setUserRoles: function (id, roleIds) {
      var g = guard('USER:ASSIGN_ROLE');
      if (g) { return fail(g.code, g.message); }
      var list = Store.users();
      var user = byId(list, id);
      if (!user) { return fail(404, '用户不存在'); }
      var all = Store.roles();
      var ids = (roleIds || []).map(Number);
      for (var i = 0; i < ids.length; i++) {
        var role = byId(all, ids[i]);
        if (!role || role.status !== 1) { return fail(400, '包含不存在或已停用的角色'); }
      }
      user.roleIds = ids;
      Store.saveUsers(list);
      var me = Store.currentUser();
      var isSelf = me && String(me.id) === String(id);
      Store.logoutUser(id);
      return ok({ self: !!isSelf });
    },

    /* ---------- 角色 ---------- */

    listRoles: function (filter) {
      var g = guard('ROLE:VIEW');
      if (g) { return fail(g.code, g.message); }
      filter = filter || {};
      var keyword = String(filter.keyword || '').trim().toLowerCase();
      var users = Store.users();
      var rows = Store.roles().filter(function (r) {
        if (!keyword) { return true; }
        return String(r.code).toLowerCase().indexOf(keyword) >= 0 ||
               String(r.name).toLowerCase().indexOf(keyword) >= 0;
      }).map(function (r) {
        var members = users.filter(function (u) {
          return roleIdsOfUser(u).indexOf(String(r.id)) >= 0;
        }).length;
        return Object.assign({}, r, { memberCount: members, permCount: (r.permIds || []).length });
      });
      return ok({ total: rows.length, rows: rows });
    },

    getRole: function (id) {
      var g = guard('ROLE:VIEW');
      if (g) { return fail(g.code, g.message); }
      var role = byId(Store.roles(), id);
      if (!role) { return fail(404, '角色不存在'); }
      var perms = MOCK.permissions.map(function (p) {
        return Object.assign({}, p, { checked: (role.permIds || []).indexOf(p.id) >= 0 });
      });
      var members = Store.users().filter(function (u) {
        return roleIdsOfUser(u).indexOf(String(role.id)) >= 0;
      }).map(function (u) {
        return { id: u.id, account: u.account, name: u.name, status: u.status };
      });
      return ok({ role: role, permissions: perms, members: members });
    },

    createRole: function (data) {
      var g = guard('ROLE:ADD');
      if (g) { return fail(g.code, g.message); }
      data = data || {};
      var code = String(data.code || '').trim().toUpperCase();
      var name = String(data.name || '').trim();
      if (!/^[A-Z][A-Z0-9_]{1,31}$/.test(code)) {
        return fail(400, '角色编码需为 2–32 位大写字母、数字或下划线，且以字母开头');
      }
      if (!name) { return fail(400, '请填写角色名称'); }
      var list = Store.roles();
      if (list.some(function (r) { return r.code === code; })) { return fail(409, '角色编码已存在'); }
      var id = 1;
      list.forEach(function (r) { id = Math.max(id, Number(r.id) + 1); });
      var role = {
        id: id, code: code, name: name,
        remark: String(data.remark || '').trim(),
        status: 1, permIds: []
      };
      list.push(role);
      Store.saveRoles(list);
      return ok(role);
    },

    updateRole: function (id, data) {
      var g = guard('ROLE:EDIT');
      if (g) { return fail(g.code, g.message); }
      var list = Store.roles();
      var role = byId(list, id);
      if (!role) { return fail(404, '角色不存在'); }
      if (data.name !== undefined) {
        if (!String(data.name).trim()) { return fail(400, '角色名称不能为空'); }
        role.name = String(data.name).trim();
      }
      if (data.remark !== undefined) { role.remark = String(data.remark).trim(); }
      if (data.status !== undefined) { role.status = Number(data.status) === 0 ? 0 : 1; }
      Store.saveRoles(list);
      return ok(role);
    },

    deleteRole: function (id) {
      var g = guard('ROLE:DELETE');
      if (g) { return fail(g.code, g.message); }
      var list = Store.roles();
      var role = byId(list, id);
      if (!role) { return fail(404, '角色不存在'); }
      var used = Store.users().some(function (u) {
        return roleIdsOfUser(u).indexOf(String(id)) >= 0;
      });
      if (used) { return fail(400, '该角色仍有用户，不能删除'); }
      Store.saveRoles(list.filter(function (r) { return String(r.id) !== String(id); }));
      return ok(true);
    },

    setRolePerms: function (id, permIds) {
      var g = guard('ROLE:ASSIGN_PERM');
      if (g) { return fail(g.code, g.message); }
      var list = Store.roles();
      var role = byId(list, id);
      if (!role) { return fail(404, '角色不存在'); }
      var ids = (permIds || []).map(Number);
      for (var i = 0; i < ids.length; i++) {
        if (!byId(MOCK.permissions, ids[i])) { return fail(400, '包含不存在的权限'); }
      }
      role.permIds = ids;
      Store.saveRoles(list);
      var me = Store.currentUser();
      var affected = me && (roleIdsOfUser(me).indexOf(String(id)) >= 0);
      return ok({ selfAffected: !!affected });
    },

    /* ---------- 权限 ---------- */

    listPermissions: function (filter) {
      var g = guard('PERM:VIEW');
      if (g) { return fail(g.code, g.message); }
      filter = filter || {};
      var sys = filter.sys || '';
      var keyword = String(filter.keyword || '').trim().toLowerCase();
      var rows = MOCK.permissions.filter(function (p) {
        if (sys && p.sys !== sys) { return false; }
        if (!keyword) { return true; }
        return [p.code, p.sysName, p.module, p.fn, p.opName].join(' ').toLowerCase().indexOf(keyword) >= 0;
      });
      return ok({ total: rows.length, rows: rows });
    },

    listSystems: function () {
      var g = guard('PERM:VIEW');
      if (g) { return fail(g.code, g.message); }
      var seen = {};
      var out = [];
      MOCK.permissions.forEach(function (p) {
        if (seen[p.sys]) { return; }
        seen[p.sys] = true;
        out.push({ code: p.sys, name: p.sysName });
      });
      return ok(out);
    },

    /* ---------- 业务演示页 ---------- */

    report: function () {
      var g = guard('FIN:RPT:VIEW');
      if (g) { return fail(g.code, g.message); }
      return ok({
        rows: MOCK.report,
        canExport: Store.hasPerm(Store.currentUser().id, 'FIN:RPT:EXPORT')
      });
    },

    dict: function () {
      return ok({ opName: MOCK.opName });
    }
  };
})();
