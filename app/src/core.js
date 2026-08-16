/*
 * core.js —— 纯业务逻辑（UMD），可在 Node 测试与浏览器中复用。
 * 本文件只放“无 DOM 依赖”的纯函数，随开发阶段逐步扩充。
 */
(function (global, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    global.AppCore = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ---- 导航定义 ----
  var NAV_ITEMS = [
    { key: 'home', label: '首页' },
    { key: 'students', label: '学生信息' },
    { key: 'score', label: '量化管理分' },
    { key: 'discipline', label: '违纪次数' },
    { key: 'leave', label: '请假名单' },
    { key: 'report', label: '每日通报' },
    { key: 'dorm', label: '寝室数据' },
    { key: 'employee', label: '教官绩效' },
    { key: 'settings', label: '数据与设置' }
  ];

  var GRADES = ['高一', '高二', '高三'];

  // ---- 日期工具 ----
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function todayStr(d) {
    d = d || new Date();
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  // 今天是否需要提醒备份：从未备份或最后备份不是今天 → 提醒
  function shouldRemindBackup(lastBackupAt, today) {
    if (!lastBackupAt) return true;
    return lastBackupAt !== today;
  }

  // ---- 唯一 id ----
  var _seq = 0;
  function uid(prefix) {
    _seq += 1;
    return (prefix || 'id') + '_' + Date.now().toString(36) + '_' + _seq;
  }

  // ---- 中文数字 → 阿拉伯数字（用于班号，支持 1~99）----
  var CN_DIGIT = { '零': 0, '〇': 0, '一': 1, '二': 2, '两': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9 };
  function cnToNum(str) {
    if (str == null) return null;
    str = String(str).trim();
    if (str === '') return null;
    if (/^\d+$/.test(str)) return parseInt(str, 10);
    // 处理“十、十一、二十、二十三、十二”等
    var total = 0;
    if (str.indexOf('十') !== -1) {
      var parts = str.split('十');
      var tens = parts[0] === '' ? 1 : (CN_DIGIT[parts[0]] != null ? CN_DIGIT[parts[0]] : null);
      var ones = parts[1] === '' ? 0 : (CN_DIGIT[parts[1]] != null ? CN_DIGIT[parts[1]] : null);
      if (tens == null || ones == null) return null;
      total = tens * 10 + ones;
      return total;
    }
    // 纯个位中文
    if (CN_DIGIT[str] != null) return CN_DIGIT[str];
    return null;
  }

  // 归一化班级写法：将“高一八班 / 高一8班 / 高一08班”统一成“高一8班”
  // 返回 { grade:'高一', classNo:8, label:'高一8班' } 或 null
  function parseClass(text) {
    if (text == null) return null;
    var s = String(text).replace(/\s+/g, '');
    // 格式1：高一1班 / 高一（1）班 / 高一(1)班（班在括号外，标准格式）
    var m = s.match(/^(高[一二三])[（(]?([0-9一二三四五六七八九十]+)[）)]?班$/);
    if (!m) {
      // 格式2：一（1）/ 二（1）/ 三（1）→ 补"高"前缀
      var m2 = s.match(/^([一二三])[（(]([0-9一二三四五六七八九十]+)[）)]$/);
      if (m2) m = ['', '高' + m2[1], m2[2]];
    }
    if (!m) {
      // 格式3：高一（1班）/ 高二(2班)（班在括号内，旧格式，兼容并转换）
      var m3 = s.match(/^(高[一二三])[（(]([0-9一二三四五六七八九十]+)班[）)]$/);
      if (m3) m = m3;
    }
    if (!m) return null;
    var grade = m[1];
    var classNo = cnToNum(m[2]);
    if (classNo == null) return null;
    return { grade: grade, classNo: classNo, label: grade + '（' + classNo + '）班' };
  }

  // 年级排序索引
  function gradeIndex(grade) {
    var i = GRADES.indexOf(grade);
    return i === -1 ? 99 : i;
  }

  // ---- CSV 解析（支持引号、逗号、换行、BOM）----
  function parseCSVRows(text) {
    if (text == null) return [];
    text = String(text).replace(/^\uFEFF/, ''); // 去 BOM
    var rows = [];
    var row = [];
    var field = '';
    var inQuotes = false;
    var i = 0;
    while (i < text.length) {
      var ch = text[i];
      if (inQuotes) {
        if (ch === '"') {
          if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
          inQuotes = false; i++; continue;
        }
        field += ch; i++; continue;
      }
      if (ch === '"') { inQuotes = true; i++; continue; }
      if (ch === ',') { row.push(field); field = ''; i++; continue; }
      if (ch === '\r') { i++; continue; }
      if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue; }
      field += ch; i++;
    }
    // 收尾
    if (field !== '' || row.length > 0) { row.push(field); rows.push(row); }
    // 去掉完全空行
    return rows.filter(function (r) { return r.some(function (c) { return String(c).trim() !== ''; }); });
  }

  // CSV 文本 → 对象数组（首行表头）
  function parseCSV(text) {
    var rows = parseCSVRows(text);
    if (rows.length === 0) return [];
    var header = rows[0].map(function (h) { return String(h).trim(); });
    var out = [];
    for (var r = 1; r < rows.length; r++) {
      var obj = {};
      for (var c = 0; c < header.length; c++) obj[header[c]] = rows[r][c] != null ? String(rows[r][c]).trim() : '';
      out.push(obj);
    }
    return out;
  }

  // 表头别名映射
  var HEADER_ALIAS = {
    'class': ['班级', '班', 'class', '行政班', '所在班级'],
    'name': ['姓名', '名字', 'name', '学生姓名'],
    'gender': ['性别', 'gender', 'sex'],
    'score': ['量化分', '量化', '分数', '分', 'score', '得分'],
    'boarding': ['走读住校', '走读/住校', '走读或住校', '住宿', '住校', '走读', 'boarding', '是否住校'],
    'area': ['区域', '宿舍区域', 'area', '区域名', '楼栋']
  };
  function pickField(row, field) {
    var aliases = HEADER_ALIAS[field];
    for (var k in row) {
      if (!Object.prototype.hasOwnProperty.call(row, k)) continue;
      var key = String(k).trim().toLowerCase();
      for (var a = 0; a < aliases.length; a++) {
        if (key === String(aliases[a]).toLowerCase()) return row[k];
      }
    }
    return undefined;
  }

  // 归一化“走读/住校”：识别“走读”或“住校”；无法识别返回 ''
  function normalizeBoarding(raw) {
    if (raw == null) return '';
    var s = String(raw).trim();
    if (s === '') return '';
    if (s.indexOf('走读') !== -1) return '走读';
    if (s.indexOf('住校') !== -1 || s.indexOf('住宿') !== -1) return '住校';
    // 兼容 “是/否” 之类：含“否”视为走读（未住宿）？这里保守处理，无法识别返回 ''
    return '';
  }

  // 单行 → 学生对象；量化分缺省/非法 → 100
  function normalizeStudentRow(row) {
    var cls = pickField(row, 'class');
    var name = pickField(row, 'name');
    var gender = pickField(row, 'gender');
    var scoreRaw = pickField(row, 'score');
    var boarding = pickField(row, 'boarding');
    var score = 100;
    if (scoreRaw != null && String(scoreRaw).trim() !== '') {
      var n = Number(scoreRaw);
      if (!isNaN(n)) score = n;
    }
    var pc = parseClass(cls);
    return {
      class: pc ? pc.label : (cls != null ? String(cls).trim() : ''),
      name: name != null ? String(name).trim() : '',
      gender: gender != null ? String(gender).trim() : '',
      score: score,
      boarding: normalizeBoarding(boarding)
    };
  }

  // 行数组 → 学生数组（带 id）；跳过无姓名的行
  function buildStudents(rows) {
    var out = [];
    (rows || []).forEach(function (row) {
      var s = normalizeStudentRow(row);
      if (!s.name) return;
      s.id = uid('s');
      out.push(s);
    });
    return out;
  }

  // 分数配色类名
  function scoreClass(score) {
    if (typeof score !== 'number' || isNaN(score)) return '';
    if (score < 20) return 'score-darkred';
    if (score < 60) return 'score-red';
    return '';
  }

  function studentGrade(cls) { var pc = parseClass(cls); return pc ? pc.grade : ''; }
  function studentClassNo(cls) { var pc = parseClass(cls); return pc ? pc.classNo : null; }

  // 学生筛选
  function filterStudents(list, opts) {
    opts = opts || {};
    return (list || []).filter(function (s) {
      if (opts.grade && studentGrade(s.class) !== opts.grade) return false;
      if (opts.classLabel && s.class !== opts.classLabel) return false;
      if (opts.gender && s.gender !== opts.gender) return false;
      if (opts.keyword) {
        var kw = String(opts.keyword).trim();
        if (kw && (String(s.name).indexOf(kw) === -1 && String(s.class).indexOf(kw) === -1)) return false;
      }
      return true;
    });
  }

  // 学生排序（按年级→班号→姓名）
  function sortStudentsByClass(list) {
    return (list || []).slice().sort(function (a, b) {
      var ga = gradeIndex(studentGrade(a.class)), gb = gradeIndex(studentGrade(b.class));
      if (ga !== gb) return ga - gb;
      var ca = studentClassNo(a.class) || 999, cb = studentClassNo(b.class) || 999;
      if (ca !== cb) return ca - cb;
      return String(a.name).localeCompare(String(b.name), 'zh');
    });
  }

  // ---- 寝室号↔班级 对照表 ----
  var ROOM_ALIAS = ['寝室号', '寝室', '宿舍号', '房间号', '宿舍', 'room'];
  var DORM_AREAS = ['男寝', '女寝', '科技楼'];
  // 每寝默认容量（人）：普通寝室 8 人
  var DORM_CAPACITY = 8;
  // 大寝室：科技楼 301 / 401 / 421 每寝可住 20 人
  var DORM_BIG_CAPACITY = 14;
  var DORM_BIG_ROOMS = { '科技楼': ['301', '401', '421'] };
  // 按 区域+寝室号 取该寝室容量（人）
  function dormCapacity(area, room) {
    var bigs = DORM_BIG_ROOMS[area] || [];
    if (bigs.indexOf(String(room)) !== -1) return DORM_BIG_CAPACITY;
    return DORM_CAPACITY;
  }
  // 各区域寝室号清单（来自学校提供的寝室示意图：男寝/女寝/科技楼）
  var DORM_ROOMS = {
    男寝: ["101","102","103","104","105","106","107","108","109","110","111","112","113","114","115","116","201","202","203","204","205","206","207","208","209","210","211","212","213","214","215","216","217","301","302","303","304","305","306","307","308","309","310","311","312","313","314","315","316","317","401","402","403","404","405","406","407","408","409","410","411","412","413","414","415","416","417","501","502","503","504","505","506","507","508","509","510","511","512","513","514","515","516","517"],
    女寝: ["123","125","127","128","129","130","131","132","201","202","203","204","205","206","207","208","209","210","211","212","213","214","215","216","217","218","219","220","221","222","223","224","225","226","227","228","229","230","231","232","233","234","301","302","303","304","305","306","307","308","309","310","311","312","313","314","315","316","317","318","319","320","321","322","323","324","325","326","327","328","329","330","331","332","333","334","401","402","403","404","405","406","407","408","409","410","411","412","413","414","415","416","417","418","419","420","421","422","423","424","425","426","427","428","429","430","431","432","433","434","501","502","503","504","505","506","507","508","509","510","511","512","513","514","515","516","517","518","519","520","521","522","523","524","525","526","527","528","529","530","531","532","533","534"],
    科技楼: ["201","202","203","204","205","206","207","208","209","210","211","212","213","214","215","216","217","218","219","301","302","303","304","305","306","307","308","309","310","311","312","313","314","315","316","317","318","319","320","401","402","403","404","405","406","407","408","409","410","411","412","413","414","415","416","417","418","419","420","421"]
  };
  function pickBy(row, aliases) {
    for (var k in row) {
      if (!Object.prototype.hasOwnProperty.call(row, k)) continue;
      var key = String(k).trim().toLowerCase();
      for (var a = 0; a < aliases.length; a++) if (key === String(aliases[a]).toLowerCase()) return row[k];
    }
    return undefined;
  }
  // 归一化区域名：只能为 男寝/女寝/科技楼 三者之一；无法识别返回 ''
  function normalizeArea(raw) {
    if (raw == null) return '';
    var s = String(raw).trim();
    if (s === '') return '';
    if (s.indexOf('男') !== -1) return '男寝';
    if (s.indexOf('女') !== -1) return '女寝';
    if (s.indexOf('科技楼') !== -1) return '科技楼';
    if (DORM_AREAS.indexOf(s) !== -1) return s;
    return '';
  }
  // 解析对照表行 → [{room, class, area}]；同一寝室号多行（多班级）保留多行，表示混寝
  function buildDormMapFromRows(rows) {
    var out = [];
    (rows || []).forEach(function (row) {
      var room = pickBy(row, ROOM_ALIAS);
      var cls = pickBy(row, HEADER_ALIAS['class']);
      if (room == null || String(room).trim() === '') return;
      var pc = parseClass(cls);
      out.push({
        room: String(room).trim(),
        class: pc ? pc.label : (cls != null ? String(cls).trim() : ''),
        area: normalizeArea(pickBy(row, HEADER_ALIAS['area']))
      });
    });
    return out;
  }
  // 以寝室号查对应班级列表（可能多个 → 混寝）；无匹配返回 []
  function findDormClasses(dormMap, room) {
    if (room == null) return [];
    var r = String(room).trim();
    var res = [];
    (dormMap || []).forEach(function (d) {
      if (String(d.room).trim() === r) res.push(d.class);
    });
    // 去重且保持顺序
    var seen = {};
    return res.filter(function (c) { if (seen[c]) return false; seen[c] = true; return true; });
  }
  // 以寝室号查正确班级（多条时取第一条，兼容旧逻辑）
  function findDormClass(dormMap, room) {
    var list = findDormClasses(dormMap, room);
    return list.length ? list[0] : null;
  }
  // 以寝室号+区域查班级：优先同区域记录；同名寝室号跨区域互不干扰。
  // 兼容旧数据：记录无 area（或 area 为空）时作为通用兜底（仅在无任何同区域记录时使用）。
  function findDormClassesInArea(dormMap, room, area) {
    if (room == null) return [];
    var r = String(room).trim();
    var areaMatch = [];
    var generic = [];
    (dormMap || []).forEach(function (d) {
      if (String(d.room).trim() !== r) return;
      if (area != null && d.area && String(d.area).trim() === String(area).trim()) {
        areaMatch.push(d.class);
      } else {
        generic.push(d.class);
      }
    });
    var pick = areaMatch.length ? areaMatch : generic;
    var seen = {};
    return pick.filter(function (c) { if (seen[c]) return false; seen[c] = true; return true; });
  }
  // 班级列表 → 展示文案：单个班级直接返回；多个班级标注“X班和Y班混寝”
  function dormClassDisplay(classes) {
    if (!classes || classes.length === 0) return '';
    if (classes.length === 1) return classes[0];
    return classes.join('和') + '混寝';
  }
  // 以寝室号查区域（取第一条匹配；无匹配返回 ''）
  function findDormArea(dormMap, room) {
    if (room == null) return '';
    var r = String(room).trim();
    for (var i = 0; i < (dormMap || []).length; i++) {
      if (String(dormMap[i].room).trim() === r && dormMap[i].area) return dormMap[i].area;
    }
    return '';
  }

  // ---- 量化分排序 ----
  // by: 'score' | 'class'；dir: 'asc' | 'desc'
  function sortByScore(list, dir, sm, months) {
    var d = dir === 'asc' ? 1 : -1;
    return (list || []).slice().sort(function (a, b) {
      var sa = (sm && months && months.length) ? computeQuantized(sm, a.id, months).score : a.score;
      var sb = (sm && months && months.length) ? computeQuantized(sm, b.id, months).score : b.score;
      if (sa !== sb) return (sa - sb) * d;
      // 同分按班级→姓名稳定排序
      var ga = gradeIndex(studentGrade(a.class)), gb = gradeIndex(studentGrade(b.class));
      if (ga !== gb) return ga - gb;
      var ca = studentClassNo(a.class) || 999, cb = studentClassNo(b.class) || 999;
      if (ca !== cb) return ca - cb;
      return String(a.name).localeCompare(String(b.name), 'zh');
    });
  }

  // 计算加/扣分后的分数
  function computeAfter(current, delta) {
    var c = (typeof current === 'number' && !isNaN(current)) ? current : 100;
    var d = Number(delta); if (isNaN(d)) d = 0;
    return c + d;
  }

  // ---- 违纪统计（与量化分完全独立）----
  function disciplineCountByStudent(logs) {
    var m = {};
    (logs || []).forEach(function (l) { m[l.studentId] = (m[l.studentId] || 0) + 1; });
    return m;
  }
  function studentDisciplineCount(logs, studentId) {
    return (logs || []).filter(function (l) { return l.studentId === studentId; }).length;
  }
  // 某学生所有违纪原因（去重，按记录顺序）
  function studentDisciplineReasons(logs, studentId) {
    var seen = {}; var arr = [];
    (logs || []).forEach(function (l) {
      if (l.studentId !== studentId) return;
      var r = l.reason || '';
      if (r && !seen[r]) { seen[r] = true; arr.push(r); }
    });
    return arr;
  }
  // 某班级所有违纪原因（去重，按记录顺序）
  function disciplineClassReasons(students, logs, cls) {
    var idToClass = {};
    (students || []).forEach(function (s) { idToClass[s.id] = s.class; });
    var seen = {}; var arr = [];
    (logs || []).forEach(function (l) {
      var c = idToClass[l.studentId] || '(未知班级)';
      if (c !== cls) return;
      var r = l.reason || '';
      if (r && !seen[r]) { seen[r] = true; arr.push(r); }
    });
    return arr;
  }
  // 按班级汇总违纪次数：[{class, count}]，按次数降序
  function disciplineClassSummary(students, logs) {
    var idToClass = {};
    (students || []).forEach(function (s) { idToClass[s.id] = s.class; });
    var m = {};
    (logs || []).forEach(function (l) {
      var cls = idToClass[l.studentId] || '(未知班级)';
      m[cls] = (m[cls] || 0) + 1;
    });
    return Object.keys(m).map(function (k) { return { class: k, count: m[k] }; })
      .sort(function (a, b) { return b.count - a.count; });
  }

  // ================= 请假名单整理器 =================
  var CLASS_TOKEN_RE = /高[一二三][0-9一二三四五六七八九十]+班/g;

  function splitNames(seg) {
    return String(seg).split(/[\s、，,和]+/).map(function (s) { return s.trim(); }).filter(Boolean);
  }
  // 把“寝室号+姓名”混排的一段拆成 [{room, names:[]}]
  function parseRoomsSegment(seg) {
    var res = [];
    var re = /(\d{2,4})/g;
    var idx = [];
    var m;
    while ((m = re.exec(seg))) { idx.push({ room: m[1], start: m.index, end: m.index + m[0].length }); }
    for (var i = 0; i < idx.length; i++) {
      var namePart = seg.slice(idx[i].end, (i + 1 < idx.length) ? idx[i + 1].start : seg.length);
      res.push({ room: idx[i].room, names: splitNames(namePart) });
    }
    return res;
  }

  // 解析请假原文 → { grades: {grade:{classNo:{rooms:{room:[names]}, order:[]}}}, unresolved:[] }
  function parseLeaveText(raw) {
    var grades = {};
    var unresolved = [];
    var lines = String(raw || '').split(/\r?\n/);
    lines.forEach(function (line) {
      var text = line.trim();
      if (!text) return;
      var tokens = [];
      var mm; CLASS_TOKEN_RE.lastIndex = 0;
      while ((mm = CLASS_TOKEN_RE.exec(text))) { tokens.push({ tok: mm[0], start: mm.index, end: mm.index + mm[0].length }); }
      if (tokens.length === 0) {
        // 含“寝室号+姓名”但没识别到班级 → 无法归类，交人工
        if (/\d{2,4}[\u4e00-\u9fa5]/.test(text)) unresolved.push(text);
        return;
      }
      for (var i = 0; i < tokens.length; i++) {
        var pc = parseClass(tokens[i].tok);
        if (!pc) continue;
        var segEnd = (i + 1 < tokens.length) ? tokens[i + 1].start : text.length;
        var rooms = parseRoomsSegment(text.slice(tokens[i].end, segEnd));
        if (rooms.length === 0) continue;
        if (!grades[pc.grade]) grades[pc.grade] = {};
        var g = grades[pc.grade];
        if (!g[pc.classNo]) g[pc.classNo] = { rooms: {}, order: [] };
        var cls = g[pc.classNo];
        rooms.forEach(function (r) {
          if (!cls.rooms[r.room]) { cls.rooms[r.room] = []; cls.order.push(r.room); }
          r.names.forEach(function (n) { if (cls.rooms[r.room].indexOf(n) === -1) cls.rooms[r.room].push(n); });
        });
      }
    });
    return { grades: grades, unresolved: unresolved };
  }

  // 整理成固定格式；返回 { text, unresolved, removedWalkers }
  // 可选第二参数 students：当提供时，请假名单中出现的“走读生”姓名会被直接去掉，并标注提醒
  function formatLeave(raw, students) {
    var parsed = parseLeaveText(raw);
    var walkers = {};
    var hasStudents = Array.isArray(students);
    if (hasStudents) {
      students.forEach(function (s) { if (s && s.boarding === '走读' && s.name) walkers[s.name] = true; });
    }
    var removedWalkers = [];
    var out = [];
    GRADES.forEach(function (grade) {
      var block = [grade + '请假名单'];
      var g = parsed.grades[grade];
      var classNos = g ? Object.keys(g).map(Number).sort(function (a, b) { return a - b; }) : [];
      if (classNos.length === 0) {
        block.push('（本次无' + grade + '请假数据）');
      } else {
        classNos.forEach(function (cn, idx) {
          if (idx > 0) block.push('');
          block.push(grade + cn + '班');
          var cls = g[cn];
          var rooms = cls.order.slice().sort(function (a, b) { return Number(a) - Number(b); });
          rooms.forEach(function (room) {
            // 去掉走读生姓名（仅当提供学生库时）
            var names = cls.rooms[room];
            if (hasStudents) {
              names = names.filter(function (n) {
                if (walkers[n]) { removedWalkers.push(n); return false; }
                return true;
              });
            }
            if (names.length) block.push('·' + room + ' ' + names.join(' '));
          });
        });
      }
      block.push('');
      block.push('请各班主任仔细核对，有问题及时沟通！！！');
      out.push(block.join('\n'));
    });
    // 去重提醒（同一姓名可能出现在多个房间）
    removedWalkers = removedWalkers.filter(function (v, i) { return removedWalkers.indexOf(v) === i; });
    return { text: out.join('\n\n'), unresolved: parsed.unresolved, removedWalkers: removedWalkers };
  }

  // ================= 每日查寝通报整理器 =================
  var AREAS = ['女寝', '男寝', '科技楼'];

  // 描述归类（关键词 → 标准表述），返回标准表述数组（按固定顺序）
  function classifyReportDesc(desc) {
    var d = String(desc || '');
    var cats = [];
    var isPlace = /摆放不整齐|摆放乱|未摆放整齐|没摆放|摆放不齐|摆放/.test(d);
    var isHang = /乱挂|挂有|床上有东西|胡乱放|乱放|毛巾/.test(d);
    var isClean = /垃圾|杂物|脏|不干净|没打扫|未打扫|打扫不干净/.test(d);
    var isDiscipline = /说话|喧哗|讲话|大声|吵闹|吵|喧闹|打闹|纪律/.test(d);
    if (isPlace) cats.push('物品摆放不整齐');
    if (isHang) cats.push('物品乱挂');
    if (isClean) cats.push('卫生未打扫干净');
    if (isDiscipline) {
      var t = d.match(/(\d{1,2})[:：](\d{2})/);
      cats.push('熄灯后 多次提醒 仍大声喧哗影响他人休息' + (t ? ('（' + t[1] + ':' + t[2] + '）') : ''));
    }
    return cats;
  }

  // 拆“3位寝室号+描述”段 → [{room, desc}]（3 位数避免把时间 23:10 误当寝室号）
  function parseRoomsDesc(seg) {
    var res = [];
    var re = /(\d{3})/g;
    var idx = [];
    var m;
    while ((m = re.exec(seg))) { idx.push({ room: m[1], start: m.index, end: m.index + m[0].length }); }
    for (var i = 0; i < idx.length; i++) {
      var desc = seg.slice(idx[i].end, (i + 1 < idx.length) ? idx[i + 1].start : seg.length);
      res.push({ room: idx[i].room, desc: desc.replace(/^[\s，,、。：:]+|[\s，,、。：:]+$/g, '') });
    }
    return res;
  }

  function parseReportText(raw) {
    var praise = [];
    var report = [];
    var unresolved = [];
    var lines = String(raw || '').split(/\r?\n/);
    var area = '女寝';
    var cat = '表扬';
    lines.forEach(function (line) {
      var text = line.trim();
      if (!text) return;
      // 更新区域
      if (text.indexOf('科技楼') !== -1) area = '科技楼';
      else if (text.indexOf('男寝') !== -1) area = '男寝';
      else if (text.indexOf('女寝') !== -1) area = '女寝';
      // 更新类别
      if (text.indexOf('表扬') !== -1) cat = '表扬';
      if (text.indexOf('通报') !== -1) cat = '通报';
      // 数据行？
      var tokens = []; var mm; CLASS_TOKEN_RE.lastIndex = 0;
      while ((mm = CLASS_TOKEN_RE.exec(text))) { tokens.push({ tok: mm[0], start: mm.index, end: mm.index + mm[0].length }); }
      if (tokens.length === 0) return; // 纯表头/区域行
      for (var i = 0; i < tokens.length; i++) {
        var pc = parseClass(tokens[i].tok);
        if (!pc) continue;
        var segEnd = (i + 1 < tokens.length) ? tokens[i + 1].start : text.length;
        var seg = text.slice(tokens[i].end, segEnd);
        var rooms = parseRoomsDesc(seg);
        if (rooms.length === 0) continue;
        rooms.forEach(function (r) {
          var base = { area: area, classLabel: pc.label, grade: pc.grade, classNo: pc.classNo, room: r.room };
          if (cat === '表扬') {
            praise.push(base);
          } else {
            var cats = classifyReportDesc(r.desc);
            var e = Object.assign({}, base, { cats: cats, rawDesc: r.desc });
            report.push(e);
            if (cats.length === 0 && r.desc) unresolved.push(pc.label + '（' + r.room + '）：' + r.desc);
          }
        });
      }
    });
    return { praise: praise, report: report, unresolved: unresolved };
  }

  function verifyClass(entry, dormMap, issues) {
    if (!dormMap || !dormMap.length) return entry.classLabel;
    // 按通报区域核对：同名寝室号在男寝/女寝/科技楼各自独立，不合并为混寝
    var classes = findDormClassesInArea(dormMap, entry.room, entry.area);
    if (classes.length === 0) return entry.classLabel;
    // 混寝：同一寝室号对应多个班级
    if (classes.length > 1) {
      // 原始班级在对照表内 → 不更正，仅提示该寝室为混寝
      if (classes.indexOf(entry.classLabel) !== -1) {
        return entry.classLabel;
      }
      var disp = dormClassDisplay(classes);
      issues.push('原始『' + entry.classLabel + ' ' + entry.room + '』与对照表不符，' + entry.room + ' 实际为 ' + disp + '，已自动更正为 ' + disp);
      return disp;
    }
    // 单个班级
    var correct = classes[0];
    if (correct !== entry.classLabel) {
      issues.push('原始『' + entry.classLabel + ' ' + entry.room + '』与对照表不符，' + entry.room + ' 实际属 ' + correct + '，已自动更正为 ' + correct);
      return correct;
    }
    return entry.classLabel;
  }

  // 日期标签：几月几号（如 8月11日），不显示年份与时间
  function monthDayLabel(d) {
    d = d || new Date();
    return (d.getMonth() + 1) + '月' + d.getDate() + '日';
  }

  function formatReport(raw, dormMap, dateLabel) {
    var parsed = parseReportText(raw);
    var mismatchIssues = [];
    var titleLabel = (typeof dateLabel === 'string' && dateLabel) ? dateLabel : monthDayLabel();

    // 核对（以寝室号为准）并回填正确班级
    function fix(entry) {
      var label = verifyClass(entry, dormMap, mismatchIssues);
      if (label !== entry.classLabel) {
        var pc = parseClass(label);
        entry.classLabel = label;
        if (pc) { entry.grade = pc.grade; entry.classNo = pc.classNo; }
      }
      return entry;
    }
    parsed.praise.forEach(fix);
    parsed.report.forEach(fix);

    function cmp(a, b) {
      if (a.area !== b.area) return AREAS.indexOf(a.area) - AREAS.indexOf(b.area);
      var ga = gradeIndex(a.grade), gb = gradeIndex(b.grade);
      if (ga !== gb) return ga - gb;
      if (a.classNo !== b.classNo) return a.classNo - b.classNo;
      return Number(a.room) - Number(b.room);
    }

    var lines = [titleLabel + '查寝通报', ''];

    // 表扬
    lines.push('表现好的班级宿舍有：');
    AREAS.forEach(function (ar) {
      lines.push(ar);
      var inArea = parsed.praise.filter(function (e) { return e.area === ar; });
      if (inArea.length === 0) { lines.push('（本区域本次无表扬宿舍）'); return; }
      // 按班级分组合并寝室
      var groups = {};
      var order = [];
      inArea.forEach(function (e) {
        if (!groups[e.classLabel]) { groups[e.classLabel] = { label: e.classLabel, grade: e.grade, classNo: e.classNo, rooms: [] }; order.push(e.classLabel); }
        if (groups[e.classLabel].rooms.indexOf(e.room) === -1) groups[e.classLabel].rooms.push(e.room);
      });
      order.map(function (k) { return groups[k]; }).sort(function (a, b) {
        var ga = gradeIndex(a.grade), gb = gradeIndex(b.grade); if (ga !== gb) return ga - gb; return a.classNo - b.classNo;
      }).forEach(function (g) {
        var rooms = g.rooms.slice().sort(function (a, b) { return Number(a) - Number(b); });
        lines.push(g.label + '（' + rooms.join('、') + '）宿舍 就寝秩序好 卫生干净整洁');
      });
    });

    lines.push('');
    // 通报
    lines.push('通报：');
    AREAS.forEach(function (ar) {
      lines.push(ar);
      var inArea = parsed.report.filter(function (e) { return e.area === ar; }).sort(cmp);
      if (inArea.length === 0) { lines.push('（本区域本次无通报）'); return; }
      inArea.forEach(function (e) {
        var desc = e.cats.length ? e.cats.join('，') : e.rawDesc;
        lines.push(e.classLabel + '（' + e.room + '）宿舍 ' + desc);
      });
    });

    var issues = mismatchIssues.concat(parsed.unresolved.length ? ['未能自动归类（请人工确认）：'].concat(parsed.unresolved) : []);
    return { text: lines.join('\n'), issues: issues, mismatchIssues: mismatchIssues, unresolved: parsed.unresolved };
  }

  // ================= 首页摘要 =================
  function computeHomeSummary(state, today) {
    state = state || {};
    today = today || todayStr();
    var students = state.students || [];
    var scoreLogs = state.scoreLogs || [];
    var disciplineLogs = state.disciplineLogs || [];
    var leaveRecords = state.leaveRecords || [];
    var dormReports = state.dormReports || [];

    var addSum = 0, subSum = 0, cnt = 0;
    scoreLogs.forEach(function (l) {
      if (l.date !== today) return;
      cnt++;
      // 按类别区分：班奖/政奖计入加分，班扣/政扣计入扣分（扣分为负数）
      // 兼容旧记录（无cat字段时按delta正负区分）
      if (l.cat === 'banJiang' || l.cat === 'zhengJiang') {
        addSum += Math.abs(Number(l.delta) || 0);
      } else if (l.cat === 'banKou' || l.cat === 'zhengKou') {
        subSum -= Math.abs(Number(l.delta) || 0);
      } else {
        if (l.delta >= 0) addSum += l.delta; else subSum += l.delta;
      }
    });

    var todayDiscipline = disciplineLogs.filter(function (l) { return l.date === today; }).length;

    var leaveCount = 0, leaveDate = null;
    if (leaveRecords.length) {
      var latest = leaveRecords.slice().sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); })[0];
      leaveCount = latest.count || 0; leaveDate = latest.date;
    }

    var sm = state.scoreMonthly || [];
    var months = activeScoreMonths(state.settings);
    var warnings = [];
    students.forEach(function (s) {
      var q = months.length ? computeQuantized(sm, s.id, months) : { score: s.score };
      if (typeof q.score === 'number' && q.score < 60) {
        warnings.push({ id: s.id, class: s.class, name: s.name, score: q.score });
      }
    });
    warnings.sort(function (a, b) { return a.score - b.score; });

    // 各年级人数（高一/高二/高三）
    var gradeCount = { '高一': 0, '高二': 0, '高三': 0 };
    students.forEach(function (s) {
      var g = studentGrade(s.class);
      if (gradeCount[g] != null) gradeCount[g] += 1;
    });

    // 请假折线数据：按日期汇总每日请假总数（升序），供首页折线图使用
    var leaveTrend = [];
    var leaveByDate = {};
    leaveRecords.forEach(function (r) {
      var d = String(r.date);
      var c = Number(r.count) || 0;
      leaveByDate[d] = (leaveByDate[d] || 0) + c;
    });
    Object.keys(leaveByDate).sort(function (a, b) { return String(a).localeCompare(String(b)); })
      .forEach(function (d) { leaveTrend.push({ date: d, count: leaveByDate[d] }); });
    leaveTrend = leaveTrend.slice(-14); // 只保留最近 14 天，折线图不至于过宽

    var recent = [];
    leaveRecords.forEach(function (r) { recent.push({ type: '请假名单', module: 'leave', date: r.date, id: r.id }); });
    dormReports.forEach(function (r) { recent.push({ type: '查寝通报', module: 'report', date: r.date, id: r.id }); });
    recent.sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
    recent = recent.slice(0, 8);

    return {
      studentCount: students.length,
      gradeCount: gradeCount,
      todayScore: { add: addSum, sub: subSum, count: cnt },
      todayDiscipline: todayDiscipline,
      leaveCount: leaveCount, leaveDate: leaveDate,
      leaveTrend: leaveTrend,
      warnings: warnings,
      recent: recent
    };
  }

  // ================= 量化管理分（五个月八列） =================
  var SCORE_CATS = ['banKou', 'banJiang', 'zhengKou', 'zhengJiang'];
  var SCORE_CAT_LABELS = { banKou: '班扣', banJiang: '班奖', zhengKou: '政扣', zhengJiang: '政奖' };

  // 取最近 N 个月（含当月），返回 ['YYYY-MM', ...] 升序
  function recentMonths(n, from) {
    var d = from || new Date();
    var out = [];
    for (var i = n - 1; i >= 0; i--) {
      var dt = new Date(d.getFullYear(), d.getMonth() - i, 1);
      out.push(dt.getFullYear() + '-' + pad2(dt.getMonth() + 1));
    }
    return out;
  }

  // 生效的统计月份窗口：用户手动自定义的月份优先（含显式清空 []）；未自定义（null）时回退到最近 5 个月
  function activeScoreMonths(settings, n, from) {
    var sm = settings && settings.scoreMonths;
    if (Array.isArray(sm)) return sm.slice();   // 用户已自定义（可能是空数组）
    return recentMonths(n || 5, from);
  }

  // 取某学生某月数据（无则返回全 0 占位）
  function monthScore(scoreMonthly, studentId, month) {
    var m = (scoreMonthly || []).filter(function (x) { return x.studentId === studentId && x.month === month; })[0];
    return m || { banKou: 0, banJiang: 0, zhengKou: 0, zhengJiang: 0 };
  }

  // 计算某学生在指定月份集合内的量化分：100 - 班扣 + 班奖 - 政扣 + 政奖
  // 违纪扣分按次数独立计算并写入当月政扣（每次 -20），量化分从政扣中体现
  function computeQuantized(scoreMonthly, studentId, months) {
    var sum = { banKou: 0, banJiang: 0, zhengKou: 0, zhengJiang: 0 };
    (months || []).forEach(function (m) {
      var ms = monthScore(scoreMonthly, studentId, m);
      sum.banKou += ms.banKou || 0;
      sum.banJiang += ms.banJiang || 0;
      sum.zhengKou += ms.zhengKou || 0;
      sum.zhengJiang += ms.zhengJiang || 0;
    });
    return {
      banKou: sum.banKou, banJiang: sum.banJiang, zhengKou: sum.zhengKou, zhengJiang: sum.zhengJiang,
      score: 100 - sum.banKou + sum.banJiang - sum.zhengKou + sum.zhengJiang
    };
  }

  // 生成/更新某学生某月的四类记录（scoreMonthly 增删改）
  // mode: 'add' 累加（记流水用）；'set' 直接设值（单元格编辑用），默认 'set'
  function setMonthScore(scoreMonthly, studentId, month, data, mode) {
    var isAdd = mode === 'add';
    var m = (scoreMonthly || []).filter(function (x) { return x.studentId === studentId && x.month === month; })[0];
    if (m) {
      ['banKou', 'banJiang', 'zhengKou', 'zhengJiang'].forEach(function (k) {
        if (data[k] != null) {
          m[k] = isAdd ? ((Number(m[k]) || 0) + (Number(data[k]) || 0)) : (Number(data[k]) || 0);
        }
      });
      return m;
    }
    var rec = { id: uid('m'), studentId: studentId, month: month, banKou: 0, banJiang: 0, zhengKou: 0, zhengJiang: 0 };
    ['banKou', 'banJiang', 'zhengKou', 'zhengJiang'].forEach(function (k) {
      if (data[k] != null) rec[k] = Number(data[k]) || 0;
    });
    scoreMonthly.push(rec);
    return rec;
  }

  // 某学生所有月份量化分累计汇总（班扣/班奖/政扣/政奖 累加 + 总分）
  function studentScoreTotals(scoreMonthly, studentId) {
    var sum = { banKou: 0, banJiang: 0, zhengKou: 0, zhengJiang: 0 };
    (scoreMonthly || []).forEach(function (x) {
      if (!x || x.studentId !== studentId) return;
      sum.banKou += Number(x.banKou) || 0;
      sum.banJiang += Number(x.banJiang) || 0;
      sum.zhengKou += Number(x.zhengKou) || 0;
      sum.zhengJiang += Number(x.zhengJiang) || 0;
    });
    return {
      banKou: sum.banKou, banJiang: sum.banJiang, zhengKou: sum.zhengKou, zhengJiang: sum.zhengJiang,
      score: 100 - sum.banKou + sum.banJiang - sum.zhengKou + sum.zhengJiang
    };
  }

  return {
    NAV_ITEMS: NAV_ITEMS,
    GRADES: GRADES,
    todayStr: todayStr,
    monthDayLabel: monthDayLabel,
    shouldRemindBackup: shouldRemindBackup,
    uid: uid,
    cnToNum: cnToNum,
    parseClass: parseClass,
    gradeIndex: gradeIndex,
    parseCSVRows: parseCSVRows,
    parseCSV: parseCSV,
    normalizeStudentRow: normalizeStudentRow,
    buildStudents: buildStudents,
    scoreClass: scoreClass,
    studentGrade: studentGrade,
    studentClassNo: studentClassNo,
    filterStudents: filterStudents,
    sortStudentsByClass: sortStudentsByClass,
    buildDormMapFromRows: buildDormMapFromRows,
    findDormClass: findDormClass,
    findDormClasses: findDormClasses,
    findDormClassesInArea: findDormClassesInArea,
    findDormArea: findDormArea,
    dormClassDisplay: dormClassDisplay,
    normalizeArea: normalizeArea,
    DORM_AREAS: DORM_AREAS,
    DORM_ROOMS: DORM_ROOMS,
    DORM_CAPACITY: DORM_CAPACITY,
    DORM_BIG_CAPACITY: DORM_BIG_CAPACITY,
    DORM_BIG_ROOMS: DORM_BIG_ROOMS,
    dormCapacity: dormCapacity,
    sortByScore: sortByScore,
    computeAfter: computeAfter,
    disciplineCountByStudent: disciplineCountByStudent,
    studentDisciplineCount: studentDisciplineCount,
    studentDisciplineReasons: studentDisciplineReasons,
    disciplineClassReasons: disciplineClassReasons,
    disciplineClassSummary: disciplineClassSummary,
    parseLeaveText: parseLeaveText,
    formatLeave: formatLeave,
    classifyReportDesc: classifyReportDesc,
    parseReportText: parseReportText,
    formatReport: formatReport,
    computeHomeSummary: computeHomeSummary,
    normalizeBoarding: normalizeBoarding,
    SCORE_CATS: SCORE_CATS,
    SCORE_CAT_LABELS: SCORE_CAT_LABELS,
    recentMonths: recentMonths,
    activeScoreMonths: activeScoreMonths,
    monthScore: monthScore,
    computeQuantized: computeQuantized,
    setMonthScore: setMonthScore,
    studentScoreTotals: studentScoreTotals
  };
});
