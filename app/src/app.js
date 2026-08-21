/*
 * app.js —— UI / DOM 层。调用 AppStore + AppCore，负责渲染与交互。
 * 通过 window.App 暴露关键入口，便于自动化测试。
 */
(function () {
  'use strict';

  var C = (typeof AppCore !== 'undefined') ? AppCore : require('./core.js');
  var AppStoreLib = (typeof AppStore !== 'undefined') ? AppStore : require('./store.js');
  var AppCloudLib = (typeof AppCloud !== 'undefined') ? AppCloud : require('./cloud.js');

  // 是否云端只读版：构建只读版时注入 global.READONLY_MODE = true
  // 只读版强制全只读（连请假/通报也不可操作），并定时从云端拉取刷新
  var READONLY_MODE = (typeof global !== 'undefined' && global.READONLY_MODE) ||
    (typeof window !== 'undefined' && window.READONLY_MODE) || false;
  // 是否APK环境（Capacitor）：未登录时也自动从云端拉取同步，登录后可编辑推送
  var IS_APK = (typeof window !== 'undefined' && (window.Capacitor || (navigator && navigator.userAgent && /Capacitor|Android.*wv/i.test(navigator.userAgent)))) || false;
  var CLOUD_REFRESH_MS = 30000; // 只读版每 30 秒从云端拉取一次
  // 同步状态缓存：{ lastPushAt: string|null, lastError: string|null, busy: bool, lastPullAt: Date|null }
  var cloudStatus = { lastPushAt: null, lastError: null, busy: false, lastPullAt: null };
  var CLOUD_STORAGE_KEY = 'STUDENT_ADMIN_CLOUD_LAST_PUSH';
  // 单设备登录：设备ID（localStorage 持久化）+ 云端登录会话（settings.loginSession）
  var DEVICE_ID_KEY = 'STUDENT_ADMIN_DEVICE_ID';
  function getDeviceId() {
    try {
      var id = localStorage.getItem(DEVICE_ID_KEY);
      if (!id) {
        id = 'dev_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
        localStorage.setItem(DEVICE_ID_KEY, id);
      }
      return id;
    } catch (e) { return 'dev_unknown'; }
  }
  // 更新云端登录会话（标记当前设备为活跃登录）
  function updateLoginSession(role) {
    if (!cloudAdminPassword || !AppCloudLib) return;
    var st = store.getState();
    if (!st.settings) st.settings = {};
    st.settings.loginSession = { deviceId: getDeviceId(), loginAt: new Date().toISOString(), role: role || adminRole || 'full' };
    store.save(); // 会触发自动推送
  }
  // 检查登录会话（已禁用多端互踢，允许APK和网页版同时登录实时同步）
  function checkLoginSession(payload) {
    // 不再自动退出，保留函数占位以兼容旧调用
  }
  // 云端管理员登录态（仅网页版使用）：保存登录后的密码内存态，用于后续保存到云端
  var cloudAdminPassword = null;
  var cloudAdminVerified = false;
  // 自动云端同步：管理员每次修改数据后自动推送到云端（防抖，静默，失败不打扰）
  var autoPushTimer = null;
  function scheduleAutoPush() {
    if (!isAdmin || !cloudAdminPassword || !AppCloudLib || cloudStatus.busy) return;
    if (autoPushTimer) clearTimeout(autoPushTimer);
    autoPushTimer = setTimeout(doAutoPush, 800);
  }
  function doAutoPush() {
    autoPushTimer = null;
    if (!isAdmin || !cloudAdminPassword || !AppCloudLib) return;
    if (cloudStatus.busy) { scheduleAutoPush(); return; }
    cloudStatus.busy = true;
    updateCloudUI();
    var payload = store.getState();
    var doPush = AppCloudLib.adminWrite
      ? AppCloudLib.adminWrite(payload, cloudAdminPassword)
      : AppCloudLib.push(payload, cloudAdminPassword);
    doPush.then(function () {
      setCloudLastPush(C.todayStr() + ' ' + new Date().toTimeString().slice(0, 8));
      cloudStatus.lastError = null;
      cloudStatus.busy = false;
      updateCloudUI();
    }).catch(function (err) {
      cloudStatus.lastError = err.message;
      cloudStatus.busy = false;
      updateCloudUI();
    });
  }
  // 管理员登录持久化：刷新后保持登录，除非手动退出
  var ADMIN_LOGIN_KEY = 'STUDENT_ADMIN_LOGIN';

  var doc = null;
  var store = null;
  var state = { current: 'home' };
  // 请假名单 / 每日通报的输入框与结果内容：跳转界面时保留（仅内存缓存，关闭页面自然清空）
  var leaveRawCache = '';
  var leaveResultCache = '';
  var reportRawCache = '';
  var reportResultCache = '';

  // xlsx（Excel 解析）懒加载：本地版已内联直接可用；云端版不内联，
  // 首次真正导入 .xlsx/.xls 文件时才动态加载 unpkg CDN，避免阻塞首屏渲染。
  var _xlsxPromise = null;
  function ensureXlsx() {
    if (typeof XLSX !== 'undefined') return Promise.resolve();
    if (_xlsxPromise) return _xlsxPromise;
    _xlsxPromise = new Promise(function (resolve, reject) {
      var s = doc.createElement('script');
      s.src = 'https://unpkg.com/xlsx@0.18.5/dist/xlsx.full.min.js';
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error('Excel 解析库加载失败，请检查网络后重试')); };
      (doc.head || doc.documentElement).appendChild(s);
    });
    return _xlsxPromise;
  }
  // 权限：isAdmin=false 为普通模式（仅请假/通报可操作，其余只读）；true 为管理员（全功能）
  var isAdmin = false;
  // 管理员角色：'full' 全权限（可改一切）/ 'limited' 受限（不可改学生信息、数据与设置，其余可用）/ null 非管理员
  var adminRole = null;

  // ---------- 权限守卫 ----------
  function getAdminPass() { return (store && store.getState().settings.adminPass) || null; }
  function setAdminPass(p) { store.getState().settings.adminPass = p; store.save(); }
  // 管理员是否已初始化密码
  function hasAdminPass() { return !!getAdminPass(); }
  // 二级管理员不可修改学生信息
  function canEditStudents() { return isAdmin && adminRole !== 'limited'; }
  // 二级管理员不可修改数据与设置
  function canEditSettings() { return isAdmin && adminRole !== 'limited'; }
  // 普通模式守卫：非管理员且操作被拦截时给出提示，返回 false
  function guardAdmin(actionName) {
    if (isAdmin) return true;
    if (typeof alert === 'function') alert('当前为只读模式，此操作（' + (actionName || '修改数据') + '）需要管理员登录后使用。');
    return false;
  }
  // 受限守卫：仅全权限管理员可执行（学生信息 / 数据与设置相关操作）
  function guardFull(actionName) {
    if (isAdmin && adminRole !== 'limited') return true;
    if (isAdmin && adminRole === 'limited') {
      if (typeof alert === 'function') alert('当前为二级管理员，此操作（' + (actionName || '修改数据') + '）需要全权限管理员。');
      return false;
    }
    if (typeof alert === 'function') alert('当前为只读模式，此操作（' + (actionName || '修改数据') + '）需要管理员登录后使用。');
    return false;
  }
  // 打开管理员登录 / 首次设置密码 弹窗
  // 云端网页版（READONLY_MODE）走云端密码校验（verify_admin RPC），
  // 校验通过后 isAdmin=true 并记住密码供“保存到云端”使用；
  // 本地版保持原有本地密码逻辑。
  function openAdminGate() {
    // 云端网页版：管理员登录（校验云端密码）
    if (READONLY_MODE) {
      var cp = el('input', { type: 'password', id: 'admin-pass-input', placeholder: '请输入管理员密码' });
      var cerr = el('p', { class: 'muted', style: 'color:#e5484d;min-height:1.2em', id: 'admin-pass-err' });
      var btnLogin = el('button', { class: 'btn primary', type: 'button' }, ['登录']);
      var loginMask = openModal('管理员登录（云端）', [
        el('div', { class: 'form-row' }, [el('label', { text: '密码' }), cp]),
        cerr,
        el('div', { class: 'toolbar', style: 'margin-top:4px' }, [btnLogin])
      ], null, null, true);
      btnLogin.onclick = function () {
        var v = cp.value.trim();
        if (!v) { cerr.textContent = '请输入密码'; return; }
        if (!AppCloudLib || !AppCloudLib.verifyAdmin) { cerr.textContent = '云端模块未加载'; return; }
        btnLogin.disabled = true;
        cerr.textContent = '验证中…';
        AppCloudLib.verifyAdmin(v).then(function (role) {
          // verify_admin 返回角色：'full' 全权限 / 'limited' 受限 / 其他（密码错误）
          if (role === 'full' || role === 'limited') {
            cloudAdminPassword = v;
            cloudAdminVerified = true;
            isAdmin = true;
            adminRole = role;
            persistAdminLogin(v, role);
            updateLoginSession(role);
            closeModal(loginMask);
            refresh();
          } else if (role === true) {
            // 兼容旧版 SQL（verify_admin 仅返回布尔）：一律视为全权限
            cloudAdminPassword = v;
            cloudAdminVerified = true;
            isAdmin = true;
            adminRole = 'full';
            persistAdminLogin(v, 'full');
            updateLoginSession('full');
            closeModal(loginMask);
            refresh();
          } else {
            btnLogin.disabled = false;
            cerr.textContent = '密码错误，请重试';
          }
        }).catch(function (err) {
          btnLogin.disabled = false;
          cerr.textContent = '验证失败：' + (err && err.message ? err.message : '网络错误');
        });
      };
      return;
    }
    var pass = el('input', { type: 'password', id: 'admin-pass-input', placeholder: hasAdminPass() ? '请输入管理员密码' : '请设置管理员密码（至少4位）' });
    var err = el('p', { class: 'muted', style: 'color:#e5484d;min-height:1.2em', id: 'admin-pass-err' });
    openModal(hasAdminPass() ? '管理员登录' : '设置管理员密码', [
      el('div', { class: 'form-row' }, [el('label', { text: hasAdminPass() ? '密码' : '新密码' }), pass]),
      err
    ], function () {
      var v = pass.value.trim();
      if (!v) { err.textContent = '请输入密码'; return false; }
      if (!hasAdminPass()) {
        if (v.length < 4) { err.textContent = '密码至少 4 位'; return false; }
        setAdminPass(v);
        isAdmin = true;
        adminRole = 'full';
        persistAdminLogin(v, 'full');
        // 首次设置密码时也尝试云端校验，启用自动同步
        if (AppCloudLib && AppCloudLib.verifyAdmin) {
          AppCloudLib.verifyAdmin(v).then(function (role) {
            if (role === 'full' || role === 'limited' || role === true) {
              cloudAdminPassword = v;
              cloudAdminVerified = true;
              updateCloudUI();
              updateLoginSession('full');
              pullFromCloudSilent();
            }
          }).catch(function () {});
        }
        refresh();
        return true;
      }
      if (v === getAdminPass()) {
        isAdmin = true;
        adminRole = 'full';
        persistAdminLogin(null, 'full');
        // 本地版登录后尝试云端校验：若该密码同时是云端管理员密码，则启用自动云端同步
        if (AppCloudLib && AppCloudLib.verifyAdmin) {
          AppCloudLib.verifyAdmin(v).then(function (role) {
            if (role === 'full' || role === 'limited' || role === true) {
              cloudAdminPassword = v;
              cloudAdminVerified = true;
              updateCloudUI();
              updateLoginSession('full');
              // 登录后立即拉取一次云端数据，保持同步
              pullFromCloudSilent();
            }
          }).catch(function () { /* 云端不可用时静默，不影响本地使用 */ });
        }
        refresh();
        return true;
      }
      // 二级管理员登录（多个二级管理员中任一密码匹配；仅查看权限）
      if (getSecondaryAdmins().some(function (a) { return v === a.pwd; })) {
        isAdmin = true;
        adminRole = 'limited';
        persistAdminLogin(null, 'limited');
        // 二级管理员也尝试云端校验，启用只读同步
        if (AppCloudLib && AppCloudLib.verifyAdmin) {
          AppCloudLib.verifyAdmin(v).then(function (role) {
            if (role === 'full' || role === 'limited' || role === true) {
              cloudAdminPassword = v;
              cloudAdminVerified = true;
              updateCloudUI();
              updateLoginSession('limited');
              pullFromCloudSilent();
            }
          }).catch(function () {});
        }
        refresh();
        return true;
      }
      err.textContent = '密码错误，请重试';
      return false;
    }, hasAdminPass() ? '登录' : '设置并进入');
  }
  function openSetAdminPass() {
    if (!guardFull('修改管理员密码')) return;
    var pass = el('input', { type: 'password', id: 'admin-pass-set' });
    var pass2 = el('input', { type: 'password', id: 'admin-pass-set2' });
    var err = el('p', { class: 'muted', style: 'color:#e5484d;min-height:1.2em' });
    openModal('修改管理员密码', [
      el('div', { class: 'form-row' }, [el('label', { text: '新密码' }), pass]),
      el('div', { class: 'form-row' }, [el('label', { text: '确认新密码' }), pass2]),
      err
    ], function () {
      var v = pass.value.trim(), v2 = pass2.value.trim();
      if (!v || v.length < 4) { err.textContent = '密码至少 4 位'; return false; }
      if (v !== v2) { err.textContent = '两次输入不一致'; return false; }
      setAdminPass(v);
      if (typeof alert === 'function') alert('管理员密码已更新');
      return true;
    }, '保存');
  }
  function logoutAdmin() { isAdmin = false; adminRole = null; cloudAdminPassword = null; cloudAdminVerified = false; clearAdminLogin(); refresh(); }

  // ---- 管理员登录持久化：刷新保持登录，除非手动退出 ----
  function persistAdminLogin(pwd, role) {
    try { if (typeof localStorage !== 'undefined') localStorage.setItem(ADMIN_LOGIN_KEY, JSON.stringify({ adminLoggedIn: true, adminPwd: pwd || null, adminRole: role || 'full' })); } catch (e) {}
  }
  function clearAdminLogin() {
    try { if (typeof localStorage !== 'undefined') localStorage.removeItem(ADMIN_LOGIN_KEY); } catch (e) {}
  }
  function restoreAdminLogin() {
    try {
      if (typeof localStorage === 'undefined') return false;
      var raw = localStorage.getItem(ADMIN_LOGIN_KEY);
      if (!raw) return false;
      var d = JSON.parse(raw);
      if (d && d.adminLoggedIn) {
        isAdmin = true;
        // 兼容旧版持久化数据（无 adminRole 字段）：默认视为全权限
        adminRole = (d.adminRole === 'limited') ? 'limited' : 'full';
        if (d.adminPwd) { cloudAdminPassword = d.adminPwd; cloudAdminVerified = true; }
        return true;
      }
    } catch (e) {}
    return false;
  }

  // ---------- DOM helpers ----------
  function el(tag, props, children) {
    var node = doc.createElement(tag);
    props = props || {};
    Object.keys(props).forEach(function (k) {
      if (k === 'class') node.className = props[k];
      else if (k === 'text') node.textContent = props[k];
      else if (k === 'html') node.innerHTML = props[k];
      else if (k === 'onclick') node.addEventListener('click', props[k]);
      else if (k === 'onchange') node.addEventListener('change', props[k]);
      else if (k === 'oninput') node.addEventListener('input', props[k]);
      else if (k === 'value') node.value = props[k];
      else if (k === 'disabled') { if (props[k]) node.setAttribute('disabled', 'disabled'); }
      else node.setAttribute(k, props[k]);
    });
    (children || []).forEach(function (c) {
      if (c == null) return;
      if (typeof c === 'string') node.appendChild(doc.createTextNode(c));
      else node.appendChild(c);
    });
    return node;
  }
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }
  function $(sel) { return doc.querySelector(sel); }

  // ---------- Liquid Glass 图标（macOS SF Symbols 风格，替代 Emoji） ----------
  var LG_ICONS = {
    home: '<svg class="lg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/></svg>',
    students: '<svg class="lg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.6"/><path d="M5 20c.6-3.6 3.4-5.4 7-5.4s6.4 1.8 7 5.4"/></svg>',
    score: '<svg class="lg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-8"/><path d="M22 20H2"/></svg>',
    discipline: '<svg class="lg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3v18"/><path d="M6 4h9a3 3 0 0 1 0 6H6"/><path d="M6 11h11a3 3 0 0 1 0 6H6"/></svg>',
    leave: '<svg class="lg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16v16H4z"/><path d="M4 9h16"/><path d="M8 13h4"/><path d="M8 16h7"/></svg>',
    report: '<svg class="lg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l4-6 4 8 4-5 6 8"/><path d="M3 20h18"/></svg>',
    employee: '<svg class="lg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.2"/><path d="M3 20c.5-3.4 3-5 6-5s5.5 1.6 6 5"/><path d="M16 11l2 2 4-4"/></svg>',
    settings: '<svg class="lg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3.2"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.3 5.3l1.7 1.7M17 17l1.7 1.7M18.7 5.3 17 7M7 17l-1.7 1.7"/></svg>',
    dorm: '<svg class="lg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2"/></svg>',
    duty: '<svg class="lg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><circle cx="12" cy="15" r="2.2"/><path d="M12 13v2l1.4 1"/></svg>',
    dutyStaff: '<svg class="lg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="3.6"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>'
  };

  // ---------- 模块注册 ----------
  var MODULES = {
    home: { title: '首页', render: renderHome },
    students: { title: '学生信息', render: renderStudents },
    score: { title: '量化管理分', render: renderScore },
    discipline: { title: '违纪次数', render: renderDiscipline },
    leave: { title: '请假名单', render: renderLeave },
    report: { title: '每日通报', render: renderReport },
    employee: { title: '教官绩效', render: renderEmployee },
    duty: { title: '值班排班', render: renderDutySchedule },
    dutyStaff: { title: '员工管理', render: renderDutyStaff },
    salary: { title: '员工工资', render: renderSalary },
    settings: { title: '数据与设置', render: renderSettings },
    dorm: { title: '寝室数据', render: renderDormRoom }
  };

  // ---------- 初始化与骨架 ----------
  function init(rootDoc, backend) {
    doc = rootDoc || (typeof document !== 'undefined' ? document : null);
    store = AppStoreLib.createStore(backend || AppStoreLib.localStorageBackend());
    // 本地存储写入失败（如配额不足）时提示用户
    if (typeof window !== 'undefined') {
      window.onStoreSaveError = function (e) {
        if (typeof alert === 'function') alert('本地数据保存失败（可能存储空间不足）：' + e.message + '\n建议立即导出备份，清理空间后再使用。');
      };
    }
    try { store.load(); } catch (e) {
      // 本地数据损坏：给出提示，不覆盖，等待用户从备份恢复
      if (typeof alert === 'function') alert('本地数据读取失败：' + e.message + '\n请用“导入恢复”从备份还原。');
    }
    // 数据迁移：自动归一化所有学生的班级格式（一（1）→ 高一（1班））
    (function migrateClassFormat() {
      try {
        var st = store.getState();
        if (migrateClassFormatInPlace(st)) store.save();
      } catch (e) { /* 迁移失败不影响正常使用 */ }
    })();
    // 包装 save：管理员每次修改数据后自动调度上传云端（本地版/云端版统一）
    if (store && typeof store.save === 'function') {
      var baseSave = store.save;
      store.save = function () {
        var ret = baseSave();
        scheduleAutoPush();
        return ret;
      };
    }
    // 云端只读版：默认普通只读；若有持久化登录态则恢复管理员
    restoreAdminLogin();
    if (READONLY_MODE && !isAdmin) isAdmin = false;
    buildLayout();
    // 支持通过 URL hash 直接跳转指定页面，如 #employee
    if (typeof location !== 'undefined' && location.hash) {
      var hashKey = location.hash.replace('#', '');
      if (MODULES[hashKey]) state.current = hashKey;
    }
    switchTo(state.current);
    updateAdminBar();
    // 启动即从云端拉取，并定时刷新（本地版和只读版都启用，实时同步防冲突）
    if (AppCloudLib) {
      pullFromCloudSilent();
      setInterval(pullFromCloudSilent, CLOUD_REFRESH_MS);
    }
    return App;
  }
  // 班级格式迁移工具：一（1）→ 高一（1班），返回是否有变更
  function migrateClassFormatInPlace(data) {
    if (!data || !Array.isArray(data.students) || !data.students.length) return false;
    var changed = false;
    data.students.forEach(function (s) {
      if (s && s.class) {
        var parsed = C.parseClass(s.class);
        if (parsed && parsed.label && parsed.label !== s.class) {
          s.class = parsed.label;
          changed = true;
        }
      }
    });
    if (changed) data.students = C.sortStudentsByClass(data.students);
    return changed;
  }

  // 静默拉取云端（失败不打扰，仅更新状态文案）
  function pullFromCloudSilent() {
    if (!AppCloudLib) return Promise.resolve(null);
    // 正在推送时跳过拉取，避免推送-拉取竞争导致数据回滚
    if (cloudStatus.busy) return Promise.resolve(null);
    return AppCloudLib.pull().then(function (payload) {
      if (payload) {
        cloudStatus.lastPullAt = new Date();
        // 云端只读版：自动覆盖；APK未登录时：自动拉取同步（只读展示）；本地版登录后：不自动覆盖，避免本地修改被冲掉
        var shouldOverride = READONLY_MODE || (IS_APK && !isAdmin);
        if (shouldOverride) {
          migrateClassFormatInPlace(payload);
          // 合并二级管理员：优先从云端 secondary_admins 表获取（listSecondary），其次用 payload 中的，最后保留本地
          var localSec = getSecondaryAdmins();
          var cloudSec = (payload.settings && Array.isArray(payload.settings.secondaryAdmins)) ? payload.settings.secondaryAdmins : [];
          // 如果已登录主管理员，尝试从云端单独表获取二级管理员列表（优先用云端密码，其次用本地管理员密码）
          var adminPwdForList = cloudAdminPassword || (adminRole === 'full' ? getAdminPass() : null);
          var listPromise = (adminPwdForList && AppCloudLib.listSecondary)
            ? AppCloudLib.listSecondary(adminPwdForList).catch(function () { return null; })
            : Promise.resolve(null);
          return listPromise.then(function (remoteList) {
            var finalSec = cloudSec;
            if (remoteList && Array.isArray(remoteList) && remoteList.length) {
              // 云端单独表有数据，以云端为准（兼容多种可能的字段名）
              finalSec = remoteList.map(function (a) {
                return {
                  id: a.id || a.target_id || a.uid || C.uid('l'),
                  name: a.name || a.username || a.title || a.display_name || '',
                  pwd: a.pwd || a.password || a.pass || a.passwd || a.new_pwd || ''
                };
              }).filter(function (a) { return a.pwd || a.name; });
            }
            if (!finalSec.length && localSec.length) {
              finalSec = localSec;
            }
            if (!payload.settings) payload.settings = {};
            payload.settings.secondaryAdmins = finalSec;
            store.setState(payload);
            // 单设备登录检查：如果云端活跃设备不是本机，自动退出
            checkLoginSession(payload);
            // 排班模块使用独立的React状态和localStorage，云端数据同步后不需要重新渲染，避免自动刷新
            if (state.current && state.current !== 'duty' && state.current !== 'dutyStaff') {
              try { switchTo(state.current); } catch (e) {}
            }
            updateCloudUI();
            return payload;
          });
        }
        updateCloudUI();
      }
      return payload;
    }).catch(function () { return null; });
  }

  function buildLayout() {
    var appRoot = doc.getElementById('app-root');
    clear(appRoot);

    // 纯装饰背景层（Liquid Glass 光斑），不影响功能与测试
    var bgLayer = el('div', { class: 'lg-bg', id: 'bg-layer' }, [
      el('div', { class: 'lg-glow lg-glow-1' }),
      el('div', { class: 'lg-glow lg-glow-2' }),
      el('div', { class: 'lg-glow lg-glow-3' }),
      el('div', { class: 'lg-noise' })
    ]);

    // 侧栏
    var sidebar = el('div', { id: 'sidebar' }, [el('div', { class: 'brand', text: '学生管理工作台' })]);
    renderNavItems(sidebar);

    // 顶栏（备份提醒与导出/导入按钮已移至「数据与设置」）
    var topbar = el('div', { id: 'topbar' }, [
      el('button', { class: 'btn sidebar-toggle', id: 'btn-sidebar-toggle', title: '收起 / 展开导航', onclick: toggleSidebar }, [
        el('span', { class: 'sidebar-toggle-icon', id: 'sidebar-toggle-icon' })
      ]),
      el('span', { id: 'module-title', text: '首页' }),
      el('span', { id: 'today-date', text: C.todayStr() }),
      el('span', { class: 'topbar-spacer' }),
      el('span', { id: 'admin-status', class: 'muted' }),
      el('button', { class: 'btn', id: 'btn-admin' })
    ]);

    var main = el('div', { id: 'main' }, [topbar, el('div', { id: 'content' })]);
    var modalRoot = el('div', { id: 'modal-root' });

    var appDiv = el('div', { id: 'app' }, [bgLayer, sidebar, main]);
    // 移动端默认收起导航（点击展开）；桌面端默认展开（也可点击切换）
    if (typeof window !== 'undefined' && window.innerWidth <= 820) {
      appDiv.classList.add('sidebar-collapsed');
    }
    appRoot.appendChild(appDiv);
    appRoot.appendChild(modalRoot);
    // 隐藏的文件选择框：供「数据与设置 → 导入恢复」使用
    appRoot.appendChild(el('input', { type: 'file', id: 'import-file', accept: '.json', style: 'display:none', onchange: onImportFile }));
    updateSidebarToggleIcon();
  }

  // 侧栏导航渲染：全部 8 项（二级管理员也可查看学生信息/数据与设置，但只能读）
  function renderNavItems(sidebar) {
    sidebar = sidebar || $('#sidebar');
    if (!sidebar) return;
    var old = sidebar.querySelectorAll('.nav-item');
    for (var i = 0; i < old.length; i++) old[i].parentNode.removeChild(old[i]);
    C.NAV_ITEMS.forEach(function (item) {
      var iconNode = null;
      if (LG_ICONS[item.key]) {
        iconNode = doc.createElement('span');
        iconNode.className = 'lg-icon-wrap';
        iconNode.innerHTML = LG_ICONS[item.key];
      }
      var navLabel = el('span', { class: 'nav-label', text: item.label });
      sidebar.appendChild(el('div', {
        class: 'nav-item', 'data-key': item.key,
        onclick: function () { switchTo(item.key); }
      }, [iconNode, navLabel]));
    });
  }

  function switchTo(key) {
    if (!MODULES[key]) key = 'home';
    state.current = key;
    // 高亮
    var items = doc.querySelectorAll('.nav-item');
    for (var i = 0; i < items.length; i++) {
      items[i].classList.toggle('active', items[i].getAttribute('data-key') === key);
    }
    $('#module-title').textContent = MODULES[key].title;
    var content = $('#content');
    // 切换前备份请假/通报输入框与结果内容，跳转界面后保留（关闭页面内存释放即清空）
    var lr = $('#leave-raw'); if (lr) leaveRawCache = lr.value;
    var lres = $('#leave-result'); if (lres) leaveResultCache = lres.textContent;
    var rr = $('#report-raw'); if (rr) reportRawCache = rr.value;
    var rres = $('#report-result'); if (rres) reportResultCache = rres.textContent;
    // 切换页面前卸载排班模块的 React 组件，避免内存泄漏
    if (dutyReactRoot) { try { dutyReactRoot.unmount(); } catch (e) {} dutyReactRoot = null; }
    clear(content);
    MODULES[key].render(content);
  }

  function toggleSidebar() {
    var app = $('#app');
    if (!app) return;
    app.classList.toggle('sidebar-collapsed');
    updateSidebarToggleIcon();
  }
  function updateSidebarToggleIcon() {
    var app = $('#app');
    var icon = $('#sidebar-toggle-icon');
    if (!app || !icon) return;
    var collapsed = app.classList.contains('sidebar-collapsed');
    icon.innerHTML = collapsed
      ? '<svg class="lg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M3 12h12"/><path d="M3 18h18"/></svg>'
      : '<svg class="lg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M9 12h12"/><path d="M3 18h18"/></svg>';
  }

  function refresh() { renderNavItems(); switchTo(state.current); updateAdminBar(); }
  // 同步顶栏权限相关控件：管理员按钮文案与状态（导出/导入按钮已移至「数据与设置」）
  function updateAdminBar() {
    var adminBtn = $('#btn-admin');
    var status = $('#admin-status');
    if (adminBtn) {
      if (READONLY_MODE) {
        // 云端网页版：始终显示管理员登录入口（供任何地方登录修改）
        adminBtn.classList.remove('hidden');
        adminBtn.textContent = isAdmin ? '退出管理员' : '管理员登录';
        adminBtn.onclick = isAdmin ? logoutAdmin : openAdminGate;
      } else {
        adminBtn.classList.remove('hidden');
        adminBtn.textContent = isAdmin ? '退出管理员' : '管理员登录';
        adminBtn.onclick = isAdmin ? logoutAdmin : openAdminGate;
      }
    }
    if (status) {
      if (READONLY_MODE) {
        if (isAdmin) {
          status.textContent = adminRole === 'limited' ? '二级管理员已登录（云端）' : '管理员已登录（云端）';
        } else {
          status.textContent = '';
        }
      } else {
        status.textContent = isAdmin ? (adminRole === 'limited' ? '二级管理员' : '管理员') : '';
      }
    }
  }

  // ---------- 导入导出 ----------
  function downloadText(filename, text, mime) {
    try {
      var blob = new Blob([text], { type: mime || 'text/plain' });
      var url = URL.createObjectURL(blob);
      var a = doc.createElement('a');
      a.href = url; a.download = filename;
      doc.body.appendChild(a); a.click(); doc.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 0);
    } catch (e) { /* 测试环境可能无 Blob，忽略 */ }
  }

  function doExport() {
    if (!guardFull('导出备份')) return;
    var text = store.exportJSON();
    downloadText('学生管理数据备份_' + C.todayStr() + '.json', text, 'application/json');
    store.getState().settings.lastBackupAt = C.todayStr();
    store.save();
    return text;
  }
  function triggerImport() { var f = $('#import-file'); if (f) f.click(); }
  function onImportFile(e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try { doImportText(String(reader.result)); if (typeof alert === 'function') alert('数据已恢复'); }
      catch (err) { if (typeof alert === 'function') alert('导入失败：' + err.message); }
    };
    reader.readAsText(file);
  }
  function doImportText(str) { if (!guardFull('导入恢复')) return; store.importJSON(str); refresh(); return store.getState(); }

  // ---------- 云端同步 ----------
  function cloudLastPush() {
    try {
      var v = (typeof localStorage !== 'undefined') ? localStorage.getItem(CLOUD_STORAGE_KEY) : null;
      return v || cloudStatus.lastPushAt || null;
    } catch (e) { return cloudStatus.lastPushAt || null; }
  }
  function setCloudLastPush(t) {
    cloudStatus.lastPushAt = t;
    try { if (typeof localStorage !== 'undefined') localStorage.setItem(CLOUD_STORAGE_KEY, t || ''); } catch (e) {}
  }
  // 把当前本地数据推送到云端（管理员）
  // 本地版与云端网页版统一走 RPC（admin_write），不再使用 secret key：
  // 需要云端管理员密码，首次同步时会弹窗让用户输入并记住（会话内）。
  function pushToCloud() {
    if (!guardAdmin('同步到云端')) return Promise.reject(new Error('无权限'));
    if (cloudStatus.busy) return Promise.reject(new Error('正在同步中，请稍候'));
    if (!AppCloudLib) { alert('云端模块未加载，请确认此版本为本地管理员版'); return Promise.reject(new Error('cloud 模块缺失')); }
    // 统一要求云端管理员密码（RPC 安全写入，不依赖 secret key）
    function doPushLocal() {
      cloudStatus.busy = true;
      updateCloudUI();
      var payload = store.getState();
      var doPush = AppCloudLib.adminWrite
        ? AppCloudLib.adminWrite(payload, cloudAdminPassword)
        : AppCloudLib.push(payload, cloudAdminPassword);
      return doPush.then(function () {
        setCloudLastPush(C.todayStr() + ' ' + new Date().toTimeString().slice(0, 8));
        cloudStatus.lastError = null;
        cloudStatus.busy = false;
        updateCloudUI();
        if (typeof alert === 'function') alert('已保存到云端 ✓\n刷新网页即可看到最新数据。');
        return true;
      }).catch(function (err) {
        cloudStatus.lastError = err.message;
        cloudStatus.busy = false;
        updateCloudUI();
        if (typeof alert === 'function') alert('保存失败：' + err.message);
        throw err;
      });
    }
    if (cloudAdminPassword) return doPushLocal();
    // 首次同步：弹窗输入云端管理员密码
    return new Promise(function (resolve, reject) {
      var cp = el('input', { type: 'password', id: 'admin-pass-input', placeholder: '请输入云端管理员密码' });
      var cerr = el('p', { class: 'muted', style: 'color:#e5484d;min-height:1.2em', id: 'admin-pass-err' });
      var btnGo = el('button', { class: 'btn primary', type: 'button' }, ['保存到云端']);
      var pushMask = openModal('同步到云端（需要管理员密码）', [
        el('div', { class: 'form-row' }, [el('label', { text: '云端管理员密码' }), cp]),
        cerr,
        el('div', { class: 'toolbar', style: 'margin-top:4px' }, [btnGo])
      ], null, null, true);
      btnGo.onclick = function () {
        var v = cp.value.trim();
        if (!v) { cerr.textContent = '请输入密码'; return; }
        if (!AppCloudLib || !AppCloudLib.verifyAdmin) { cerr.textContent = '云端模块未加载'; return; }
        btnGo.disabled = true;
        cerr.textContent = '验证中…';
        AppCloudLib.verifyAdmin(v).then(function (ok) {
          if (ok) {
            cloudAdminPassword = v;
            cloudAdminVerified = true;
            closeModal(pushMask);
            doPushLocal().then(resolve, reject);
          } else {
            btnGo.disabled = false;
            cerr.textContent = '密码错误，请重试';
          }
        }).catch(function (err) {
          btnGo.disabled = false;
          cerr.textContent = '验证失败：' + (err && err.message ? err.message : '网络错误');
        });
      };
    });
  }
  // 从云端拉取覆盖本地（管理员）
  function pullFromCloud() {
    if (!guardAdmin('从云端拉取')) return Promise.reject(new Error('无权限'));
    if (cloudStatus.busy) return Promise.reject(new Error('正在同步中，请稍候'));
    if (!AppCloudLib) { alert('云端模块未加载'); return Promise.reject(new Error('cloud 模块缺失')); }
    cloudStatus.busy = true;
    updateCloudUI();
    return AppCloudLib.pull().then(function (payload) {
      if (!payload) { throw new Error('云端暂无数据'); }
      // 安全检查：云端学生数明显少于本地时，提示用户确认，避免误覆盖
      var localCount = (store.getState().students || []).length;
      var cloudCount = (payload.students || []).length;
      if (!READONLY_MODE && localCount > 0 && cloudCount < localCount * 0.5) {
        if (typeof confirm === 'function' && !confirm('云端数据仅 ' + cloudCount + ' 人，本地有 ' + localCount + ' 人。\n用云端数据覆盖本地可能导致数据丢失，确定继续？')) {
          cloudStatus.busy = false;
          updateCloudUI();
          return null;
        }
      }
      // 同时从云端 secondary_admins 表获取二级管理员列表（优先用云端密码，其次用本地管理员密码）
      var adminPwdForList = cloudAdminPassword || (adminRole === 'full' ? getAdminPass() : null);
      var listPromise = (adminPwdForList && AppCloudLib.listSecondary)
        ? AppCloudLib.listSecondary(adminPwdForList).catch(function () { return null; })
        : Promise.resolve(null);
      return listPromise.then(function (remoteList) {
        if (remoteList && Array.isArray(remoteList) && remoteList.length) {
          if (!payload.settings) payload.settings = {};
          payload.settings.secondaryAdmins = remoteList.map(function (a) {
            return {
              id: a.id || a.target_id || a.uid || C.uid('l'),
              name: a.name || a.username || a.title || a.display_name || '',
              pwd: a.pwd || a.password || a.pass || a.passwd || a.new_pwd || ''
            };
          }).filter(function (a) { return a.pwd || a.name; });
        }
        store.setState(payload);
        cloudStatus.busy = false;
        refresh();
        updateCloudUI();
        if (typeof alert === 'function') alert('已从云端拉取最新数据 ✓');
        return payload;
      });
    }).catch(function (err) {
      cloudStatus.lastError = err.message;
      cloudStatus.busy = false;
      updateCloudUI();
      if (typeof alert === 'function') alert('拉取失败：' + err.message);
      throw err;
    });
  }
  function updateCloudUI() {
    var panel = $('#cloud-panel');
    if (!panel) return;
    var statusEl = $('#cloud-status');
    if (statusEl) {
      var parts = [];
      if (cloudStatus.busy) parts.push('同步中…');
      var last = cloudLastPush();
      if (last) parts.push('最近同步：' + last);
      if (cloudStatus.lastError) parts.push('上次失败：' + cloudStatus.lastError);
      statusEl.textContent = parts.length ? parts.join(' ｜ ') : '尚未同步到云端';
    }
    var btnPush = $('#btn-cloud-push');
    if (btnPush) { btnPush.disabled = cloudStatus.busy; btnPush.textContent = cloudStatus.busy ? '同步中…' : '同步到云端'; }
  }
  // 云端同步面板（管理员可见）
  function cloudPanelNode() {
    if (!isAdmin || !canEditSettings()) return null;
    var panel;
    if (READONLY_MODE) {
      // 云端网页版管理员：登录后可修改并保存到云端
      panel = el('div', { class: 'panel', id: 'cloud-panel' }, [
        el('h3', { text: '云端数据' }),
        el('div', { class: 'toolbar' }, [
          el('button', { class: 'btn primary', id: 'btn-cloud-push', onclick: pushToCloud }, ['保存到云端']),
          el('button', { class: 'btn', id: 'btn-cloud-pull', onclick: pullFromCloud }, ['从云端拉取'])
        ]),
        el('p', { class: 'muted', id: 'cloud-status' })
      ]);
    } else {
      panel = el('div', { class: 'panel', id: 'cloud-panel' }, [
        el('h3', { text: '云端网页' }),
        el('div', { class: 'toolbar' }, [
          el('button', { class: 'btn primary', id: 'btn-cloud-push', onclick: pushToCloud }, ['同步到云端']),
          el('button', { class: 'btn', id: 'btn-cloud-pull', onclick: pullFromCloud }, ['从云端拉取'])
        ]),
        el('p', { class: 'muted', id: 'cloud-status' })
      ]);
    }
    return panel;
  }

  // ---------- 弹窗 ----------
  function openModal(title, bodyNodes, onOk, okText, hidePrimary) {
    var mask = el('div', { class: 'modal-mask' });
    var body = el('div', { class: 'modal' }, [el('h3', { text: title })]);
    (bodyNodes || []).forEach(function (n) { body.appendChild(n); });
    var actions = el('div', { class: 'modal-actions' }, [
      el('button', { class: 'btn', onclick: function () { closeModal(mask); } }, ['取消'])
    ]);
    // 当 hidePrimary 为 true（弹窗体内已有“登录/保存”按钮）时不额外生成确定按钮
    if (!hidePrimary) {
      actions.appendChild(el('button', {
        class: 'btn primary', onclick: function () {
          if (onOk) { var ok = onOk(); if (ok === false) return; }
          closeModal(mask);
        }
      }, [okText || '确定']));
    }
    body.appendChild(actions);
    mask.appendChild(body);
    mask.addEventListener('click', function (e) { if (e.target === mask) closeModal(mask); });
    // 需求6：弹窗内按回车 = 点击确定/登录按钮（.btn.primary）；取消只能通过点击“取消”按钮
    mask.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.keyCode === 13) {
        var primary = mask.querySelector('.btn.primary');
        if (primary) { e.preventDefault(); primary.click(); }
      }
    });
    doc.getElementById('modal-root').appendChild(mask);
    // 打开后聚焦弹窗内第一个输入框（如有），便于直接回车确认
    var firstInput = body.querySelector('input, select, textarea');
    if (firstInput && typeof firstInput.focus === 'function') {
      try { firstInput.focus(); } catch (e) {}
    }
    return mask;
  }
  function closeModal(mask) { if (mask && mask.parentNode) mask.parentNode.removeChild(mask); }

  // ================= 模块渲染 =================

  // ---------- 首页 ----------
  var HOME_CARD_ORDER = ['home-today-score', 'home-today-discipline', 'home-student-count'];
  function homeOrder() {
    var st = store.getState();
    var o = st.settings && st.settings.homeOrder;
    if (Array.isArray(o) && o.length) return o;
    return HOME_CARD_ORDER.slice();
  }
  function saveHomeOrder(order) {
    var st = store.getState();
    st.settings.homeOrder = order.slice();
    store.save();
  }

  function renderHome(root) {
    var sm = C.computeHomeSummary(store.getState());
    var cards = el('div', { class: 'cards', id: 'home-cards' });
    var order = homeOrder();
    // 去重：防止 homeOrder 中出现重复 key 导致同一卡片渲染多次
    var seen = {};
    order = order.filter(function (k) { if (seen[k]) return false; seen[k] = true; return true; });
    var cardDefs = {
      'home-today-score': function () { return homeCard('home-today-score', '+' + sm.todayScore.add + ' / ' + sm.todayScore.sub, '今日加/扣分（' + sm.todayScore.count + ' 笔）', 'score'); },
      'home-today-discipline': function () { return homeCard('home-today-discipline', String(sm.todayDiscipline), '今日违纪', 'discipline'); },
      'home-student-count': function () {
        return homeCard('home-student-count', String(sm.studentCount), '学生总数', 'students', { extra: gradeCountHtml(sm.gradeCount) });
      }
    };
    order.forEach(function (key) {
      if (cardDefs[key]) cards.appendChild(cardDefs[key]());
    });
    // 未在 homeOrder 里的新卡片补到末尾
    HOME_CARD_ORDER.forEach(function (key) {
      if (order.indexOf(key) === -1 && cardDefs[key]) cards.appendChild(cardDefs[key]());
    });

    // 拖拽排序（仅全权限管理员可拖拽，二级管理员/普通模式只读）
    if (isAdmin && adminRole !== 'limited') enableCardDrag(cards);

    root.appendChild(cards);
    // 寝室概况
    root.appendChild(dormSummaryPanel());
    // 量化分预警（放最下边）
    root.appendChild(warnPanel(sm.warnings));
  }

  // 各年级人数小字（学生总数卡片内）
  function gradeCountHtml(gradeCount) {
    var gc = gradeCount || {};
    var wrap = el('div', { class: 'grade-chips' });
    ['高一', '高二', '高三'].forEach(function (g) {
      wrap.appendChild(el('span', { class: 'grade-chip', text: g + ' ' + (gc[g] || 0) }));
    });
    return [wrap];
  }

  // HTML5 拖拽排序
  function enableCardDrag(cards) {
    var dragId = null;
    Array.prototype.forEach.call(cards.children, function (card) {
      card.setAttribute('draggable', 'true');
      card.addEventListener('dragstart', function () {
        dragId = card.id;
        card.classList.add('dragging');
      });
      card.addEventListener('dragend', function () { card.classList.remove('dragging'); });
      card.addEventListener('dragover', function (e) { e.preventDefault(); });
      card.addEventListener('drop', function (e) {
        e.preventDefault();
        if (!dragId || dragId === card.id) return;
        var from = null, to = null;
        Array.prototype.forEach.call(cards.children, function (c) {
          if (c.id === dragId) from = c;
          if (c.id === card.id) to = c;
        });
        if (!from || !to) return;
        if (from.nextSibling === to) cards.insertBefore(from, to.nextSibling);
        else cards.insertBefore(from, to);
        // 持久化顺序
        var order = Array.prototype.map.call(cards.children, function (c) { return c.id; });
        saveHomeOrder(order);
      });
    });
  }

  function homeCard(id, num, lbl, jumpTo, extra) {
    extra = extra || {};
    var children = [el('div', { class: 'num num-val', text: num }), el('div', { class: 'lbl', text: lbl })];
    if (extra.extra) children = children.concat(extra.extra);
    if (extra.chart) children.push(extra.chart);
    return el('div', {
      class: 'card link', id: id,
      onclick: function () { if (jumpTo || extra.onClickGo) switchTo(jumpTo || extra.onClickGo); }
    }, children);
  }

  // 量化分预警卡片：各年级低于60分人数 + 班级/姓名/量化分列表
  // 量化分预警面板（单独一行，类似寝室概况）
  function warnPanel(warnings) {
    warnings = warnings || [];
    var byGrade = { '高一': [], '高二': [], '高三': [] };
    warnings.forEach(function (w) {
      var g = C.studentGrade(w.class);
      if (byGrade[g]) byGrade[g].push(w);
    });
    var panel = el('div', { class: 'panel', id: 'home-warn' }, [
      el('h3', { text: '量化分预警（<60）' })
    ]);
    var gradeRow = el('div', { class: 'warn-grade-row' });
    ['高一', '高二', '高三'].forEach(function (g) {
      var list = byGrade[g];
      var block = el('div', { class: 'warn-grade-block' }, [
        el('div', { class: 'warn-grade-header' }, [
          el('span', { class: 'warn-grade-name', text: g }),
          el('span', { class: 'warn-grade-count' + (list.length ? ' danger' : ''), text: list.length + ' 人' })
        ])
      ]);
      if (list.length) {
        var tbl = el('table', { class: 'warn-table' }, [
          el('thead', {}, [el('tr', {}, [
            el('th', { text: '班级' }), el('th', { text: '姓名' }), el('th', { text: '量化分' })
          ])]),
          el('tbody', {}, list.map(function (w) {
            return el('tr', {}, [
              el('td', { text: w.class }),
              el('td', { text: C.formatName(w.name) }),
              el('td', { class: C.scoreClass(w.score), text: String(w.score) })
            ]);
          }))
        ]);
        block.appendChild(tbl);
      } else {
        block.appendChild(el('p', { class: 'muted warn-empty', text: '无预警学生' }));
      }
      gradeRow.appendChild(block);
    });
    panel.appendChild(gradeRow);
    return panel;
  }

  // ---------- 学生信息 ----------
  var studentsFilter = { grade: '', classLabel: '', gender: '', keyword: '' };
  var scoreFilter = { grade: '高一', keyword: '', classLabel: '' };
  var scoreSort = 'class';
  var discFilter = { grade: '', keyword: '' };
  var discSort = 'count-desc';
  // 大数据量分页：每页固定 200 行，避免 3000 人规模全量渲染 DOM 卡顿
  var PAGE_SIZE = 200;
  var studentPage = 1;
  var scorePage = 1;

  function renderStudents(root) {
    var st = store.getState();
    // 工具栏
    var fileInput = el('input', { type: 'file', id: 'student-file', accept: '.csv,.xlsx,.xls', style: 'display:none', onchange: onStudentFile });
    var classSel = el('select', { id: 'flt-class', onchange: function (e) { studentsFilter.classLabel = e.target.value; studentPage = 1; renderStudentTable(); } },
      [el('option', { value: '' }, ['全部班级'])]);
    var gradeSel = el('select', { id: 'flt-grade', onchange: function (e) { studentsFilter.grade = e.target.value; studentsFilter.classLabel = ''; studentPage = 1; updateClassOptions(classSel, e.target.value); renderStudentTable(); } },
      [el('option', { value: '' }, ['全部年级'])].concat(C.GRADES.map(function (g) { return el('option', { value: g }, [g]); })));
    var genderSel = el('select', { id: 'flt-gender', onchange: function (e) { studentsFilter.gender = e.target.value; studentPage = 1; renderStudentTable(); } },
      [el('option', { value: '' }, ['全部性别']), el('option', { value: '男' }, ['男']), el('option', { value: '女' }, ['女'])]);
    var search = el('input', { type: 'text', id: 'flt-kw', placeholder: '搜索姓名/班级', oninput: function (e) { studentsFilter.keyword = e.target.value; studentPage = 1; renderStudentTable(); } });

    var toolbar = el('div', { class: 'toolbar' }, [
      canEditStudents() ? el('button', { class: 'btn primary', id: 'btn-import-student', onclick: function () { fileInput.click(); } }, ['批量导入']) : null,
      canEditStudents() ? el('button', { class: 'btn', id: 'btn-add-student', onclick: openAddStudent }, ['手动添加']) : null,
      canEditStudents() ? el('button', { class: 'btn danger', id: 'btn-clear-students', onclick: deleteAllStudents }, ['删除所有学生']) : null,
      el('span', { class: 'topbar-spacer' }),
      search, gradeSel, classSel, genderSel, fileInput
    ]);
    root.appendChild(toolbar);
    root.appendChild(el('div', { class: 'panel', id: 'student-panel' }));
    updateClassOptions(classSel, studentsFilter.grade);
    if (studentsFilter.classLabel) classSel.value = studentsFilter.classLabel;
    renderStudentTable();
  }

  function updateClassOptions(sel, grade) {
    var classes = {};
    store.getState().students.forEach(function (s) {
      if (!grade || C.studentGrade(s.class) === grade) classes[s.class] = true;
    });
    var opts = [el('option', { value: '' }, ['全部班级'])].concat(
      Object.keys(classes).sort(function (a, b) {
        var ga = C.gradeIndex(C.studentGrade(a)), gb = C.gradeIndex(C.studentGrade(b));
        if (ga !== gb) return ga - gb;
        var ca = C.studentClassNo(a) || 999, cb = C.studentClassNo(b) || 999;
        return ca - cb;
      }).map(function (c) { return el('option', { value: c }, [c]); })
    );
    clear(sel);
    opts.forEach(function (o) { sel.appendChild(o); });
  }

  function renderStudentTable() {
    var panel = $('#student-panel');
    if (!panel) return;
    clear(panel);
    var list = C.sortStudentsByClass(C.filterStudents(store.getState().students, studentsFilter));
    var total = list.length;
    // 按班级分组分页：每页只显示一个班级
    var classGroups = [];
    var classMap = {};
    list.forEach(function (s) {
      if (!classMap[s.class]) {
        classMap[s.class] = [];
        classGroups.push({ name: s.class, students: classMap[s.class] });
      }
      classMap[s.class].push(s);
    });
    var pageCount = Math.max(1, classGroups.length);
    if (studentPage > pageCount) studentPage = pageCount;
    if (studentPage < 1) studentPage = 1;
    var currentClass = classGroups[studentPage - 1];
    var pageList = currentClass ? currentClass.students : [];
    var countText = '共 ' + total + ' 名学生 · ' + pageCount + ' 个班级';
    if (pageCount > 1) countText += ' · 第 ' + studentPage + '/' + pageCount + ' 页（' + (currentClass ? currentClass.name : '') + '）';
    panel.appendChild(el('div', { class: 'muted', id: 'student-count', text: countText }));
    var table = el('table', { style: 'table-layout:fixed;width:100%' }, [
      el('thead', {}, [el('tr', {}, [
        el('th', { text: '班级' }), el('th', { text: '姓名' }), el('th', { text: '性别' }),
        el('th', { text: '班扣' }), el('th', { text: '班奖' }), el('th', { text: '政扣' }), el('th', { text: '政奖' }),
        el('th', { text: '量化分' }), canEditStudents() ? el('th', { text: '操作' }) : null
      ])])
    ]);
    var tbody = el('tbody', {});
    pageList.forEach(function (s) {
      var st = store.getState();
      // 量化分显示所有月份累计（有月度明细按 scoreMonthly 汇总；无明细兼容旧数据用 s.score）
      var hasMonthly = (st.scoreMonthly || []).some(function (x) { return x.studentId === s.id; });
      var totals = hasMonthly ? C.studentScoreTotals(st.scoreMonthly, s.id)
        : { banKou: 0, banJiang: 0, zhengKou: 0, zhengJiang: 0, score: Number(s.score) || 100 };
      var rowStyle = '';
      if (typeof totals.score === 'number' && !isNaN(totals.score)) {
        if (totals.score < 0) rowStyle = 'background-color:#fc3434';
        else if (totals.score < 60) rowStyle = 'background-color:#face3d';
      }
      var tr = el('tr', { 'data-id': s.id, style: rowStyle }, [
        canEditStudents() ? editableCell('class', s.class, s.id, tr) : el('td', { text: s.class }),
        canEditStudents() ? editableCell('name', C.formatName(s.name), s.id, tr) : el('td', { text: C.formatName(s.name) }),
        canEditStudents() ? editableCell('gender', s.gender, s.id, tr, { select: ['男', '女'] }) : el('td', { text: s.gender }),
        el('td', { text: String(totals.banKou) }),
        el('td', { text: String(totals.banJiang) }),
        el('td', { text: String(totals.zhengKou) }),
        el('td', { text: String(totals.zhengJiang) }),
        el('td', { class: C.scoreClass(totals.score), text: String(totals.score), 'data-field': 'score' }),
        canEditStudents() ? el('td', {}, [
          el('span', { class: 'link', onclick: function () { openEditStudent(s.id); } }, ['改']),
          el('span', { text: '  ' }),
          el('span', { class: 'link del', onclick: function () { deleteStudent(s.id); } }, ['删'])
        ]) : null
      ]);
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    panel.appendChild(table);
    // 翻页栏（按班级分页）
    if (pageCount > 1) panel.appendChild(pagerNode('student', studentPage, pageCount, classGroups));
  }

  // 通用翻页栏：上一页 / 页码或班级 / 下一页 / 跳转
  function pagerNode(kind, page, pageCount, classGroups) {
    var nav = el('div', { class: 'pager' });
    nav.appendChild(el('button', { class: 'btn pager-btn', onclick: function () {
      if (kind === 'student') { studentPage = Math.max(1, studentPage - 1); renderStudentTable(); }
      else { scorePage = Math.max(1, scorePage - 1); renderScoreTable(); }
    }, disabled: page <= 1 }, ['上一页']));
    var infoText;
    if (classGroups && classGroups[page - 1]) {
      infoText = classGroups[page - 1].name + '（' + page + '/' + pageCount + '）';
    } else {
      infoText = page + ' / ' + pageCount;
    }
    nav.appendChild(el('span', { class: 'pager-info', text: infoText }));
    nav.appendChild(el('button', { class: 'btn pager-btn', onclick: function () {
      if (kind === 'student') { studentPage = Math.min(pageCount, studentPage + 1); renderStudentTable(); }
      else { scorePage = Math.min(pageCount, scorePage + 1); renderScoreTable(); }
    }, disabled: page >= pageCount }, ['下一页']));
    // 跳转控件
    var jumpInput = el('input', { type: 'number', class: 'pager-jump-input', min: '1', max: String(pageCount), placeholder: '页码', style: 'width:50px;margin-left:8px;padding:2px 4px;font-size:12px' });
    var jumpBtn = el('button', { class: 'btn pager-btn', style: 'margin-left:4px;padding:2px 8px;font-size:12px', onclick: function () {
      var v = parseInt(jumpInput.value, 10);
      if (isNaN(v) || v < 1) v = 1;
      if (v > pageCount) v = pageCount;
      if (kind === 'student') { studentPage = v; renderStudentTable(); }
      else { scorePage = v; renderScoreTable(); }
    } }, ['跳转']);
    jumpInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); jumpBtn.click(); }
    });
    nav.appendChild(el('span', { class: 'pager-jump', style: 'margin-left:8px' }, [jumpInput, jumpBtn]));
    return nav;
  }

  // 可编辑单元格：点击变 input/select，失焦或回车保存；class/name 文本、gender/boarding 用下拉
  function editableCell(field, value, studentId, tr, opts) {
    opts = opts || {};
    var td = el('td', { 'data-field': field, text: value });
    var editing = false;
    td.addEventListener('click', function (e) {
      if (editing) return;
      e.stopPropagation();
      editing = true;
      var cur = store.getState().students.filter(function (x) { return x.id === studentId; })[0];
      if (!cur) return;
      var raw = cur[field];
      var input;
      if (opts.select) {
        input = el('select', { 'data-field': field, style: 'width:100%;box-sizing:border-box' });
        opts.select.forEach(function (opt) {
          input.appendChild(el('option', { value: opt }, [opt]));
        });
        if (opts.emptyLabel) input.appendChild(el('option', { value: '' }, [opts.emptyLabel]));
        input.value = raw || '';
      } else {
        input = el('input', { type: 'text', 'data-field': field, value: raw == null ? '' : String(raw), style: 'width:100%;box-sizing:border-box' });
      }
      clear(td);
      td.appendChild(input);
      input.focus();
      function commit() {
        if (!editing) return;
        editing = false;
        var v = input.value;
        var d = {};
        if (opts.select) {
          d[field] = (v === '' && opts.emptyLabel) ? '' : v;
        } else {
          d[field] = v;
        }
        if (field === 'score') {
          var sc = Number(v);
          if (isNaN(sc)) sc = 100;
          d[field] = sc;
        }
        updateStudent(studentId, d);
      }
      input.addEventListener('blur', commit);
      input.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter') { ev.preventDefault(); input.blur(); }
        if (ev.key === 'Escape') { input.blur(); }
      });
    });
    return td;
  }

  function studentFormNodes(data) {
    data = data || {};
    var cls = el('input', { type: 'text', id: 'f-class', value: data.class || '' });
    var name = el('input', { type: 'text', id: 'f-name', value: data.name || '' });
    var gender = el('select', { id: 'f-gender' }, [
      el('option', { value: '男' }, ['男']), el('option', { value: '女' }, ['女'])
    ]);
    gender.value = data.gender || '男';
    var score = el('input', { type: 'number', id: 'f-score', value: (data.score != null ? String(data.score) : '100') });
    return {
      nodes: [
        el('div', { class: 'form-row' }, [el('label', { text: '班级（如 高一3班）' }), cls]),
        el('div', { class: 'form-row' }, [el('label', { text: '姓名' }), name]),
        el('div', { class: 'form-row' }, [el('label', { text: '性别' }), gender]),
        el('div', { class: 'form-row' }, [el('label', { text: '量化分' }), score])
      ],
      read: function () {
        var sc = Number(score.value);
        return { class: cls.value.trim(), name: name.value.trim(), gender: gender.value, score: isNaN(sc) ? 100 : sc };
      }
    };
  }

  function openAddStudent() {
    if (!guardFull('添加学生')) return;
    var form = studentFormNodes({ score: 100 });
    openModal('手动添加学生', form.nodes, function () {
      var d = form.read();
      if (!d.name) { if (typeof alert === 'function') alert('请填写姓名'); return false; }
      addStudent(d);
    }, '添加');
  }
  function openEditStudent(id) {
    if (!guardFull('编辑学生')) return;
    var s = store.getState().students.filter(function (x) { return x.id === id; })[0];
    if (!s) return;
    var form = studentFormNodes(s);
    openModal('编辑学生', form.nodes, function () {
      var d = form.read();
      if (!d.name) { if (typeof alert === 'function') alert('请填写姓名'); return false; }
      updateStudent(id, d);
    }, '保存');
  }

  function addStudent(data) {
    if (!guardFull('添加学生')) return;
    var pc = C.parseClass(data.class);
    var s = {
      id: C.uid('s'),
      class: pc ? pc.label : (data.class || ''),
      name: data.name || '',
      gender: data.gender || '',
      boarding: data.boarding || '',
      score: (typeof data.score === 'number' ? data.score : 100)
    };
    store.getState().students.push(s);
    store.getState().students = C.sortStudentsByClass(store.getState().students);
    store.save(); renderStudentTable(); return s;
  }
  function updateStudent(id, data, skipRender) {
    if (!guardFull('编辑学生')) return;
    var list = store.getState().students;
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) {
        if (data.class != null) {
          var pc = C.parseClass(data.class);
          data.class = pc ? pc.label : data.class;
        }
        Object.assign(list[i], data); break;
      }
    }
    store.getState().students = C.sortStudentsByClass(list);
    store.save();
    if (!skipRender) renderStudentTable();
  }
  function deleteStudent(id) {
    if (!guardFull('删除学生')) return;
    var s = store.getState().students.filter(function (x) { return x.id === id; })[0];
    var name = s ? (s.class + ' ' + s.name) : '';
    openModal('删除学生', [
      el('p', { class: 'muted', text: '确定删除学生“' + name + '”？' }),
      el('p', { class: 'muted', text: '该学生的量化流水、违纪记录与按月量化数据将一并直接清除，删除后不可恢复。' })
    ], function () {
      var st = store.getState();
      st.students = st.students.filter(function (x) { return x.id !== id; });
      // 级联清除该学生的所有关联数据（请假记录为每日名单快照，不按学生关联，保留）
      st.scoreLogs = st.scoreLogs.filter(function (x) { return x.studentId !== id; });
      st.disciplineLogs = st.disciplineLogs.filter(function (x) { return x.studentId !== id; });
      st.scoreMonthly = st.scoreMonthly.filter(function (x) { return x.studentId !== id; });
      store.setState(st); renderStudentTable();
      return true;
    }, '删除');
  }

  function deleteAllStudents() {
    if (!guardFull('删除所有学生')) return;
    var count = store.getState().students.length;
    if (count === 0) { if (typeof alert === 'function') alert('当前没有学生数据'); return; }
    openModal('删除所有学生', [
      el('p', { class: 'muted', text: '确定删除全部 ' + count + ' 名学生？' }),
      el('p', { class: 'muted', style: 'color:#e5484d', text: '所有学生的量化流水、违纪记录与按月量化数据将一并清空，此操作不可恢复！' })
    ], function () {
      var st = store.getState();
      st.students = [];
      st.scoreLogs = [];
      st.disciplineLogs = [];
      st.scoreMonthly = [];
      studentPage = 1;
      store.setState(st);
      renderStudentTable();
      if (typeof alert === 'function') alert('已清空全部学生数据');
      return true;
    }, '全部删除');
  }

  // 导入
  function importStudentsFromRows(rows) {
    if (!guardFull('导入学生')) return;
    var built = C.buildStudents(rows);
    var list = store.getState().students;
    built.forEach(function (b) { list.push(b); });
    store.getState().students = C.sortStudentsByClass(list);
    store.save(); renderStudentTable();
    return built.length;
  }
  function onStudentFile(e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    var name = (file.name || '').toLowerCase();
    var reader = new FileReader();
    if (/\.(xlsx|xls)$/.test(name)) {
      // Excel 需要解析库：懒加载（不阻塞首屏），加载完成后解析
      ensureXlsx().then(function () {
        reader.onload = function () {
          try {
            var wb = XLSX.read(reader.result, { type: 'array' });
            var ws = wb.Sheets[wb.SheetNames[0]];
            var rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
            previewImport(rows);
          } catch (err) { if (typeof alert === 'function') alert('Excel 解析失败：' + err.message); }
        };
        reader.readAsArrayBuffer(file);
      }).catch(function (err) {
        if (typeof alert === 'function') alert(err.message);
      });
    } else {
      reader.onload = function () {
        try { previewImport(C.parseCSV(String(reader.result))); }
        catch (err) { if (typeof alert === 'function') alert('CSV 解析失败：' + err.message); }
      };
      reader.readAsText(file);
    }
    e.target.value = '';
  }
  function previewImport(rows) {
    var preview = C.buildStudents(rows);
    var sample = preview.slice(0, 5).map(function (s) { return s.class + ' | ' + s.name + ' | ' + s.gender + ' | ' + s.score; });
    var body = [
      el('p', { text: '将导入 ' + preview.length + ' 名学生（量化分留空默认 100）。预览前 5 条：' }),
      el('div', { class: 'result-box', style: 'min-height:auto', text: sample.join('\n') || '(无有效数据)' })
    ];
    openModal('导入预览', body, function () {
      if (preview.length === 0) { if (typeof alert === 'function') alert('没有可导入的有效数据'); return false; }
      importStudentsFromRows(rows);
      if (typeof alert === 'function') alert('已导入 ' + preview.length + ' 名学生');
    }, '确认导入');
  }
  function exportStudentsCSV() {
    if (!guardFull('导出学生名单')) return;
    var list = C.sortStudentsByClass(store.getState().students);
    var lines = ['班级,姓名,性别,走读/住校,量化分'];
    list.forEach(function (s) { lines.push([s.class, s.name, s.gender, s.boarding || '', s.score].map(csvCell).join(',')); });
    downloadText('学生名单_' + C.todayStr() + '.csv', '\uFEFF' + lines.join('\n'), 'text/csv');
  }
  function downloadStudentTemplate() {
    if (!guardFull('下载导入模板')) return;
    downloadText('学生导入模板.csv', '\uFEFF班级,姓名,性别,走读/住校,量化分\n高一1班,张三,男,住校,100\n高一1班,李四,女,走读,\n', 'text/csv');
  }
  function csvCell(v) {
    v = v == null ? '' : String(v);
    if (/[",\n]/.test(v)) return '"' + v.replace(/"/g, '""') + '"';
    return v;
  }

  // ---------- 量化管理分（五个月八列，月份可自定义） ----------
  var scoreMonth = null;      // 当前编辑月份 YYYY-MM
  var scoreMonths = [];       // 统计窗口（用户自定义，默认最近 5 个月）

  function saveScoreMonths() {
    store.getState().settings.scoreMonths = scoreMonths.slice();
    store.save();
  }
  // 重建月份 tab 条（含添加/删除按钮），并在无月份时隐藏
  function renderScoreMonthBar() {
    var monthBar = $('#score-month-bar');
    if (!monthBar) return;
    clear(monthBar);
    scoreMonths.forEach(function (m) {
      var btn = el('span', { class: 'month-tab' + (m === scoreMonth ? ' active' : ''), 'data-month': m, text: m });
      btn.addEventListener('click', function () {
        scoreMonth = m;
        renderScoreTable();
        renderScoreMonthBar();
      });
      if (isAdmin) {
        var del = el('span', { class: 'month-tab-del', title: '删除该月', text: '×' });
        del.addEventListener('click', function (ev) {
          ev.stopPropagation();
          removeScoreMonth(m);
        });
        btn.appendChild(del);
      }
      monthBar.appendChild(btn);
    });
    if (isAdmin) monthBar.appendChild(el('span', { class: 'month-add', id: 'btn-add-month', text: '＋ 添加月份', onclick: addScoreMonth }));
    // 同步统计月份提示（不含自定义月份/公式说明文字）
    var hint = $('#score-formula-hint');
    if (hint) {
      hint.textContent = '统计月份：' + (scoreMonths.length ? scoreMonths[0] + ' ~ ' + scoreMonths[scoreMonths.length - 1] : '（无）') + '，共 ' + scoreMonths.length + ' 个月。';
    }
  }
  function addScoreMonth() {
    if (!guardAdmin('添加统计月份')) return;
    var inp = el('input', { type: 'month', id: 'sm-month', value: C.todayStr().slice(0, 7) });
    openModal('添加统计月份', [
      el('div', { class: 'form-row' }, [el('label', { text: '月份' }), inp])
    ], function () {
      var v = inp.value;
      if (!v) { if (typeof alert === 'function') alert('请选择月份'); return false; }
      if (scoreMonths.indexOf(v) !== -1) { if (typeof alert === 'function') alert('该月份已在统计窗口中'); return false; }
      scoreMonths.push(v);
      scoreMonths = scoreMonths.slice().sort();
      scoreMonth = v;
      saveScoreMonths();
      renderScoreMonthBar();
      renderScoreTable();
      return true;
    }, '添加');
  }
  function removeScoreMonth(m) {
    if (!guardAdmin('删除统计月份')) return;
    openModal('删除统计月份', [
      el('p', { class: 'muted', text: '确定从统计窗口中删除月份 “' + m + '”？' })
    ], function () {
      scoreMonths = scoreMonths.filter(function (x) { return x !== m; });
      if (scoreMonth === m) scoreMonth = scoreMonths.length ? scoreMonths[0] : null;
      saveScoreMonths();
      renderScoreMonthBar();
      renderScoreTable();
      return true;
    }, '删除');
  }

  function renderScore(root) {
    scoreMonths = C.activeScoreMonths(store.getState().settings);
    if (!scoreMonth || scoreMonths.indexOf(scoreMonth) === -1) scoreMonth = scoreMonths.length ? scoreMonths[0] : null;
    var gradeSel = el('select', { id: 'score-flt-grade', onchange: function (e) { scoreFilter.grade = e.target.value; scoreFilter.classLabel = ''; scorePage = 1; renderClassOptions(); renderScoreTable(); } },
      [el('option', { value: '' }, ['全部年级'])].concat(C.GRADES.map(function (g) { return el('option', { value: g }, [g]); })));
    gradeSel.value = scoreFilter.grade || '';
    var search = el('input', { type: 'text', id: 'score-kw', placeholder: '搜索姓名/班级', oninput: function (e) { scoreFilter.keyword = e.target.value; scorePage = 1; renderScoreTable(); } });
    // 所有筛选和月份放在一排：左侧搜索+年级+月份，右侧班级+排序
    var monthRow = el('div', { class: 'month-row' });
    // 左侧：搜索框 + 年级
    monthRow.appendChild(search);
    monthRow.appendChild(gradeSel);
    // 月份栏（含添加/删除按钮）
    var monthBar = el('div', { class: 'month-bar', id: 'score-month-bar' });
    monthRow.appendChild(monthBar);
    // ① 班级筛选下拉（跟随年级：只列出当前年级的班级）
    var classSel = el('select', { id: 'score-flt-class', onchange: function (e) { scoreFilter.classLabel = e.target.value; scorePage = 1; renderScoreTable(); } });
    function renderClassOptions() {
      var g = scoreFilter.grade || '';
      var opts = [{ v: '', t: '全部班级' }];
      var seen = {};
      C.sortStudentsByClass(store.getState().students).forEach(function (s) {
        if (!s.class || seen[s.class]) return;
        if (g && C.studentGrade(s.class) !== g) return;
        seen[s.class] = true;
        opts.push({ v: s.class, t: s.class });
      });
      clear(classSel);
      opts.forEach(function (o) { classSel.appendChild(el('option', { value: o.v }, [o.t])); });
      classSel.value = scoreFilter.classLabel || '';
    }
    renderClassOptions();
    // ② 排序下拉（默认按班级=年级→班级→姓名拼音；可选量化分高→低）
    var sortSel = el('select', { id: 'score-sort', onchange: function (e) { scoreSort = e.target.value; scorePage = 1; renderScoreTable(); } }, [
      el('option', { value: 'class' }, ['按班级']),
      el('option', { value: 'score-desc' }, ['量化分（高→低）']),
      el('option', { value: 'score-asc' }, ['量化分（低→高）'])
    ]);
    sortSel.value = scoreSort;
    var monthTools = el('div', { class: 'month-tools' }, [
      el('label', { text: '班级' }), classSel,
      el('label', { text: '排序' }), sortSel
    ]);
    monthRow.appendChild(monthTools);
    root.appendChild(monthRow);
    root.appendChild(el('p', { class: 'muted', id: 'score-formula-hint' }));
    root.appendChild(el('div', { class: 'panel', id: 'score-panel' }));
    renderScoreMonthBar();
    renderScoreTable();
  }
  function renderScoreTable() {
    var panel = $('#score-panel'); if (!panel) return; clear(panel);
    var list = C.filterStudents(store.getState().students, scoreFilter);
    var sm = store.getState().scoreMonthly || [];
    list = (scoreSort === 'class') ? C.sortStudentsByClass(list) : C.sortByScore(list, scoreSort === 'score-asc' ? 'asc' : 'desc', sm, scoreMonths);
    if (!scoreMonths.length) {
      panel.appendChild(el('p', { class: 'muted', id: 'score-count', text: isAdmin ? '尚未添加统计月份。请点击“＋ 添加月份”选择要统计的月份（可多个月份），量化分将按所选月份合计计算。当前显示初始量化分。' : '暂无统计月份，量化分暂不可统计。当前显示初始量化分。' }));
    }
    var total = list.length;
    // 按班级分组分页：每页只显示一个班级（按班级排序时生效；按分数排序时仍用传统分页）
    var pageCount, pageList, classGroups;
    if (scoreSort === 'class') {
      classGroups = [];
      var classMap = {};
      list.forEach(function (s) {
        if (!classMap[s.class]) {
          classMap[s.class] = [];
          classGroups.push({ name: s.class, students: classMap[s.class] });
        }
        classMap[s.class].push(s);
      });
      pageCount = Math.max(1, classGroups.length);
      if (scorePage > pageCount) scorePage = pageCount;
      if (scorePage < 1) scorePage = 1;
      var currentClass = classGroups[scorePage - 1];
      pageList = currentClass ? currentClass.students : [];
    } else {
      pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
      if (scorePage > pageCount) scorePage = pageCount;
      if (scorePage < 1) scorePage = 1;
      pageList = list.slice((scorePage - 1) * PAGE_SIZE, scorePage * PAGE_SIZE);
    }
    if (scoreMonths.length) {
      var countText = '共 ' + total + ' 名学生 · 当前编辑月份 ' + scoreMonth;
      if (pageCount > 1) {
        if (scoreSort === 'class' && classGroups && classGroups[scorePage - 1]) {
          countText += ' · 第 ' + scorePage + '/' + pageCount + ' 页（' + classGroups[scorePage - 1].name + '）';
        } else {
          countText += ' · 第 ' + scorePage + '/' + pageCount + ' 页';
        }
      }
      panel.appendChild(el('div', { class: 'muted', id: 'score-count', text: countText }));
    }
    var table = el('table', { style: 'table-layout:fixed;width:100%' }, [el('thead', {}, [el('tr', {}, [
      el('th', { text: '班级' }), el('th', { text: '姓名' }), el('th', { text: '性别' }),
      el('th', { text: '班扣' }), el('th', { text: '班奖' }), el('th', { text: '政扣' }), el('th', { text: '政奖' }),
      el('th', { text: '量化分' })
    ])])]);
    var tb = el('tbody', {});
    pageList.forEach(function (s) {
      var ms = scoreMonths.length ? C.monthScore(sm, s.id, scoreMonth) : { banKou: 0, banJiang: 0, zhengKou: 0, zhengJiang: 0 };
      var q = scoreMonths.length ? C.computeQuantized(sm, s.id, scoreMonths) : { score: s.score };
      var rowStyle = '';
      if (typeof q.score === 'number' && !isNaN(q.score)) {
        if (q.score < 0) rowStyle = 'background-color:#fc3434';
        else if (q.score < 60) rowStyle = 'background-color:#face3d';
      }
      tb.appendChild(el('tr', { 'data-id': s.id, style: rowStyle }, [
        el('td', { text: s.class }), el('td', { text: C.formatName(s.name) }), el('td', { text: s.gender }),
        scoreMonthCell(s.id, 'banKou', ms.banKou),
        scoreMonthCell(s.id, 'banJiang', ms.banJiang),
        scoreMonthCell(s.id, 'zhengKou', ms.zhengKou),
        scoreMonthCell(s.id, 'zhengJiang', ms.zhengJiang),
        el('td', { class: C.scoreClass(q.score), text: String(q.score) })
      ]));
    });
    table.appendChild(tb); panel.appendChild(table);
    // 翻页栏（大数据量时显示）
    if (pageCount > 1) panel.appendChild(pagerNode('score', scorePage, pageCount, (scoreSort === 'class' ? classGroups : null)));
  }
  // 量化分四类单元格：点击直接编辑当前月份该类别数值
  function scoreMonthCell(studentId, cat, value) {
    var td = el('td', { 'data-cat': cat, text: String(value || 0) });
    var editing = false;
    var catLabel = { banKou: '班扣', banJiang: '班奖', zhengKou: '政扣', zhengJiang: '政奖' };
    var isDeduct = cat === 'banKou' || cat === 'zhengKou';
    td.addEventListener('click', function () {
      if (!isAdmin) return; // 普通模式只读
      if (editing) return;
      editing = true;
      var oldVal = Number(value) || 0;
      // 值为0时input为空，非0时显示原值并全选
      var input = el('input', { type: 'number', 'data-cat': cat, value: oldVal === 0 ? '' : String(oldVal), style: 'width:50px' });
      clear(td);
      td.appendChild(input);
      input.focus();
      if (oldVal !== 0) input.select();
      function commit() {
        if (!editing) return;
        editing = false;
        var v = Number(input.value);
        if (isNaN(v) || v < 0) v = 0;
        var d = {}; d[cat] = v;
        C.setMonthScore(store.getState().scoreMonthly, studentId, scoreMonth, d);
        // 记录今日加/扣分流水（记录当前值和类别，供首页统计）
        // 删除该学生该类别今天的旧记录，避免重复统计
        var logs = store.getState().scoreLogs;
        for (var i = logs.length - 1; i >= 0; i--) {
          if (logs[i].date === C.todayStr() && logs[i].studentId === studentId && logs[i].cat === cat) {
            logs.splice(i, 1);
          }
        }
        if (v > 0) {
          logs.push({
            id: C.uid('sl'),
            studentId: studentId,
            date: C.todayStr(),
            cat: cat,
            item: catLabel[cat] || cat,
            delta: isDeduct ? -v : v,
            reason: scoreMonth + ' ' + (catLabel[cat] || cat) + ' ' + v + '分',
            after: null
          });
        }
        store.save();
        renderScoreTable();
      }
      input.addEventListener('blur', commit);
      input.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter') { ev.preventDefault(); input.blur(); }
        if (ev.key === 'Escape') { input.blur(); }
      });
    });
    return td;
  }
  function openScoreDetail(studentId) {
    var s = store.getState().students.filter(function (x) { return x.id === studentId; })[0]; if (!s) return;
    var logs = studentScoreLogs(studentId);
    var body = [el('p', {}, [s.class + ' ' + C.formatName(s.name) + '，当前量化分：', el('b', { text: String(s.score) })])];
    if (logs.length === 0) body.push(el('p', { class: 'muted', text: '暂无记录' }));
    else {
      var table = el('table', {}, [el('thead', {}, [el('tr', {}, [el('th', { text: '日期' }), el('th', { text: '项目/原因' }), el('th', { text: '分值' }), el('th', { text: '记后分' })])])]);
      var tb = el('tbody', {});
      logs.forEach(function (lg) {
        tb.appendChild(el('tr', {}, [el('td', { text: lg.date }), el('td', { text: lg.reason || lg.item }), el('td', { text: (lg.delta > 0 ? '+' : '') + lg.delta }), el('td', { text: String(lg.after) })]));
      });
      table.appendChild(tb); body.push(table);
    }
    openModal('量化明细', body, null, '关闭');
  }
  function recordScore(studentId, info) {
    if (!guardAdmin('记量化流水')) return null;
    var list = store.getState().students;
    var s = null; for (var i = 0; i < list.length; i++) if (list[i].id === studentId) { s = list[i]; break; }
    if (!s) return null;
    var delta = Number(info.delta);
    var after = C.computeAfter(s.score, delta);
    s.score = after;
    var log = { id: C.uid('l'), studentId: studentId, date: (info.date || C.todayStr()), item: info.item || '', delta: delta, reason: info.reason || '', after: after };
    store.getState().scoreLogs.push(log);
    // 同步到按月四类（类别缺省时按正负归类：正→班奖，负→班扣）
    var cat = info.cat;
    if (!cat) cat = delta >= 0 ? 'banJiang' : 'banKou';
    var month = (info.date || C.todayStr()).slice(0, 7);
    var d = {}; d[cat] = Math.abs(delta);
    C.setMonthScore(store.getState().scoreMonthly, studentId, month, d, 'add');
    store.save();
    if (state.current === 'score') renderScoreTable();
    return log;
  }
  function studentScoreLogs(studentId) {
    return store.getState().scoreLogs.filter(function (l) { return l.studentId === studentId; })
      .slice().sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
  }
  function renderDiscipline(root) {
    var gradeSel = el('select', { id: 'disc-flt-grade', onchange: function (e) { discFilter.grade = e.target.value; renderDisciplineTable(); } },
      [el('option', { value: '' }, ['全部年级'])].concat(C.GRADES.map(function (g) { return el('option', { value: g }, [g]); })));
    var search = el('input', { type: 'text', id: 'disc-kw', placeholder: '搜索姓名/班级', oninput: function (e) { discFilter.keyword = e.target.value; renderDisciplineTable(); } });
    var sortSel = el('select', { id: 'disc-sort', onchange: function (e) { discSort = e.target.value; renderDisciplineTable(); } }, [
      el('option', { value: 'count-desc' }, ['违纪次数（多→少）']),
      el('option', { value: 'class' }, ['按班级'])
    ]);
    sortSel.value = discSort;
    root.appendChild(el('div', { class: 'toolbar' }, [
      isAdmin ? el('button', { class: 'btn primary', id: 'btn-record-disc', onclick: function () { openRecordDiscipline(); } }, ['＋记违纪']) : null,
      el('span', { class: 'topbar-spacer' }), search, gradeSel, el('span', { text: '排序' }), sortSel
    ]));
    root.appendChild(el('div', { class: 'panel', id: 'disc-panel' }));
    root.appendChild(el('div', { class: 'panel', id: 'disc-summary' }));
    renderDisciplineTable();
  }
  function renderDisciplineTable() {
    var panel = $('#disc-panel'); if (!panel) return; clear(panel);
    var st = store.getState();
    var counts = C.disciplineCountByStudent(st.disciplineLogs);
    var list = C.filterStudents(st.students, discFilter);
    if (discSort === 'class') list = C.sortStudentsByClass(list);
    else list = list.slice().sort(function (a, b) { return (counts[b.id] || 0) - (counts[a.id] || 0); });
    // 只显示有违纪记录的学生（删除违纪后该生从列表消失；学生信息仍保留）
    list = list.filter(function (s) { return (counts[s.id] || 0) > 0; });
    var table = el('table', {}, [el('thead', {}, [el('tr', {}, [
      el('th', { text: '班级' }), el('th', { text: '姓名' }), el('th', { text: '违纪次数' }), el('th', { text: '违纪说明' }), el('th', { text: '操作' })])])]);
    var tb = el('tbody', {});
    list.forEach(function (s) {
      var cnt = counts[s.id] || 0;
      var reasons = C.studentDisciplineReasons(st.disciplineLogs, s.id);
      tb.appendChild(el('tr', { 'data-id': s.id }, [
        el('td', { text: s.class }), el('td', { text: C.formatName(s.name) }),
        el('td', { class: (cnt > 0 ? 'score-red' : ''), text: String(cnt) }),
        el('td', { class: 'disc-reasons', text: reasons.length ? reasons.join('、') : '—' }),
        el('td', { class: 'ops' }, [
          isAdmin ? el('span', { class: 'link', onclick: function () { openEditDiscipline(s.id); } }, ['更改说明']) : null,
          isAdmin ? el('span', { class: 'link del', onclick: function () { openDeleteDiscipline(s.id); } }, ['删除']) : null
        ])
      ]));
    });
    table.appendChild(tb); panel.appendChild(table);
    // 班级汇总
    var sum = $('#disc-summary'); if (sum) { clear(sum); sum.appendChild(el('h3', { text: '各班违纪次数汇总' }));
      var summary = C.disciplineClassSummary(st.students, st.disciplineLogs);
      if (summary.length === 0) sum.appendChild(el('p', { class: 'muted', text: '暂无违纪记录' }));
      else { var t2 = el('table', {}, [el('thead', {}, [el('tr', {}, [el('th', { text: '班级' }), el('th', { text: '违纪次数' }), el('th', { text: '违纪说明' })])])]); var tb2 = el('tbody', {});
        summary.forEach(function (r) {
          var clsReasons = C.disciplineClassReasons(st.students, st.disciplineLogs, r.class);
          tb2.appendChild(el('tr', {}, [el('td', { text: r.class }), el('td', { text: String(r.count) }), el('td', { class: 'disc-reasons', text: clsReasons.length ? clsReasons.join('、') : '—' })]));
        });
        t2.appendChild(tb2); sum.appendChild(t2); }
    }
  }
  function openRecordDiscipline(presetId) {
    if (!guardAdmin('记违纪')) return;
    var students = C.sortStudentsByClass(store.getState().students);
    if (students.length === 0) { if (typeof alert === 'function') alert('请先在“学生信息”里添加学生'); return; }
    var stuList = el('datalist', { id: 'dr-student-list' }, students.map(function (s) { return el('option', { value: s.class + ' ' + s.name }); }));
    var stuInp = el('input', { type: 'text', id: 'dr-student', list: 'dr-student-list', placeholder: '输入或选择学生（班级 姓名）' });
    if (presetId) { var ps = students.filter(function (s) { return s.id === presetId; })[0]; if (ps) stuInp.value = ps.class + ' ' + ps.name; }
    var reasonSel = el('select', { id: 'dr-reason' }, [
      el('option', { value: '', text: '（不选）' }),
      el('option', { value: '吸烟' }, ['吸烟']),
      el('option', { value: '携带违禁品' }, ['携带违禁品']),
      el('option', { value: '打架' }, ['打架']),
      el('option', { value: '谈恋爱' }, ['谈恋爱']),
      el('option', { value: '顶撞老师' }, ['顶撞老师'])
    ]);
    var dateInp = el('input', { type: 'date', id: 'dr-date', value: C.todayStr() });
    var note = el('input', { type: 'text', id: 'dr-note', placeholder: '说明（可选）' });
    openModal('记一笔违纪', [
      el('div', { class: 'form-row' }, [el('label', { text: '学生' }), stuInp, stuList]),
      el('div', { class: 'form-row' }, [el('label', { text: '违纪说明' }), reasonSel]),
      el('div', { class: 'form-row' }, [el('label', { text: '日期' }), dateInp]),
      el('div', { class: 'form-row' }, [el('label', { text: '说明' }), note])
    ], function () {
      var val = stuInp.value.trim();
      var matched = students.filter(function (s) { return (s.class + ' ' + s.name) === val || s.name === val; })[0];
      if (!matched) { if (typeof alert === 'function') alert('未找到匹配的学生，请检查输入'); return false; }
      recordDiscipline(matched.id, { date: dateInp.value || C.todayStr(), note: note.value.trim(), reason: reasonSel.value });
    }, '保存');
  }
  // 更改违纪说明：列出该生全部违纪记录，可逐条修改 reason（违纪原因）
  function openEditDiscipline(studentId) {
    if (!guardAdmin('更改说明')) return;
    var s = store.getState().students.filter(function (x) { return x.id === studentId; })[0]; if (!s) return;
    var logs = studentDisciplineLogs(studentId);
    if (logs.length === 0) { if (typeof alert === 'function') alert('该生暂无违纪记录'); return; }
    var selByLog = {};
    var body = logs.map(function (lg) {
      var sel = el('select', { class: 'edit-reason', 'data-log': lg.id }, [
        el('option', { value: '', text: '（不选）' }),
        el('option', { value: '吸烟' }, ['吸烟']),
        el('option', { value: '携带违禁品' }, ['携带违禁品']),
        el('option', { value: '打架' }, ['打架']),
        el('option', { value: '谈恋爱' }, ['谈恋爱']),
        el('option', { value: '顶撞老师' }, ['顶撞老师'])
      ]);
      sel.value = lg.reason || '';
      selByLog[lg.id] = sel;
      return el('div', { class: 'form-row' }, [
        el('label', { text: lg.date }),
        sel
      ]);
    });
    openModal('更改违纪说明 —— ' + s.class + ' ' + s.name, body, function () {
      var st = store.getState();
      var changed = false;
      st.disciplineLogs.forEach(function (lg) {
        var sel = selByLog[lg.id];
        if (sel && sel.value !== lg.reason) { lg.reason = sel.value; changed = true; }
      });
      if (changed) store.save();
      if (state.current === 'discipline') renderDisciplineTable();
      return true;
    }, '保存');
  }

  // 删除违纪：弹窗列出该生全部违纪记录，默认全选，可取消勾选只删除选中的几条
  function openDeleteDiscipline(studentId) {
    if (!guardAdmin('删除违纪')) return;
    var st = store.getState();
    var s = st.students.filter(function (x) { return x.id === studentId; })[0]; if (!s) return;
    var logs = studentDisciplineLogs(studentId);
    if (logs.length === 0) { if (typeof alert === 'function') alert('该生暂无违纪记录'); return; }
    var cbByLog = {};
    var rows = logs.map(function (lg) {
      var cb = el('input', { type: 'checkbox', class: 'del-disc-cb', 'data-log': lg.id });
      cb.checked = true; // 默认全选
      cbByLog[lg.id] = cb;
      var reasonText = lg.reason || lg.type || '';
      var label = lg.date + (reasonText ? '　' + reasonText : '') + (lg.note ? '　（' + lg.note + '）' : '');
      return el('label', { class: 'form-row del-disc-row' }, [
        cb,
        el('span', { text: label })
      ]);
    });
    openModal('删除违纪记录 —— ' + s.class + ' ' + s.name, [
      el('p', { class: 'muted', text: '删除后不可恢复。' }),
      el('div', { class: 'del-disc-list' }, rows)
    ], function () {
      var ids = [];
      logs.forEach(function (lg) { if (cbByLog[lg.id] && cbByLog[lg.id].checked) ids.push(lg.id); });
      if (ids.length === 0) { if (typeof alert === 'function') alert('请至少勾选一条要删除的违纪记录'); return false; }
      ids.forEach(function (id) { deleteDiscipline(id); });
      if (state.current === 'discipline') renderDisciplineTable();
      return true;
    }, '删除选中');
  }
  function recordDiscipline(studentId, info) {
    if (!guardAdmin('记违纪')) return null;
    var date = info.date || C.todayStr();
    var log = { id: C.uid('d'), studentId: studentId, date: date, type: info.type || '', note: info.note || '', reason: info.reason || '' };
    store.getState().disciplineLogs.push(log);
    // 违纪仅记录次数，不关联量化分（不写政扣、不改学生量化分）
    store.save();
    if (state.current === 'discipline') renderDisciplineTable();
    if (state.current === 'students') renderStudentTable();
    return log;
  }

  // 删除某学生的全部违纪记录（仅清除违纪次数，不涉及量化分）
  function deleteStudentDiscipline(studentId) {
    if (!guardAdmin('删除违纪')) return false;
    var st = store.getState();
    var logs = st.disciplineLogs.filter(function (l) { return l.studentId === studentId; });
    if (logs.length === 0) return false;
    st.disciplineLogs = st.disciplineLogs.filter(function (l) { return l.studentId !== studentId; });
    store.save();
    if (state.current === 'discipline') renderDisciplineTable();
    if (state.current === 'students') renderStudentTable();
    return true;
  }

  // 删除某条违纪记录（仅清除该条违纪次数，不涉及量化分）
  function deleteDiscipline(logId) {
    if (!guardAdmin('删除违纪')) return false;
    var st = store.getState();
    var logs = st.disciplineLogs;
    var idx = -1;
    for (var i = 0; i < logs.length; i++) { if (logs[i].id === logId) { idx = i; break; } }
    if (idx === -1) return false;
    logs.splice(idx, 1);
    store.save();
    if (state.current === 'discipline') renderDisciplineTable();
    if (state.current === 'students') renderStudentTable();
    return true;
  }

  function studentDisciplineLogs(studentId) {
    return store.getState().disciplineLogs.filter(function (l) { return l.studentId === studentId; })
      .slice().sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
  }

  // ---------- 请假名单整理器 ----------
  function renderLeave(root) {
    if (READONLY_MODE && !isAdmin) {
      // 云端网页版未登录：只读提示（请假名单不保留历史记录）
      root.appendChild(el('div', { class: 'panel' }, [
        el('h3', { text: '请假名单（只读）' }),
        el('p', { class: 'muted', text: '登录管理员后可整理请假名单。' })
      ]));
      return;
    }
    // 跳转界面保留内容：渲染前把当前输入/结果存入内存缓存（关闭页面内存释放即清空）
    var prevRaw = $('#leave-raw'); if (prevRaw) leaveRawCache = prevRaw.value;
    var prevRes = $('#leave-result'); if (prevRes) leaveResultCache = prevRes.textContent;
    var raw = el('textarea', { id: 'leave-raw', value: leaveRawCache, placeholder: '在此粘贴请假名单原始文本…' });
    var resultBox = el('div', { class: 'result-box', id: 'leave-result', text: leaveResultCache || '（整理结果显示在这里，可编辑）', contenteditable: 'true' });
    var issues = el('div', { id: 'leave-issues' });
    var left = el('div', {}, [
      el('div', { class: 'toolbar' }, [el('button', { class: 'btn primary', id: 'btn-leave-run', onclick: runLeave }, ['一键整理 →'])]),
      raw
    ]);
    var right = el('div', {}, [
      el('div', { class: 'toolbar' }, [
        el('button', { class: 'btn', id: 'btn-leave-copy', onclick: function () { copyText($('#leave-result').textContent); } }, ['复制结果'])
      ]),
      resultBox, issues
    ]);
    root.appendChild(el('div', { class: 'two-col' }, [left, right]));
  }
  function runLeave() {
    var raw = $('#leave-raw').value;
    var r = C.formatLeave(raw, store.getState().students);
    $('#leave-result').textContent = r.text;
    var issues = $('#leave-issues'); clear(issues);
    if (r.mismatched && r.mismatched.length) {
      issues.appendChild(el('div', { class: 'issues', style: 'border-color:rgba(229,72,77,.6)' }, [
        el('b', { text: '⚠ 以下 ' + r.mismatched.length + ' 人班级姓名与学生信息不对照，请核对：' }),
        el('div', { text: r.mismatched.join('、') })
      ]));
    }
    if (r.removedWalkers && r.removedWalkers.length) {
      issues.appendChild(el('div', { class: 'issues', style: 'border-color:rgba(255,149,0,.5)' }, [
        el('b', { text: '⚠ 已去掉走读生 ' + r.removedWalkers.length + ' 人：' }),
        el('div', { text: r.removedWalkers.join('、') })
      ]));
    }
    if (r.unresolved && r.unresolved.length) {
      issues.appendChild(el('div', { class: 'issues' }, [
        el('b', { text: '⚠ 以下 ' + r.unresolved.length + ' 行未能自动识别，请人工核对补充：' }),
        el('div', { html: r.unresolved.map(function (x) { return '· ' + x; }).join('<br>') })
      ]));
    }
    return r;
  }
  function saveLeaveRecord(text, raw) {
    var rec = { id: C.uid('lv'), date: C.todayStr(), raw: raw || '', formatted: text, count: countLeavePersons(text) };
    store.getState().leaveRecords.push(rec);
    store.save();
    return rec;
  }
  function countLeavePersons(text) {
    // 统计结果中 · 开头行的姓名个数
    var n = 0;
    String(text).split(/\n/).forEach(function (line) {
      var t = line.trim();
      if (t.indexOf('·') === 0) {
        var rest = t.replace(/^·\s*\d+\s*/, '');
        n += rest.split(/\s+/).filter(Boolean).length;
      }
    });
    return n;
  }
  function copyText(text) {
    try { if (navigator.clipboard) navigator.clipboard.writeText(text); } catch (e) {}
  }

  // ---------- 每日通报整理器 ----------
  function renderReport(root) {
    if (READONLY_MODE && !isAdmin) {
      // 云端网页版未登录：只展示提示（每日通报不保留历史记录）
      root.appendChild(el('div', { class: 'panel' }, [
        el('h3', { text: '每日通报（只读）' })
      ]));
      return;
    }
    var prevRes = $('#report-result'); if (prevRes) reportResultCache = prevRes.textContent;
    var raw = el('textarea', { id: 'report-raw', value: reportRawCache, placeholder: '在此粘贴查寝原始记录…' });
    var resultBox = el('div', { class: 'result-box', id: 'report-result', text: reportResultCache || '（整理结果显示在这里，可编辑）', contenteditable: 'true' });
    var issues = el('div', { id: 'report-issues' });
    var left = el('div', {}, [
      el('div', { class: 'toolbar' }, [el('button', { class: 'btn primary', id: 'btn-report-run', onclick: runReport }, ['一键整理 →'])]),
      raw
    ]);
    var right = el('div', {}, [
      el('div', { class: 'toolbar' }, [
        el('button', { class: 'btn', id: 'btn-report-copy', onclick: function () { copyText($('#report-result').textContent); } }, ['复制结果'])
      ]),
      resultBox, issues
    ]);
    root.appendChild(el('div', { class: 'two-col' }, [left, right]));
  }
  function runReport() {
    var raw = $('#report-raw').value;
    var r = C.formatReport(raw, store.getState().dormMap);
    $('#report-result').textContent = r.text;
    var box = $('#report-issues'); clear(box);
    if (r.issues && r.issues.length) {
      box.appendChild(el('div', { class: 'issues' }, [
        el('b', { text: '⚠ 核对/待确认提醒（共 ' + r.issues.length + ' 条）：' }),
        el('div', { html: r.issues.map(function (x) { return '· ' + x; }).join('<br>') })
      ]));
    }
    return r;
  }
  function saveReportRecord(text, raw, issues) {
    var rec = { id: C.uid('r'), date: C.todayStr(), raw: raw || '', formatted: text, issues: issues || [] };
    store.getState().dormReports.push(rec);
    store.save();
    return rec;
  }

  // ---------- 员工奖惩管理（员工数据源统一使用排班人员数据） ----------
  var employeeTab = 'records'; // records / summary
  var empFilter = { employeeId: '', month: '' };
  var empSummaryMonth = '';
  var employeeContainer = null;

  // 从 localStorage 读取排班人员数据（与排班系统共享同一数据源）
  function getDutyStaff() {
    try {
      var raw = (typeof localStorage !== 'undefined') ? localStorage.getItem('duty_staff') : null;
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  }

  function getEmployeeName(id) {
    var staff = getDutyStaff();
    var e = staff.find(function (x) { return String(x.id) === String(id); });
    return e ? e.name : '（已删除）';
  }

  function refreshEmployee() {
    if (employeeContainer && state.current === 'employee') renderEmployee(employeeContainer);
  }

  function openEmployeeRecordModal(rec) {
    var isEdit = !!rec;
    var staff = getDutyStaff();
    var empSel = el('select', { style: 'width:100%;margin-bottom:10px' });
    if (staff.length === 0) {
      empSel.appendChild(el('option', { text: '请先在「员工管理」中添加人员' }));
    } else {
      empSel.appendChild(el('option', { value: '', text: '请选择员工' }));
      staff.forEach(function (e) {
        empSel.appendChild(el('option', { value: String(e.id), text: e.name }));
      });
    }
    if (rec) empSel.value = String(rec.employeeId);
    var dateInput = el('input', { type: 'date', value: rec ? rec.date : C.todayStr(), style: 'width:100%;margin-bottom:10px' });
    var reasonInput = el('input', { type: 'text', value: rec ? rec.reason : '', placeholder: '请输入事由（如：迟到、请假1天、旷工）', style: 'width:100%;margin-bottom:10px' });
    var amountInput = el('input', { type: 'number', value: rec ? rec.amount : '', placeholder: '请输入罚款金额（元）', style: 'width:100%', min: '0', step: '0.01' });
    openModal(isEdit ? '编辑记录' : '添加记录', [empSel, dateInput, reasonInput, amountInput], function () {
      if (!empSel.value) { alert('请选择员工'); return false; }
      if (!dateInput.value) { alert('请选择日期'); return false; }
      var reason = reasonInput.value.trim();
      if (!reason) { alert('请输入事由'); return false; }
      var amount = parseFloat(amountInput.value);
      if (isNaN(amount) || amount < 0) { alert('请输入有效的罚款金额'); return false; }
      var st2 = store.getState();
      if (isEdit) {
        rec.employeeId = empSel.value;
        rec.date = dateInput.value;
        rec.reason = reason;
        rec.amount = amount;
      } else {
        st2.employeeRecords.push({ id: C.uid('erec'), employeeId: empSel.value, date: dateInput.value, reason: reason, amount: amount });
      }
      store.save();
      refreshEmployee();
    }, '保存');
  }

  function deleteEmployeeRecord(rec) {
    if (!confirm('确定删除该条记录？')) return;
    var st = store.getState();
    st.employeeRecords = st.employeeRecords.filter(function (r) { return r.id !== rec.id; });
    store.save();
    refreshEmployee();
  }

  function getEmpMonthOptions() {
    var st = store.getState();
    var months = {};
    st.employeeRecords.forEach(function (r) {
      if (r.date) months[r.date.substring(0, 7)] = true;
    });
    var cur = C.todayStr().substring(0, 7);
    months[cur] = true;
    return Object.keys(months).sort().reverse();
  }

  function renderEmployee(root) {
    employeeContainer = root;
    if (!isAdmin) {
      root.appendChild(el('div', { class: 'panel' }, [
        el('h3', { text: '教官绩效（仅管理员可见）' })
      ]));
      return;
    }
    clear(root);
    var tabs = el('div', { class: 'tabs' }, [
      el('button', { class: 'tab-btn' + (employeeTab === 'records' ? ' active' : ''), onclick: function () { employeeTab = 'records'; renderEmployee(root); } }, ['记录管理']),
      el('button', { class: 'tab-btn' + (employeeTab === 'summary' ? ' active' : ''), onclick: function () { employeeTab = 'summary'; renderEmployee(root); } }, ['统计汇总'])
    ]);
    root.appendChild(tabs);

    var st = store.getState();
    var dutyStaff = getDutyStaff();

    if (employeeTab === 'records') {
      // 记录管理（无搜索框）
      var empSel = el('select', { style: 'width:140px', onchange: function (e) { empFilter.employeeId = e.target.value; renderEmployee(root); } });
      empSel.appendChild(el('option', { value: '', text: '全部员工' }));
      dutyStaff.forEach(function (e) {
        empSel.appendChild(el('option', { value: String(e.id), text: e.name }));
      });
      empSel.value = empFilter.employeeId || '';
      var monthSel = el('select', { style: 'width:120px', onchange: function (e) { empFilter.month = e.target.value; renderEmployee(root); } });
      monthSel.appendChild(el('option', { value: '', text: '全部月份' }));
      getEmpMonthOptions().forEach(function (m) {
        monthSel.appendChild(el('option', { value: m, text: m }));
      });
      monthSel.value = empFilter.month || '';
      root.appendChild(el('div', { class: 'toolbar' }, [
        empSel, monthSel,
        el('button', { class: 'btn primary', onclick: function () {
          if (dutyStaff.length === 0) { alert('请先在「员工管理」中添加人员'); return; }
          openEmployeeRecordModal(null);
        } }, ['+ 添加记录'])
      ]));

      var records = st.employeeRecords.slice().filter(function (r) {
        if (empFilter.employeeId && r.employeeId !== empFilter.employeeId) return false;
        if (empFilter.month && (!r.date || r.date.substring(0, 7) !== empFilter.month)) return false;
        return true;
      }).sort(function (a, b) { return (b.date || '').localeCompare(a.date || ''); });

      if (records.length === 0) {
        root.appendChild(el('div', { class: 'muted', style: 'padding:20px;text-align:center', text: '暂无记录' }));
      } else {
        var recTbody = el('tbody', {});
        records.forEach(function (r) {
          recTbody.appendChild(el('tr', {}, [
            el('td', { text: r.date || '' }),
            el('td', { text: getEmployeeName(r.employeeId) }),
            el('td', { text: r.reason || '' }),
            el('td', { text: String(r.amount || 0) }),
            el('td', {}, [
              el('a', { href: 'javascript:;', onclick: function () { openEmployeeRecordModal(r); }, text: '编辑' }),
              el('span', { text: ' / ' }),
              el('a', { href: 'javascript:;', style: 'color:#e04545', onclick: function () { deleteEmployeeRecord(r); }, text: '删除' })
            ])
          ]));
        });
        root.appendChild(el('table', { class: 'data-table' }, [
          el('thead', {}, [el('tr', {}, [
            el('th', { text: '日期' }), el('th', { text: '员工' }), el('th', { text: '事由' }), el('th', { text: '金额(元)' }), el('th', { text: '操作' })
          ])]),
          recTbody
        ]));
      }
    }
    if (employeeTab === 'summary') {
      // 统计汇总
      if (!empSummaryMonth) empSummaryMonth = C.todayStr().substring(0, 7);
      var sumMonthSel = el('select', { style: 'width:120px', onchange: function (e) { empSummaryMonth = e.target.value; renderEmployee(root); } });
      getEmpMonthOptions().forEach(function (m) {
        sumMonthSel.appendChild(el('option', { value: m, text: m }));
      });
      sumMonthSel.value = empSummaryMonth;
      root.appendChild(el('div', { class: 'toolbar' }, [sumMonthSel]));

      // 按员工统计
      var empMap = {};
      dutyStaff.forEach(function (e) {
        empMap[String(e.id)] = { name: e.name, count: 0, total: 0, reasons: {} };
      });
      st.employeeRecords.forEach(function (r) {
        if (!r.date || r.date.substring(0, 7) !== empSummaryMonth) return;
        var info = empMap[String(r.employeeId)];
        if (!info) {
          info = { name: getEmployeeName(r.employeeId), count: 0, total: 0, reasons: {} };
          empMap[String(r.employeeId)] = info;
        }
        info.count++;
        info.total += Number(r.amount) || 0;
        var reason = r.reason || '未填写';
        info.reasons[reason] = (info.reasons[reason] || 0) + (Number(r.amount) || 0);
      });

      // 只显示有记录的员工（count > 0）
      var sumList = Object.keys(empMap).map(function (id) { return empMap[id]; })
        .filter(function (info) { return info.count > 0; })
        .sort(function (a, b) { return b.total - a.total; });

      if (sumList.length === 0) {
        root.appendChild(el('div', { class: 'muted', style: 'padding:20px;text-align:center', text: empSummaryMonth + ' 暂无罚款记录' }));
      } else {
        var sumTbody = el('tbody', {});
        sumList.forEach(function (info) {
          var reasonDetail = Object.keys(info.reasons).map(function (k) {
            return k + ':' + info.reasons[k] + '元';
          }).join('、');
          sumTbody.appendChild(el('tr', {}, [
            el('td', { text: info.name }),
            el('td', { text: info.count + '次' }),
            el('td', { text: info.total + '元' }),
            el('td', { text: reasonDetail })
          ]));
        });
        root.appendChild(el('table', { class: 'data-table' }, [
          el('thead', {}, [el('tr', {}, [
            el('th', { text: '员工' }), el('th', { text: '记录次数' }), el('th', { text: '罚款总额' }), el('th', { text: '扣款事由明细' })
          ])]),
          sumTbody
        ]));
      }

      // 全员汇总
      var totalCount = 0, totalAmount = 0, empCount = 0;
      sumList.forEach(function (info) {
        totalCount += info.count;
        totalAmount += info.total;
        if (info.count > 0) empCount++;
      });
      root.appendChild(el('div', { class: 'cards', style: 'margin-top:16px' }, [
        el('div', { class: 'card' }, [el('div', { class: 'num num-val', text: String(totalCount) }), el('div', { class: 'lbl', text: empSummaryMonth + ' 总记录次数' })]),
        el('div', { class: 'card' }, [el('div', { class: 'num num-val', text: totalAmount + '元' }), el('div', { class: 'lbl', text: empSummaryMonth + ' 总罚款金额' })]),
        el('div', { class: 'card' }, [el('div', { class: 'num num-val', text: String(empCount) + '人' }), el('div', { class: 'lbl', text: '涉及员工人数' })])
      ]));
    }
  }

  // ---------- 值班排班 / 排班人员（React 组件集成） ----------
  var dutyReactRoot = null;

  // 排班系统内部路由包装组件：直接进入指定页面，保留排班系统自身的页面跳转能力
  function DutyApp(props) {
    var pageState = React.useState(props.initialPage || 'dutySelect');
    var page = pageState[0], setPage = pageState[1];
    var paramsState = React.useState({});
    var pageParams = paramsState[0], setPageParams = paramsState[1];

    function navigate(target, params) {
      // 集成环境下：排班系统的"首页"重定向到值班排班选择页
      var realTarget = (target === 'home') ? 'dutySelect' : target;
      setPage(realTarget);
      setPageParams(params || {});
    }

    var content = null;
    if (page === 'home') content = React.createElement(DutyMainPage, { onNavigate: navigate });
    else if (page === 'staff') content = React.createElement(StaffPage, { onNavigate: navigate, canEdit: isAdmin });
    else if (page === 'schedule') content = React.createElement(SchedulePage, { mode: pageParams.mode || 'all', onNavigate: navigate });
    else if (page === 'dutySelect') content = React.createElement(DutyMainPage, { onNavigate: navigate });
    else if (page === 'gate') content = React.createElement(GatePage, { onNavigate: navigate });

    return React.createElement(StoreProvider, null, content);
  }

  function mountDutyApp(root, initialPage) {
    var container = el('div', { class: 'duty-app' });
    root.appendChild(container);
    dutyReactRoot = ReactDOM.createRoot(container);
    dutyReactRoot.render(React.createElement(DutyApp, { initialPage: initialPage }));
  }

  function renderDutySchedule(root) {
    mountDutyApp(root, 'dutySelect');
  }

  function renderDutyStaff(root) {
    mountDutyApp(root, 'staff');
  }

  // ---------- 员工工资 ----------
  function getDutyStaffList() {
    try {
      var raw = localStorage.getItem('duty_staff');
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  }
  function sortStaffByRole(list) {
    var order = { captain: 0, vice_captain: 1, leader_a: 2, member: 3, leader_b: 4 };
    return list.slice().sort(function (a, b) {
      var oa = order[a.role] != null ? order[a.role] : 5;
      var ob = order[b.role] != null ? order[b.role] : 5;
      if (oa !== ob) return oa - ob;
      if (a.group !== b.group) return a.group === 'A' ? -1 : 1;
      return a.id - b.id;
    });
  }
  function loadSalaryData(year, month) {
    try {
      var raw = localStorage.getItem('duty_salary_' + year + '_' + month);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  }
  function saveSalaryData(year, month, data) {
    try { localStorage.setItem('duty_salary_' + year + '_' + month, JSON.stringify(data)); } catch (e) {}
  }
  function calcActual(s) {
    var base = parseFloat(s.baseSalary) || 0;
    var att = parseFloat(s.attendance) || 0;
    var perf = parseFloat(s.performance) || 0;
    var days = parseFloat(s.workDays) || 0;
    var allow = parseFloat(s.allowance) || 0;
    var sen = parseFloat(s.seniority) || 0;
    var bonus = parseFloat(s.bonus) || 0;
    var ded = parseFloat(s.deduction) || 0;
    return Math.round(((base + att + perf) / 30 * days + allow + sen + bonus - ded) * 100) / 100;
  }
  // 获取某月某员工的绩效扣除汇总（金额+原因）
  function getEmployeeDeduction(employeeId, year, month) {
    var st = store.getState();
    var records = st.employeeRecords || [];
    var monthStr = year + '-' + (month < 10 ? '0' + month : month);
    var total = 0;
    var reasons = [];
    records.forEach(function (r) {
      if (String(r.employeeId) === String(employeeId) && r.date && r.date.substring(0, 7) === monthStr) {
        total += parseFloat(r.amount) || 0;
        if (r.reason) reasons.push(r.reason);
      }
    });
    return { amount: total, reason: reasons.join('；') };
  }
  function renderSalary(root) {
    var now = new Date();
    var salaryYear = now.getFullYear();
    var salaryMonth = now.getMonth() + 1;
    var staffList = sortStaffByRole(getDutyStaffList());
    var salaryData = loadSalaryData(salaryYear, salaryMonth);

    // 工具栏
    var toolbar = el('div', { class: 'toolbar salary-toolbar' });
    var yearSel = el('select', { id: 'salary-year' });
    for (var y = 2024; y <= 2030; y++) {
      yearSel.appendChild(el('option', { value: y }, [y + '年']));
    }
    yearSel.value = salaryYear;
    yearSel.onchange = function () { salaryYear = parseInt(this.value); salaryData = loadSalaryData(salaryYear, salaryMonth); renderSalaryTable(); };
    var monthSel = el('select', { id: 'salary-month' });
    for (var m = 1; m <= 12; m++) {
      monthSel.appendChild(el('option', { value: m }, [m + '月']));
    }
    monthSel.value = salaryMonth;
    monthSel.onchange = function () { salaryMonth = parseInt(this.value); salaryData = loadSalaryData(salaryYear, salaryMonth); renderSalaryTable(); };
    var printBtn = el('button', { class: 'btn primary', onclick: function () { window.print(); } }, ['打印']);
    toolbar.appendChild(el('span', { text: '年份：' }));
    toolbar.appendChild(yearSel);
    toolbar.appendChild(el('span', { text: '月份：' }));
    toolbar.appendChild(monthSel);
    toolbar.appendChild(printBtn);
    root.appendChild(toolbar);

    // 工资表容器（A4横版）
    var salaryWrap = el('div', { class: 'salary-a4' });
    root.appendChild(salaryWrap);

    function renderSalaryTable() {
      clear(salaryWrap);
      staffList = sortStaffByRole(getDutyStaffList());
      // 标题
      var title = el('div', { class: 'salary-title' }, [
        el('div', { class: 'salary-company', text: '禹州市皓天拓展策划有限公司' }),
        el('div', { class: 'salary-subtitle', text: salaryYear + '年' + salaryMonth + '月份员工工资（禹州四高）' })
      ]);
      salaryWrap.appendChild(title);

      // 表格
      var table = el('table', { class: 'salary-table' });
      var thead = el('thead');
      var headerRow = el('tr');
      var headers = ['姓名', '性别', '工作时间', '底薪', '全勤', '绩效', '补助', '工龄', '奖金', '扣除', '实发', '奖、罚原因', '签名'];
      headers.forEach(function (h) {
        headerRow.appendChild(el('th', { text: h }));
      });
      thead.appendChild(headerRow);
      table.appendChild(thead);

      var tbody = el('tbody');
      var totalActual = 0;
      staffList.forEach(function (person) {
        var sid = person.id;
        var s = salaryData[sid] || {
          workDays: 30, baseSalary: 3500, attendance: 300, performance: 1200,
          allowance: 0, seniority: 0, bonus: 0, deduction: 0, reason: ''
        };
        // 从教官绩效记录自动获取当月扣除和原因
        var empDed = getEmployeeDeduction(sid, salaryYear, salaryMonth);
        if (empDed.amount > 0) {
          s.deduction = empDed.amount;
          s.reason = empDed.reason;
        }
        var actual = calcActual(s);
        totalActual += actual;

        var tr = el('tr');
        tr.appendChild(el('td', { class: 'salary-name', text: person.name || '（未命名）' }));
        tr.appendChild(el('td', { class: 'salary-center', text: person.gender === 'male' ? '男' : '女' }));
        // 工作时间
        var daysInput = el('input', { type: 'number', value: s.workDays, min: '0', max: '31', step: '0.5' });
        daysInput.oninput = function () { s.workDays = parseFloat(this.value) || 0; updateRow(); };
        tr.appendChild(el('td', { class: 'salary-input' }, [daysInput]));
        // 底薪
        var baseInput = el('input', { type: 'number', value: s.baseSalary, min: '0' });
        baseInput.oninput = function () { s.baseSalary = parseFloat(this.value) || 0; updateRow(); };
        tr.appendChild(el('td', { class: 'salary-input' }, [baseInput]));
        // 全勤
        var attInput = el('input', { type: 'number', value: s.attendance, min: '0' });
        attInput.oninput = function () { s.attendance = parseFloat(this.value) || 0; updateRow(); };
        tr.appendChild(el('td', { class: 'salary-input' }, [attInput]));
        // 绩效
        var perfInput = el('input', { type: 'number', value: s.performance, min: '0' });
        perfInput.oninput = function () { s.performance = parseFloat(this.value) || 0; updateRow(); };
        tr.appendChild(el('td', { class: 'salary-input' }, [perfInput]));
        // 补助
        var allowInput = el('input', { type: 'number', value: s.allowance, min: '0' });
        allowInput.oninput = function () { s.allowance = parseFloat(this.value) || 0; updateRow(); };
        tr.appendChild(el('td', { class: 'salary-input' }, [allowInput]));
        // 工龄
        var senInput = el('input', { type: 'number', value: s.seniority, min: '0' });
        senInput.oninput = function () { s.seniority = parseFloat(this.value) || 0; updateRow(); };
        tr.appendChild(el('td', { class: 'salary-input' }, [senInput]));
        // 奖金
        var bonusInput = el('input', { type: 'number', value: s.bonus, min: '0' });
        bonusInput.oninput = function () { s.bonus = parseFloat(this.value) || 0; updateRow(); };
        tr.appendChild(el('td', { class: 'salary-input' }, [bonusInput]));
        // 扣除
        var dedInput = el('input', { type: 'number', value: s.deduction, min: '0' });
        dedInput.oninput = function () { s.deduction = parseFloat(this.value) || 0; updateRow(); };
        tr.appendChild(el('td', { class: 'salary-input' }, [dedInput]));
        // 实发
        var actualTd = el('td', { class: 'salary-actual', text: actual.toFixed(2) + '元' });
        tr.appendChild(actualTd);
        // 奖、罚原因
        var reasonInput = el('input', { type: 'text', value: s.reason || '' });
        reasonInput.oninput = function () { s.reason = this.value; salaryData[sid] = s; saveSalaryData(salaryYear, salaryMonth, salaryData); };
        tr.appendChild(el('td', { class: 'salary-reason' }, [reasonInput]));
        // 签名
        tr.appendChild(el('td', { class: 'salary-sign' }));

        tbody.appendChild(tr);

        function updateRow() {
          var a = calcActual(s);
          actualTd.textContent = a.toFixed(2) + '元';
          salaryData[sid] = s;
          saveSalaryData(salaryYear, salaryMonth, salaryData);
          // 更新总发工资
          var total = 0;
          staffList.forEach(function (p) {
            var sd = salaryData[p.id] || {};
            total += calcActual(sd);
          });
          var totalEl = document.getElementById('salary-total');
          if (totalEl) totalEl.textContent = total.toFixed(2) + '元';
        }
      });
      table.appendChild(tbody);
      salaryWrap.appendChild(table);

      // 底部备注 + 总发工资
      var footer = el('div', { class: 'salary-footer' });
      var remark = el('div', { class: 'salary-remark' });
      remark.appendChild(el('div', { text: '备注：各教官按考勤制度工作突出者奖励200元，工作落后者扣除100元。每月请假超过两天（包括两天）扣除全勤奖300元(请假一天扣当天全勤金额10元）旷工者扣除100元，给公司带来负面影响者扣除100元。满勤每月30天' }));
      remark.appendChild(el('div', { class: 'salary-remark-sign', text: '皓天拓展有限公司' }));
      var totalRow = el('div', { class: 'salary-total-row' });
      totalRow.appendChild(el('span', { class: 'salary-total-label', text: '总发工资：' }));
      totalRow.appendChild(el('span', { id: 'salary-total', class: 'salary-total-num', text: totalActual.toFixed(2) + '元' }));
      footer.appendChild(remark);
      footer.appendChild(totalRow);
      salaryWrap.appendChild(footer);
    }

    renderSalaryTable();
  }

  // ---------- 数据与设置 ----------
  function renderSettings(root) {
    // 第一排：数据备份
    var row1 = el('div', { style: 'display:flex;gap:16px;margin-bottom:16px;flex-wrap:wrap' });
    // 1. 数据备份
    var backupPanel = el('div', { class: 'panel', id: 'backup-panel', style: 'flex:1;min-width:280px;margin:0' }, [
      el('h3', { text: '数据备份' }),
      el('div', { class: 'toolbar' }, [
        canEditSettings() ? el('button', { class: 'btn primary', id: 'btn-backup-export', onclick: doExport }, ['导出备份']) : null,
        canEditSettings() ? el('button', { class: 'btn', id: 'btn-backup-import', onclick: triggerImport }, ['导入恢复']) : null,
        canEditSettings() ? el('button', { class: 'btn danger', id: 'btn-clear', onclick: confirmClear }, ['清空数据']) : null
      ]),
      el('p', { class: 'muted', id: 'last-backup', text: lastBackupText() })
    ]);
    row1.appendChild(backupPanel);
    root.appendChild(row1);

    // 第二排：云端网页 + 管理员 + 二级管理员
    var row2 = el('div', { style: 'display:flex;gap:16px;flex-wrap:wrap' });
    // 2. 云端同步（仅管理员可见）
    var cloudPanel = cloudPanelNode();
    if (cloudPanel) { cloudPanel.style.flex = '1'; cloudPanel.style.minWidth = '240px'; cloudPanel.style.margin = '0'; row2.appendChild(cloudPanel); updateCloudUI(); }
    // 3. 管理员（仅管理员可见）：修改密码 / 退出登录 / 管理二级权限
    if (isAdmin) {
      var adminPanel = el('div', { class: 'panel', id: 'admin-pass-panel', style: 'flex:1;min-width:240px;margin:0' }, [
        el('h3', { text: '管理员' }),
        el('div', { class: 'toolbar' }, [
          canEditSettings() ? el('button', { class: 'btn', id: 'btn-set-admin-pass', onclick: openSetAdminPass }, [hasAdminPass() ? '修改密码' : '设置密码']) : null,
          el('button', { class: 'btn', id: 'btn-logout-admin', onclick: logoutAdmin }, ['退出管理员模式'])
        ])
      ]);
      row2.appendChild(adminPanel);
      var limitedPanel = limitedAdminPanelNode();
      limitedPanel.style.flex = '1';
      limitedPanel.style.minWidth = '240px';
      limitedPanel.style.margin = '0';
      row2.appendChild(limitedPanel);
    }
    if (row2.childNodes.length > 0) {
      root.appendChild(row2);
      // 面板已挂载后再刷新二级管理员状态
      if (isAdmin) refreshLimitedAdminPanel();
    }
  }
  // ---------- 二级管理员（管理员面板内：可添加多个二级管理员，每个含名称与独立密码，仅查看） ----------
  function getSecondaryAdmins() {
    var list = (store && store.getState().settings && store.getState().settings.secondaryAdmins) || [];
    return Array.isArray(list) ? list : [];
  }
  function addSecondaryAdminLocal(name, pwd) {
    var st = store.getState();
    pwd = String(pwd);
    // 查重：不与主密码相同、不与其他二级密码重复
    if (pwd === getAdminPass()) return false;
    if (getSecondaryAdmins().some(function (a) { return a.pwd === pwd; })) return false;
    st.settings.secondaryAdmins = getSecondaryAdmins().concat([{ id: C.uid('l'), name: String(name), pwd: pwd }]);
    store.save();
    return true;
  }
  function delSecondaryAdminLocal(id) {
    var st = store.getState();
    st.settings.secondaryAdmins = getSecondaryAdmins().filter(function (a) { return String(a.id) !== String(id); });
    store.save();
  }
  // 兼容旧 API（返回第一个密码 / 清空后添加 / 清空）
  function getLimitedPass() {
    var list = getSecondaryAdmins();
    return list.length ? list[0].pwd : null;
  }
  function setLimitedPassLocal(pwd) {
    var st = store.getState();
    st.settings.secondaryAdmins = [{ id: C.uid('l'), name: String(pwd), pwd: String(pwd) }];
    store.save();
  }
  function clearLimitedPassLocal() {
    var st = store.getState();
    st.settings.secondaryAdmins = [];
    store.save();
  }
  function limitedAdminPanelNode() {
    var panel = el('div', { class: 'panel', id: 'limited-admin-panel' }, [
      el('h3', { text: '二级管理员' }),
      el('div', { id: 'secondary-admin-list' }),
      el('div', { id: 'limited-admin-actions' })
    ]);
    return panel;
  }
  function refreshLimitedAdminPanel() {
    var st = $('#secondary-admin-list'), ac = $('#limited-admin-actions');
    if (!st || !ac) return;
    clear(st); clear(ac);
    // 统一从 payload.settings.secondaryAdmins 读取（本地版和云端版一致，通过 admin_write 同步）
    renderLimitedStatus(getSecondaryAdmins());
  }
  function renderLimitedStatus(list) {
    var st = $('#secondary-admin-list'), ac = $('#limited-admin-actions');
    if (!st || !ac) return;
    clear(st); clear(ac);
    list = list || [];
    if (!list.length) {
      st.appendChild(el('span', { class: 'muted', text: '尚未添加二级管理员' }));
    } else {
      var tbl = el('table', {}, [el('thead', {}, [el('tr', {}, [
        el('th', { text: '名称' }), el('th', { text: '状态' })
      ])])]);
      var tbody = el('tbody', {});
      list.forEach(function (a) {
        tbody.appendChild(el('tr', {}, [
          el('td', { text: a.name || ('#' + a.id) }),
          el('td', { class: 'sa-name', text: '已启用' })
        ]));
      });
      tbl.appendChild(tbody);
      st.appendChild(tbl);
    }
    if (canEditSettings()) {
      ac.appendChild(el('button', { class: 'btn', id: 'btn-add-secondary', onclick: onAddSecondary }, ['添加二级管理员']));
      if (list.length) ac.appendChild(el('button', { class: 'btn danger', id: 'btn-del-secondary', onclick: onDeleteSecondary }, ['删除二级管理员']));
    }
  }
  function onAddSecondary() {
    var name = el('input', { type: 'text', id: 'secondary-name-input', placeholder: '如：王老师 / qq1976656' });
    var pass = el('input', { type: 'password', id: 'secondary-pass-input' });
    var pass2 = el('input', { type: 'password', id: 'secondary-pass-input2' });
    var err = el('p', { class: 'muted', style: 'color:#e5484d;min-height:1.2em' });
    var mask = openModal('添加二级管理员', [
      el('div', { class: 'form-row' }, [el('label', { text: '名称' }), name]),
      el('div', { class: 'form-row' }, [el('label', { text: '密码' }), pass]),
      el('div', { class: 'form-row' }, [el('label', { text: '确认密码' }), pass2]),
      err
    ], function () {
      var n = name.value.trim(), v = pass.value.trim(), v2 = pass2.value.trim();
      if (!n) { err.textContent = '请输入名称'; return false; }
      if (!v || v.length < 4) { err.textContent = '密码至少 4 位'; return false; }
      if (v !== v2) { err.textContent = '两次输入不一致'; return false; }
      if (v === getAdminPass()) { err.textContent = '不能与主管理员密码相同'; return false; }
      var dup = getSecondaryAdmins().some(function (a) { return a.pwd === v; });
      if (dup) { err.textContent = '该密码已存在，请换一个'; return false; }
      if (READONLY_MODE) {
        // 云端版：先调用 RPC 写入数据库（用于密码校验），成功后同步写入 payload 并自动推送
        if (!AppCloudLib || !AppCloudLib.addSecondary) {
          // 无 RPC 时直接用本地方式（仍会通过 store.save 触发推送）
          addSecondaryAdminLocal(n, v);
          closeModal(mask);
          if (typeof alert === 'function') alert('二级管理员已添加');
          refreshLimitedAdminPanel();
          return true;
        }
        AppCloudLib.addSecondary(cloudAdminPassword, n, v).then(function () {
          // RPC 成功后，同步写入 payload.settings.secondaryAdmins（store.save 会触发自动推送）
          addSecondaryAdminLocal(n, v);
          closeModal(mask);
          if (typeof alert === 'function') alert('二级管理员已添加');
          refreshLimitedAdminPanel();
        }).catch(function (e) {
          // RPC 失败但本地写入成功（可能是旧版数据库无 secondary_admins 表），仍以本地为准
          if (addSecondaryAdminLocal(n, v)) {
            closeModal(mask);
            if (typeof alert === 'function') alert('二级管理员已添加（本地同步）');
            refreshLimitedAdminPanel();
          } else {
            err.textContent = '添加失败：' + (e && e.message ? e.message : '网络错误');
          }
        });
        return false;
      }
      addSecondaryAdminLocal(n, v);
      if (typeof alert === 'function') alert('二级管理员已添加');
      refreshLimitedAdminPanel();
      return true;
    }, '确定');
  }
  function onDeleteSecondary() {
    var err = el('p', { class: 'muted', style: 'color:#e5484d;min-height:1.2em' });
    var listWrap = el('div', { class: 'sa-delete-list' });
    var body = [
      el('p', { class: 'muted', text: '请选择要删除的二级管理员：' }),
      listWrap,
      err
    ];
    // 统一从 payload.settings.secondaryAdmins 读取列表
    renderDeleteList(getSecondaryAdmins());
    function renderDeleteList(items) {
      clear(listWrap);
      if (!items || !items.length) {
        listWrap.appendChild(el('p', { class: 'muted', text: '暂无二级管理员。' }));
        return;
      }
      items.forEach(function (a) {
        listWrap.appendChild(el('div', { class: 'sa-delete-row' }, [
          el('span', { text: a.name || ('#' + a.id) }),
          el('button', { class: 'btn danger', onclick: function () { doDel(a.id); } }, ['删除'])
        ]));
      });
    }
    function doDel(id) {
      // 先从本地 payload 删除（store.save 触发自动推送）
      delSecondaryAdminLocal(id);
      if (READONLY_MODE && AppCloudLib && AppCloudLib.delSecondary && cloudAdminPassword) {
        // 云端版同时调用 RPC 删除数据库表中的记录（用于密码校验）
        AppCloudLib.delSecondary(cloudAdminPassword, id).catch(function () { /* RPC 失败不影响本地 */ });
      }
      closeModal(mask);
      if (typeof alert === 'function') alert('二级管理员已删除');
      refreshLimitedAdminPanel();
    }
    var mask = openModal('删除二级管理员', body, null, '关闭');
  }

  // ---------- 寝室数据（独立模块：男寝/女寝/科技楼 三选项，寝室号一个班级栏【高（一/二/三）（1~15）班】+ 人数，按楼层分组） ----------
  var dormArea = '男寝';

  function renderDormRoom(root) {
    clear(root);
    var tabs = el('div', { class: 'dorm-tabs' }, C.DORM_AREAS.map(function (a) {
      return el('button', {
        class: 'dorm-tab' + (a === dormArea ? ' active' : ''),
        onclick: function () { dormArea = a; renderDormRoom(root); }
      }, [a]);
    }));
    root.appendChild(el('div', { class: 'panel' }, [
      tabs,
      el('div', { id: 'dorm-room-list' })
    ]));
    renderDormRoomList();
  }

  // 按楼层分组（寝室号百位即楼层），返回 [{floor, rooms}]
  function dormFloorGroups(rooms) {
    var floors = {};
    (rooms || []).forEach(function (r) {
      var f = Math.floor(Number(r) / 100);
      if (!floors[f]) floors[f] = [];
      floors[f].push(r);
    });
    return Object.keys(floors).sort(function (a, b) { return Number(a) - Number(b); })
      .map(function (f) { return { floor: Number(f), rooms: floors[f] }; });
  }

  // 阿拉伯数字转中文数字（支持 0-99）
  function numToCn(n) {
    n = parseInt(n, 10);
    if (isNaN(n) || n < 0) return '';
    var digits = ['零','一','二','三','四','五','六','七','八','九'];
    if (n < 10) return digits[n];
    if (n === 10) return '十';
    if (n < 20) return '十' + digits[n - 10];
    if (n < 100) {
      var t = Math.floor(n / 10), o = n % 10;
      return digits[t] + '十' + (o > 0 ? digits[o] : '');
    }
    return String(n);
  }

  // 解析班级 '高一4班' -> {grade:'一', no:'4'}；非法返回 null
  function parseDormClass(cls) {
    if (!cls) return null;
    var m = String(cls).match(/^高([一二三四五六七八九十]{1,3})(\d{1,2})班$/);
    if (!m) return null;
    return { grade: m[1], no: m[2] };
  }

  function renderDormRoomList() {
    var listNode = $('#dorm-room-list');
    if (!listNode) return;
    clear(listNode);
    // 寝室数据：管理员（含二级管理员）均可编辑保存（二级管理员只读学生信息/数据与设置）
    var canEdit = isAdmin;
    var area = dormArea;
    var groups = dormFloorGroups(C.DORM_ROOMS[area]);
    var map = {};
    store.getState().dormMap.forEach(function (d) {
      if (String(d.area).trim() === area && d.room != null) {
        var r = String(d.room).trim();
        if (!map[r]) map[r] = [];
        map[r].push(d);
      }
    });
    var table = el('table', { class: 'dorm-room-table', id: 'dorm-room-table', style: 'table-layout:fixed;width:100%' });
    var thead = el('thead');
    thead.appendChild(el('tr', {}, [
      el('th', { text: '寝室号' }),
      el('th', { text: '班级' }),
      el('th', { text: '人数' })
    ]));
    table.appendChild(thead);
    var tbody = el('tbody', { id: 'dorm-room-tbody' });
    groups.forEach(function (g) {
      // 楼层分隔行（带保存按钮）
      var floorSep = el('tr', { class: 'dorm-floor-sep' }, [
        el('td', { colspan: '3' }, [
          el('span', { text: g.floor + '楼' }),
          canEdit ? el('button', { class: 'btn primary dorm-floor-save', style: 'float:right;padding:4px 12px;font-size:12px', 'data-floor': String(g.floor), onclick: function () { saveDormRoom(g.floor); } }, ['保存本层']) : null
        ])
      ]);
      tbody.appendChild(floorSep);
      g.rooms.forEach(function (room) {
        var recs = map[room] || [];
        var cnt = '';
        recs.forEach(function (r) { if (r.count != null) cnt = String(r.count); });
        var clsCell = el('td', { class: 'dorm-class-cell' });
        var withCls = recs.filter(function (r) { return r.class; });
        var grpCount = Math.max(1, withCls.length);
        for (var gi = 0; gi < grpCount; gi++) {
          var parsed = parseDormClass(withCls[gi] ? withCls[gi].class : '');
          clsCell.appendChild(makeDormClassGrp(room, gi, parsed, !canEdit));
        }
        if (canEdit) {
          clsCell.appendChild(el('button', { class: 'dorm-add-cls', type: 'button', 'data-room': room, title: '添加一个班级（混寝）', onclick: function () { addDormClassCell(this); } }, ['+']));
        }
        var cntInp = el('input', { class: 'dorm-cell dorm-count', type: 'number', min: '0', max: '99', 'data-room': room, 'data-field': 'count', 'data-floor': String(g.floor), value: cnt, placeholder: '人数' });
        if (!canEdit) cntInp.setAttribute('disabled', 'disabled');
        tbody.appendChild(el('tr', {}, [
          el('td', { class: 'dorm-room-no', text: room }),
          clsCell,
          el('td', {}, [cntInp])
        ]));
      });
    });
    table.appendChild(tbody);
    listNode.appendChild(table);
    if (canEdit) {
      listNode.appendChild(el('div', { class: 'dorm-save-row' }, [
        el('button', { class: 'btn primary', id: 'btn-dorm-save', onclick: function () { saveDormRoom(); } }, ['保存修改']),
        el('span', { class: 'muted', id: 'dorm-save-hint' })
      ]));
    }
  }

  // 生成一个班级输入组：高 [年级(中文数字，可自定义)] [班号(最多两位)] 班
  function makeDormClassGrp(room, grpIdx, parsed, disabled) {
    var grp = el('span', { class: 'dorm-cls-grp' });
    grp.appendChild(el('span', { text: '高' }));
    var gradeInp = el('input', { class: 'dorm-cell dorm-grade', type: 'text', 'data-room': room, 'data-field': 'grade', 'data-grp': String(grpIdx), value: parsed ? parsed.grade : '', placeholder: '年级' });
    // 失焦时阿拉伯数字自动转换为中文数字（1→一，12→十二）
    gradeInp.addEventListener('blur', function () {
      var v = this.value.trim();
      if (/^\d+$/.test(v)) this.value = numToCn(v);
    });
    var noInp = el('input', { class: 'dorm-cell dorm-no', type: 'text', maxlength: '2', 'data-room': room, 'data-field': 'no', 'data-grp': String(grpIdx), value: parsed ? parsed.no : '', placeholder: '班号', oninput: function () { this.value = this.value.replace(/\D/g, '').slice(0, 2); } });
    grp.appendChild(gradeInp);
    grp.appendChild(noInp);
    grp.appendChild(el('span', { text: '班' }));
    if (disabled) {
      gradeInp.setAttribute('disabled', 'disabled');
      noInp.setAttribute('disabled', 'disabled');
    }
    return grp;
  }

  // 「+」按钮：为当前寝室追加一个班级组（混寝）
  function addDormClassCell(btn) {
    var room = btn.getAttribute('data-room');
    var cell = btn.parentNode;
    var grps = cell.querySelectorAll('.dorm-cls-grp');
    cell.insertBefore(makeDormClassGrp(room, grps.length, null, false), btn);
    var hint = $('#dorm-save-hint');
    if (hint) hint.textContent = '';
  }

  function saveDormRoom(floor) {
    if (!guardAdmin('保存寝室数据')) return;
    var area = dormArea;
    var dm = store.getState().dormMap;
    var cells = doc.querySelectorAll('#dorm-room-table .dorm-cell');
    var byRoom = {};
    Array.prototype.forEach.call(cells, function (inp) {
      var room = inp.getAttribute('data-room');
      if (floor != null && Math.floor(Number(room) / 100) !== Number(floor)) return;
      var field = inp.getAttribute('data-field');
      var grp = inp.getAttribute('data-grp');
      if (!byRoom[room]) byRoom[room] = { grps: {}, count: null };
      if (field === 'count') byRoom[room].count = inp.value;
      else {
        if (!byRoom[room].grps[grp]) byRoom[room].grps[grp] = {};
        byRoom[room].grps[grp][field] = inp.value;
      }
    });
    var changed = 0;
    Object.keys(byRoom).forEach(function (room) {
      var v = byRoom[room];
      var classes = [];
      Object.keys(v.grps || {}).forEach(function (gk) {
        var grade = String(v.grps[gk].grade || '').trim();
        var no = String(v.grps[gk].no || '').trim();
        if (grade && no) classes.push('高' + grade + no + '班');
      });
      var countRaw = String(v.count == null ? '' : v.count).trim();
      var count = countRaw === '' ? null : Number(countRaw);
      if (count != null && (!isFinite(count) || count < 0)) count = null;
      var recs = dm.filter(function (d) { return String(d.area).trim() === area && String(d.room).trim() === room; });
      recs.forEach(function (r) { var i = dm.indexOf(r); if (i !== -1) dm.splice(i, 1); });
      if (classes.length || count != null) {
        if (classes.length) {
          classes.forEach(function (cls, ci) {
            dm.push({ room: room, class: cls, area: area, count: ci === 0 ? count : null });
          });
        } else {
          dm.push({ room: room, class: '', area: area, count: count });
        }
        changed++;
      }
    });
    store.save();
    var hint = $('#dorm-save-hint');
    if (hint) hint.textContent = floor != null ? (floor + '楼已保存 ' + changed + ' 处修改。') : (changed ? '已保存 ' + changed + ' 处修改。' : '没有需要保存的修改。');
    renderDormRoomList();
  }

  // 寝室概况（首页模块）：各区域房间数/入住人数、未住满宿舍、空白宿舍数量、住校男女生汇总
  // 住校男女生按寝室数据统计：男寝+科技楼住男生，女寝住女生（与学生信息无关）
  function dormSummary() {
    var st = store.getState();
    var dormMap = st.dormMap || [];
    // 按 区域|寝室号 聚合（混寝多班级只保留一条 count，避免重复统计）
    var roomAgg = {};
    dormMap.forEach(function (d) {
      var r = String(d.room == null ? '' : d.room).trim();
      if (!r) return;
      var key = String(d.area).trim() + '|' + r;
      if (!roomAgg[key]) roomAgg[key] = { area: String(d.area).trim(), room: r, count: null, classes: [] };
      var cls = d.class ? String(d.class).trim() : '';
      if (cls && roomAgg[key].classes.indexOf(cls) === -1) roomAgg[key].classes.push(cls);
      if (d.count != null) roomAgg[key].count = Number(d.count);
    });
    var totalRooms = 0, totalCount = 0, male = 0, female = 0;
    var areas = [];
    C.DORM_AREAS.forEach(function (a) {
      var roomsList = C.DORM_ROOMS[a] || [];
      var rooms = roomsList.length;
      var cnt = 0, blank = 0, totalCapacity = 0;
      var notFull = [];
      roomsList.forEach(function (room) {
        var cap = C.dormCapacity(a, room); // 大寝室（科技楼301/401/421）容量20，其余8
        totalCapacity += cap;
        var agg = roomAgg[a + '|' + room];
        if (agg && agg.count != null && !isNaN(agg.count)) {
          cnt += agg.count;
          if (agg.count > 0 && agg.count < cap) {
            notFull.push({ room: room, count: agg.count, lack: cap - agg.count, classes: agg.classes ? agg.classes.slice() : [] });
          }
        } else {
          blank++;
        }
      });
      totalRooms += rooms;
      totalCount += cnt;
      if (a === '男寝' || a === '科技楼') male += cnt;
      else female += cnt;
      areas.push({ area: a, rooms: rooms, count: cnt, notFull: notFull, blank: blank, totalCapacity: totalCapacity, free: totalCapacity - cnt });
    });
    return { areas: areas, male: male, female: female, totalRooms: totalRooms, totalCount: totalCount };
  }

  // 首页「寝室概况」面板：三个区域卡片横版（区域/房间数/入住人数）+ 下方未住满宿舍 + 空白宿舍数量 + 汇总住校男女生
  function dormSummaryPanel() {
    var d = dormSummary();
    var panel = el('div', { class: 'panel', id: 'home-dorm' }, [el('h3', { text: '寝室概况' })]);
    // 三个区域卡片横版（男寝 / 女寝 / 科技楼）：已入住 x 人 + 剩余空铺 x 人
    var cardRow = el('div', { class: 'dorm-card-row' });
    d.areas.forEach(function (a) {
      cardRow.appendChild(el('div', { class: 'dorm-card link', onclick: function () { switchTo('dorm'); } }, [
        el('div', { class: 'dorm-card-name', text: a.area }),
        el('div', { class: 'dorm-card-line', text: '已入住 ' + a.count + ' 人' }),
        el('div', { class: 'dorm-card-line', text: '剩余空铺 ' + a.free + ' 人' })
      ]));
    });
    panel.appendChild(cardRow);
    // 未住满宿舍（放在三个卡片下边）
    var notFullAll = [];
    d.areas.forEach(function (a) {
      a.notFull.forEach(function (n) { notFullAll.push({ area: a.area, room: n.room, count: n.count, lack: n.lack, classes: n.classes || [] }); });
    });
    // 排序：区域 → 楼层 → 班级 → 寝室号 → 已住人数 → 差
    notFullAll.sort(function (a, b) {
      if (a.area !== b.area) return a.area.localeCompare(b.area, 'zh');
      var fa = parseInt(String(a.room).charAt(0), 10) || 0, fb = parseInt(String(b.room).charAt(0), 10) || 0;
      if (fa !== fb) return fa - fb;
      var ca = (a.classes && a.classes[0]) || '', cb = (b.classes && b.classes[0]) || '';
      if (ca !== cb) return ca.localeCompare(cb, 'zh');
      if (String(a.room) !== String(b.room)) return String(a.room).localeCompare(String(b.room));
      if (a.count !== b.count) return a.count - b.count;
      return a.lack - b.lack;
    });
    var blanks = d.areas.filter(function (a) { return a.blank > 0; });
    if (notFullAll.length === 0) {
      panel.appendChild(el('p', { class: 'muted', text: blanks.length ? '无未住满宿舍' : '已登记寝室均住满' }));
    } else {
      panel.appendChild(el('div', { class: 'dorm-notfull-title', text: '未住满宿舍：' }));
      var nft = el('table', {}, [el('thead', {}, [el('tr', {}, [el('th', { text: '区域' }), el('th', { text: '楼层' }), el('th', { text: '班级' }), el('th', { text: '寝室号' }), el('th', { text: '已住人数' }), el('th', { text: '差' })])])]);
      var ntb = el('tbody', {});
      notFullAll.forEach(function (n) {
        var floor = parseInt(String(n.room).charAt(0), 10) || '';
        ntb.appendChild(el('tr', {}, [
          el('td', { text: n.area }),
          el('td', { text: floor ? floor + '楼' : '' }),
          el('td', { text: (n.classes || []).join('、') }),
          el('td', { class: 'dorm-room-no', text: n.room }),
          el('td', { text: String(n.count) }),
          el('td', { text: String(n.lack) })
        ]));
      });
      nft.appendChild(ntb);
      panel.appendChild(nft);
    }
    // 空白宿舍数量（不逐个列出，只显示数量）
    if (blanks.length) {
      panel.appendChild(el('div', { class: 'dorm-blank-line', text: '空白宿舍：' + blanks.map(function (a) { return a.area + ' ' + a.blank + ' 间'; }).join(' · ') }));
    }
    // 汇总住校男女生
    var totalCap = d.areas.reduce(function (sum, a) { return sum + a.totalCapacity; }, 0);
    panel.appendChild(el('div', { class: 'dorm-summary-line', text: '共可住 ' + totalCap + ' 人 · 已住男生 ' + d.male + ' 人 · 已住女生 ' + d.female + ' 人' }));
    return panel;
  }

  function lastBackupText() {
    var t = store.getState().settings.lastBackupAt;
    return t ? ('最近备份：' + t) : '尚未备份';
  }

  function addScoreItem(d) { if (!guardFull('新增量化项目')) return; var it = { id: C.uid('i'), type: d.type, name: d.name, delta: d.delta }; store.getState().scoreItems.push(it); store.save(); return it; }
  function updateScoreItem(id, d) { if (!guardFull('编辑量化项目')) return; var l = store.getState().scoreItems; for (var i = 0; i < l.length; i++) if (l[i].id === id) { Object.assign(l[i], d); break; } store.save(); }
  function deleteScoreItem(id) { if (!guardFull('删除量化项目')) return; if (typeof confirm === 'function' && !confirm('确定删除该项目？')) return; var s = store.getState(); s.scoreItems = s.scoreItems.filter(function (x) { return x.id !== id; }); store.setState(s); }

  function addDormMap(d) { if (!guardFull('新增对照')) return; store.getState().dormMap.push({ room: d.room, class: d.class, area: d.area || '' }); store.save(); return d; }
  function updateDormMap(idx, d) { if (!guardFull('编辑对照')) return; var l = store.getState().dormMap; if (l[idx]) { l[idx] = { room: d.room, class: d.class, area: d.area || '' }; store.save(); } }
  function deleteDorm(idx) { if (!guardFull('删除对照')) return; if (typeof confirm === 'function' && !confirm('确定删除该对照？')) return; var s = store.getState(); s.dormMap.splice(idx, 1); store.setState(s); }
  function importDormMapFromRows(rows) {
    if (!guardFull('导入对照表')) return;
    var built = C.buildDormMapFromRows(rows);
    var l = store.getState().dormMap;
    built.forEach(function (b) { l.push(b); });
    store.save();
    return built.length;
  }
  function confirmClear() {
    if (typeof confirm === 'function' && !confirm('确定清空全部数据？此操作不可撤销，建议先导出备份。')) return;
    clearAllData();
    if (typeof alert === 'function') alert('数据已清空');
  }
  function clearAllData() {
    if (!guardFull('清空数据')) return;
    store.clear();
    // 清空量化管理分的预设月份（设为空数组，避免activeScoreMonths自动生成最近5个月）
    var st = store.getState();
    st.settings = st.settings || {};
    st.settings.scoreMonths = [];
    store.setState(st);
    // 已登录云端管理员时，同步清空云端数据，避免30秒后云端拉取覆盖恢复
    if (cloudAdminPassword && AppCloudLib) {
      cloudStatus.busy = true;
      updateCloudUI();
      var emptyPayload = store.getState();
      var doPush = AppCloudLib.adminWrite
        ? AppCloudLib.adminWrite(emptyPayload, cloudAdminPassword)
        : AppCloudLib.push(emptyPayload, cloudAdminPassword);
      doPush.then(function () {
        cloudStatus.busy = false;
        updateCloudUI();
      }).catch(function () {
        cloudStatus.busy = false;
        updateCloudUI();
      });
    }
    refresh();
  }

  // ---------- 导出 API ----------
  var App = {
    init: init,
    switchTo: switchTo,
    refresh: refresh,
    doExport: doExport,
    doImportText: doImportText,
    importStudentsFromRows: importStudentsFromRows,
    addStudent: addStudent,
    updateStudent: updateStudent,
    deleteStudent: deleteStudent,
    setStudentsFilter: function (f) { Object.assign(studentsFilter, f); renderStudentTable(); },
    addScoreItem: addScoreItem,
    updateScoreItem: updateScoreItem,
    deleteScoreItem: deleteScoreItem,
    addDormMap: addDormMap,
    updateDormMap: updateDormMap,
    deleteDorm: deleteDorm,
    importDormMapFromRows: importDormMapFromRows,
    clearAllData: clearAllData,
    recordScore: recordScore,
    studentScoreLogs: studentScoreLogs,
    setScoreSort: function (v) { scoreSort = v; renderScoreTable(); },
    setScoreFilter: function (f) { Object.assign(scoreFilter, f); renderScoreTable(); },
    recordDiscipline: recordDiscipline,
    deleteStudentDiscipline: deleteStudentDiscipline,
    deleteDiscipline: deleteDiscipline,
    studentDisciplineLogs: studentDisciplineLogs,
    saveLeaveRecord: saveLeaveRecord,
    countLeavePersons: countLeavePersons,
    saveReportRecord: saveReportRecord,
    // 二级管理员
    getSecondaryAdmins: getSecondaryAdmins,
    addSecondaryAdminLocal: addSecondaryAdminLocal,
    delSecondaryAdminLocal: delSecondaryAdminLocal,
    // 兼容旧 API
    getLimitedPass: getLimitedPass,
    setLimitedPassLocal: setLimitedPassLocal,
    clearLimitedPassLocal: clearLimitedPassLocal,
    // 云端同步
    pushToCloud: pushToCloud,
    pullFromCloud: pullFromCloud,
    cloudLastPush: cloudLastPush,
    openModal: openModal,
    closeModal: closeModal,
    el: el,
    // 权限相关（供测试与外部调用）
    openAdminGate: openAdminGate,
    logoutAdmin: logoutAdmin,
    setAdminPass: setAdminPass,
    getAdminPass: getAdminPass,
    hasAdminPass: hasAdminPass,
    get isAdmin() { return isAdmin; },
    get adminRole() { return adminRole; },
    // 仅供测试：直接设定管理员状态（绕过弹窗）
    setAdminForTest: function (v) { isAdmin = !!v; if (!v) adminRole = null; else if (adminRole !== 'limited') adminRole = 'full'; refresh(); },
    // 仅供测试：设定二级管理员角色
    setLimitedForTest: function () { isAdmin = true; adminRole = 'limited'; refresh(); },
    get state() { return state; },
    get store() { return store; },
    get core() { return C; }
  };

  if (typeof window !== 'undefined') window.App = App;
  if (typeof module !== 'undefined' && module.exports) module.exports = App;
})();
