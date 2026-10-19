/* 暂存层：只负责持久化与 RBAC0 的关系计算。
   业务校验放在 api.js，页面只调用 Api。 */
window.Store = (function () {
  var K = {
    users: 'iam.rbac.users',
    roles: 'iam.rbac.roles',
    session: 'iam.rbac.session',
    lock: 'iam.rbac.lock',
    seeded: 'iam.rbac.seeded'
  };
  var MAX_FAIL = 5;
  var LOCK_MS = 15 * 60 * 1000;

  function read(key, def) {
    try {
      var v = localStorage.getItem(key);
      return v ? JSON.parse(v) : def;
    } catch (e) {
      return def;
    }
  }

  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
  }

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function uid() {
    if (window.crypto && crypto.randomUUID) { return crypto.randomUUID(); }
    return 's-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  function seed() {
    var seeded = read(K.seeded, false);
    var savedUsers = read(K.users, null);
    var savedRoles = read(K.roles, null);
    if (seeded && Array.isArray(savedUsers) && savedUsers.length &&
        Array.isArray(savedRoles) && savedRoles.length) {
      return;
    }
    write(K.users, clone(MOCK.users));
    write(K.roles, clone(MOCK.roles));
    write(K.seeded, true);
  }

  function users() { seed(); return read(K.users, []); }
  function roles() { seed(); return read(K.roles, []); }
  function saveUsers(list) { write(K.users, list); }
  function saveRoles(list) { write(K.roles, list); }

  function findUserByAccount(account) {
    var list = users();
    var key = String(account || '').trim().toLowerCase();
    for (var i = 0; i < list.length; i++) {
      if (String(list[i].account).toLowerCase() === key) { return list[i]; }
    }
    return null;
  }

  function findUserById(id) {
    var list = users();
    for (var i = 0; i < list.length; i++) {
      if (String(list[i].id) === String(id)) { return list[i]; }
    }
    return null;
  }

  function endOfToday() {
    var d = new Date();
    d.setHours(23, 59, 59, 999);
    return d.getTime();
  }

  function login(account, password) {
    seed();
    account = String(account || '').trim();
    var lockKey = account.toUpperCase();
    var lock = read(K.lock, {});
    var rec = lock[lockKey];

    if (rec && rec.until && rec.until > Date.now()) {
      return {
        ok: false, code: 'LOCKED',
        message: '账号已锁定，请 ' + Math.ceil((rec.until - Date.now()) / 60000) + ' 分钟后重试'
      };
    }

    var user = findUserByAccount(account);
    if (!user || user.password !== password || user.status !== 1) {
      rec = rec || { count: 0 };
      if (!rec.until || rec.until <= Date.now()) { rec.count = (rec.count || 0) + 1; }
      if (rec.count >= MAX_FAIL) {
        rec.until = Date.now() + LOCK_MS;
        rec.count = 0;
      }
      lock[lockKey] = rec;
      write(K.lock, lock);
      var left = MAX_FAIL - (rec.count || 0);
      return {
        ok: false, code: 'BAD',
        message: rec.until && rec.until > Date.now()
          ? '连续失败 5 次，账号锁定 15 分钟'
          : '账号或密码不正确，还可尝试 ' + left + ' 次'
      };
    }

    delete lock[lockKey];
    write(K.lock, lock);
    write(K.session, {
      id: uid(),
      userId: user.id,
      issuedAt: Date.now(),
      expireAt: endOfToday()
    });
    return { ok: true, user: user };
  }

  function logout() {
    try { localStorage.removeItem(K.session); } catch (e) {}
  }

  function logoutUser(userId) {
    var s = read(K.session, null);
    if (s && String(s.userId) === String(userId)) { logout(); }
  }

  function currentSession() {
    var s = read(K.session, null);
    if (!s) { return null; }
    if (!s.expireAt || s.expireAt <= Date.now()) { logout(); return null; }
    return s;
  }

  function currentUser() {
    var s = currentSession();
    if (!s) { return null; }
    var user = findUserById(s.userId);
    if (!user || user.status !== 1) { logout(); return null; }
    return user;
  }

  function rolesOf(userId) {
    var user = findUserById(userId);
    if (!user) { return []; }
    var ids = (user.roleIds || []).map(String);
    return roles().filter(function (r) {
      return r.status === 1 && ids.indexOf(String(r.id)) >= 0;
    });
  }

  function permissionsOf(userId) {
    var roleList = rolesOf(userId);
    var seen = {};
    var out = [];
    roleList.forEach(function (role) {
      (role.permIds || []).forEach(function (pid) {
        if (seen[pid]) { return; }
        var p = null;
        for (var i = 0; i < MOCK.permissions.length; i++) {
          if (MOCK.permissions[i].id === pid) { p = MOCK.permissions[i]; break; }
        }
        if (p) { seen[pid] = true; out.push(p); }
      });
    });
    return out;
  }

  function permCodes(userId) {
    return permissionsOf(userId).map(function (p) { return p.code; });
  }

  function hasPerm(userId, code) {
    return permCodes(userId).indexOf(code) >= 0;
  }

  function menusOf(userId) {
    return MOCK.menus.filter(function (m) { return hasPerm(userId, m.perm); });
  }

  function reset() {
    [K.users, K.roles, K.session, K.lock, K.seeded].forEach(function (k) {
      try { localStorage.removeItem(k); } catch (e) {}
    });
  }

  return {
    users: users,
    roles: roles,
    saveUsers: saveUsers,
    saveRoles: saveRoles,
    findUserByAccount: findUserByAccount,
    findUserById: findUserById,
    login: login,
    logout: logout,
    logoutUser: logoutUser,
    currentSession: currentSession,
    currentUser: currentUser,
    rolesOf: rolesOf,
    permissionsOf: permissionsOf,
    permCodes: permCodes,
    hasPerm: hasPerm,
    menusOf: menusOf,
    reset: reset
  };
})();
