/*
 * store.js —— 数据存储层
 * 纯逻辑，可在 Node（测试）与浏览器（localStorage）两种环境运行。
 * 全部业务数据以单一 JSON 对象存于 backend 的一个 key 中，便于整体导出/导入。
 */
(function (global, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    global.AppStore = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var DATA_VERSION = 1;
  var STORAGE_KEY = 'STUDENT_ADMIN_DATA';

  function defaultData() {
    return {
      version: DATA_VERSION,
      students: [],       // {id, class, name, gender, score, boarding}（boarding: 走读/住校/''）
      scoreLogs: [],      // {id, studentId, date, item, delta, reason, after}
      scoreItems: [],     // {id, type:'加分'|'扣分', name, value}
      disciplineLogs: [], // {id, studentId, date, type, note}
      leaveRecords: [],   // {id, date, raw, formatted, count}
      dormReports: [],    // {id, date, raw, formatted, issues:[]}
      dormMap: [],        // {room, class, count, area}（area: 男寝/女寝/科技楼；count: 入住人数，可空）
      scoreMonthly: [],   // {id, studentId, month:'YYYY-MM', banKou, banJiang, zhengKou, zhengJiang}
      employees: [],      // {id, name, gender}
      employeeRecords: [],// {id, employeeId, date, reason, amount}
      // 排班系统数据
      dutyStaff: [],      // 员工信息 [{id, name, gender, group, role}]
      dutyAllPostPointers: {},   // 全员模式岗位指针 {personId: postIndex}
      dutyGroupPostPointers: {}, // 分组模式岗位指针 {personId: postIndex}
      dutyGroupRotation: 0,      // 分组模式主副班轮换 0=A主B副, 1=B主A副
      dutyGatePointer: 0,        // 大门口岗位指针
      dutyAfterSchoolPointer: 0, // 放学后岗位指针
      dutyScheduleHistory: [],   // 排班历史
      dutySalary: {},            // 工资数据 {'YYYY_M': [{name, gender, ...}]}
      lastModified: 0,           // 最后修改时间戳（用于多设备同步）
      settings: { lastBackupAt: null, homeOrder: null, scoreMonths: null, adminPass: null, secondaryAdmins: [] }
    };
  }

  // 保证任意读入的数据结构完整（缺失字段补默认），并做基本类型校验
  function normalizeData(raw) {
    var base = defaultData();
    if (!raw || typeof raw !== 'object') return base;
    var arrayKeys = ['students', 'scoreLogs', 'scoreItems', 'disciplineLogs', 'leaveRecords', 'dormReports', 'dormMap', 'scoreMonthly', 'employees', 'employeeRecords', 'dutyStaff', 'dutyScheduleHistory'];
    for (var i = 0; i < arrayKeys.length; i++) {
      var k = arrayKeys[i];
      if (Array.isArray(raw[k])) base[k] = raw[k];
    }
    // 对象类型字段
    var objKeys = ['dutyAllPostPointers', 'dutyGroupPostPointers', 'dutySalary'];
    for (var j = 0; j < objKeys.length; j++) {
      var ok = objKeys[j];
      if (raw[ok] && typeof raw[ok] === 'object') base[ok] = raw[ok];
    }
    // 数字类型字段
    if (typeof raw.dutyGroupRotation === 'number') base.dutyGroupRotation = raw.dutyGroupRotation;
    if (typeof raw.dutyGatePointer === 'number') base.dutyGatePointer = raw.dutyGatePointer;
    if (typeof raw.dutyAfterSchoolPointer === 'number') base.dutyAfterSchoolPointer = raw.dutyAfterSchoolPointer;
    if (typeof raw.lastModified === 'number') base.lastModified = raw.lastModified;
    // 兼容老数据：dormMap 元素缺 area / count 字段时补默认
    if (Array.isArray(base.dormMap)) {
      base.dormMap = base.dormMap.map(function (d) {
        if (d && typeof d === 'object') {
          var out = {};
          if (!('area' in d)) out.area = '';
          if (!('count' in d)) out.count = null;
          return Object.keys(out).length ? Object.assign({}, d, out) : d;
        }
        return d;
      });
    }
    // 兼容老数据：students 元素缺 boarding 字段时补空（默认住校？按未知处理，展示为空）
    if (Array.isArray(base.students)) {
      base.students = base.students.map(function (s) {
        if (s && typeof s === 'object' && !('boarding' in s)) {
          return Object.assign({}, s, { boarding: '' });
        }
        return s;
      });
    }
    if (raw.settings && typeof raw.settings === 'object') {
      var homeOrder = Array.isArray(raw.settings.homeOrder) ? raw.settings.homeOrder : null;
      var scoreMonths = Array.isArray(raw.settings.scoreMonths) ? raw.settings.scoreMonths : null;
      var secondaryAdmins = Array.isArray(raw.settings.secondaryAdmins) ? raw.settings.secondaryAdmins : [];
      // 兼容老数据：旧单密码 limitedPass 迁移为一条二级管理员（名称用密码），并清空旧字段
      if (!secondaryAdmins.length && raw.settings.limitedPass) {
        secondaryAdmins = [{ id: 'l' + Date.now().toString(36), name: String(raw.settings.limitedPass), pwd: String(raw.settings.limitedPass) }];
      }
      base.settings = Object.assign({ lastBackupAt: null, homeOrder: null, scoreMonths: null, adminPass: null, secondaryAdmins: [] }, raw.settings, { homeOrder: homeOrder, scoreMonths: scoreMonths, secondaryAdmins: secondaryAdmins });
    }
    if (typeof raw.version === 'number') base.version = raw.version;
    return base;
  }

  // ---- backends ----
  function memoryBackend(initial) {
    var mem = Object.assign({}, initial || {});
    return {
      get: function (k) { return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null; },
      set: function (k, v) { mem[k] = v; },
      remove: function (k) { delete mem[k]; }
    };
  }

  function localStorageBackend() {
    var ls = (typeof localStorage !== 'undefined') ? localStorage : (global && global.localStorage);
    return {
      get: function (k) { return ls.getItem(k); },
      set: function (k, v) { ls.setItem(k, v); },
      remove: function (k) { ls.removeItem(k); }
    };
  }

  function createStore(backend, key) {
    var storageKey = key || STORAGE_KEY;
    var state = null;

    function load() {
      var rawStr = backend.get(storageKey);
      if (rawStr == null) {
        state = defaultData();
        return state;
      }
      var parsed;
      try {
        parsed = JSON.parse(rawStr);
      } catch (e) {
        // 数据损坏时不静默丢弃：抛出让上层决定（例如提示用户从备份恢复）
        throw new Error('本地数据解析失败：' + e.message);
      }
      state = normalizeData(parsed);
      return state;
    }

    function ensureLoaded() {
      if (state == null) load();
      return state;
    }

    function getState() { return ensureLoaded(); }

    function save() {
      ensureLoaded();
      try {
        state.lastModified = Date.now();
        backend.set(storageKey, JSON.stringify(state));
      } catch (e) {
        // localStorage 配额不足或写入失败时，提示用户但不中断操作
        if (typeof console !== 'undefined') console.error('数据保存失败：', e);
        if (typeof global !== 'undefined' && global.onStoreSaveError) {
          try { global.onStoreSaveError(e); } catch (_) {}
        }
      }
      return state;
    }

    function setState(next) {
      state = normalizeData(next);
      backend.set(storageKey, JSON.stringify(state));
      return state;
    }

    function exportJSON() {
      ensureLoaded();
      return JSON.stringify(state, null, 2);
    }

    function importJSON(str) {
      var parsed;
      try {
        parsed = JSON.parse(str);
      } catch (e) {
        throw new Error('备份文件不是有效的 JSON：' + e.message);
      }
      // 基本校验：必须是对象，且至少含有本应用的一个已知字段
      if (!parsed || typeof parsed !== 'object' ||
        !('students' in parsed || 'version' in parsed || 'dormMap' in parsed)) {
        throw new Error('备份文件格式不正确，无法识别为本应用数据');
      }
      state = normalizeData(parsed);
      backend.set(storageKey, JSON.stringify(state));
      return state;
    }

    function clear() {
      state = defaultData();
      backend.set(storageKey, JSON.stringify(state));
      return state;
    }

    return {
      load: load,
      save: save,
      getState: getState,
      setState: setState,
      exportJSON: exportJSON,
      importJSON: importJSON,
      clear: clear,
      STORAGE_KEY: storageKey
    };
  }

  return {
    DATA_VERSION: DATA_VERSION,
    STORAGE_KEY: STORAGE_KEY,
    defaultData: defaultData,
    normalizeData: normalizeData,
    memoryBackend: memoryBackend,
    localStorageBackend: localStorageBackend,
    createStore: createStore
  };
});
