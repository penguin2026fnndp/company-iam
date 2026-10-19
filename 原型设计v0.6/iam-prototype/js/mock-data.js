/* 第一次检查（RBAC0）的初始数据。
   页面不直接引用本文件，统一经 js/api.js 读取。
   真实系统中这些数据来自数据库，本文件只负责首次播种。 */
window.MOCK = (function () {
  var OP_NAME = {
    VIEW: '查看', ADD: '新增', EDIT: '编辑', DELETE: '删除',
    ASSIGN: '分配', EXPORT: '导出'
  };

  /* [权限码, 系统编码, 系统名, 模块, 功能点, 操作码] */
  var seed = [
    ['USER:VIEW',        'IAM', '权限中心', '用户管理', '用户',       'VIEW'],
    ['USER:ADD',         'IAM', '权限中心', '用户管理', '用户',       'ADD'],
    ['USER:EDIT',        'IAM', '权限中心', '用户管理', '用户',       'EDIT'],
    ['USER:DELETE',      'IAM', '权限中心', '用户管理', '用户',       'DELETE'],
    ['USER:ASSIGN_ROLE', 'IAM', '权限中心', '用户管理', '用户角色',   'ASSIGN'],
    ['ROLE:VIEW',        'IAM', '权限中心', '角色管理', '角色',       'VIEW'],
    ['ROLE:ADD',         'IAM', '权限中心', '角色管理', '角色',       'ADD'],
    ['ROLE:EDIT',        'IAM', '权限中心', '角色管理', '角色',       'EDIT'],
    ['ROLE:DELETE',      'IAM', '权限中心', '角色管理', '角色',       'DELETE'],
    ['ROLE:ASSIGN_PERM', 'IAM', '权限中心', '角色管理', '角色权限',   'ASSIGN'],
    ['PERM:VIEW',        'IAM', '权限中心', '权限目录', '权限',       'VIEW'],
    ['ME:VIEW',          'IAM', '权限中心', '我的权限', '我的权限',   'VIEW'],
    ['OA:DOC:VIEW',      'OA',  'OA系统',   '公文管理', '收文登记',   'VIEW'],
    ['OA:DOC:ADD',       'OA',  'OA系统',   '公文管理', '收文登记',   'ADD'],
    ['PM:COST:VIEW',     'PM',  '项目系统', '成本管理', '成本报表',   'VIEW'],
    ['FIN:RPT:VIEW',     'FIN', '财务系统', '财务报表', '财务报表',   'VIEW'],
    ['FIN:RPT:EXPORT',   'FIN', '财务系统', '财务报表', '财务报表',   'EXPORT']
  ];

  var permissions = seed.map(function (p, i) {
    return {
      id: i + 1,
      code: p[0],
      sys: p[1],
      sysName: p[2],
      module: p[3],
      fn: p[4],
      op: p[5],
      opName: OP_NAME[p[5]]
    };
  });

  var allPermIds = permissions.map(function (p) { return p.id; });

  var roles = [
    {
      id: 1, code: 'ADMIN', name: '系统管理员',
      remark: '拥有全部权限，负责用户、角色与权限维护',
      status: 1, permIds: allPermIds.slice()
    },
    {
      id: 2, code: 'MGR', name: '部门主管',
      remark: '可查看用户与角色，可查看部分业务报表',
      status: 1, permIds: [1, 6, 11, 12, 13, 14, 15, 16]
    },
    {
      id: 3, code: 'EMP', name: '普通员工',
      remark: '仅基础查看权限',
      status: 1, permIds: [12, 13]
    }
  ];

  var users = [
    {
      id: 1, account: 'SG900001', password: '123456', name: '系统管理员',
      phone: '13800000001', status: 1, roleIds: [1]
    },
    {
      id: 2, account: 'SG000101', password: '123456', name: '张伟',
      phone: '13800000101', status: 1, roleIds: [2]
    },
    {
      id: 3, account: 'SG000102', password: '123456', name: '李四',
      phone: '13800000102', status: 1, roleIds: [3]
    }
  ];

  /* 菜单只声明“需要哪枚权限码”，可见性由 Api 计算 */
  var menus = [
    { group: '我的工作', path: '/perms', label: '我的权限', perm: 'ME:VIEW' },
    { group: '我的工作', path: '/report', label: '财务报表', perm: 'FIN:RPT:VIEW' },
    { group: '系统管理', path: '/users', label: '用户管理', perm: 'USER:VIEW' },
    { group: '系统管理', path: '/roles', label: '角色管理', perm: 'ROLE:VIEW' },
    { group: '系统管理', path: '/permissions', label: '权限目录', perm: 'PERM:VIEW' }
  ];

  var report = [
    { project: '城北道路改造', budget: 1200, spent: 860, rate: 71.7, status: '正常' },
    { project: '跨江桥梁加固', budget: 800, spent: 905, rate: 113.1, status: '超支' },
    { project: '老城区管网更新', budget: 560, spent: 310, rate: 55.4, status: '正常' },
    { project: '主干道绿化提升', budget: 300, spent: 268, rate: 89.3, status: '预警' },
    { project: '智慧交通一期', budget: 1500, spent: 720, rate: 48.0, status: '正常' }
  ];

  return {
    permissions: permissions,
    roles: roles,
    users: users,
    menus: menus,
    report: report,
    opName: OP_NAME
  };
})();
