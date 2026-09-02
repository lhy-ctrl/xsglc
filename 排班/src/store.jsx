// 全局状态管理：人员数据 + 真实排班算法
const { useState, useEffect, useCallback, useRef, createContext, useContext } = React;

// ===== 角色定义 =====
const ROLE_LABELS = {
  captain: '队长',
  vice_captain: '副队长',
  leader_a: 'A组组长',
  leader_b: 'B组组长',
  member: '普通成员',
};

// ===== 默认人员（12人，男7女5，A/B组各6人）=====
const defaultStaff = [
  { id: 1,  name: '张伟',   gender: 'male',   group: 'A', role: 'captain'     },
  { id: 2,  name: '王芳',   gender: 'female', group: 'A', role: 'vice_captain'},
  { id: 3,  name: '李强',   gender: 'male',   group: 'A', role: 'leader_a'    },
  { id: 4,  name: '刘洋',   gender: 'male',   group: 'A', role: 'member'      },
  { id: 5,  name: '陈静',   gender: 'female', group: 'A', role: 'member'      },
  { id: 6,  name: '杨帆',   gender: 'male',   group: 'A', role: 'member'      },
  { id: 13, name: '黄磊',   gender: 'male',   group: 'A', role: 'member'      },
  { id: 14, name: '周敏',   gender: 'male',   group: 'A', role: 'member'      },
  { id: 7,  name: '赵磊',   gender: 'male',   group: 'B', role: 'leader_b'    },
  { id: 8,  name: '孙丽',   gender: 'female', group: 'B', role: 'member'      },
  { id: 9,  name: '周杰',   gender: 'male',   group: 'B', role: 'member'      },
  { id: 10, name: '吴敏',   gender: 'female', group: 'B', role: 'member'      },
  { id: 11, name: '郑浩',   gender: 'male',   group: 'B', role: 'member'      },
  { id: 12, name: '林婷',   gender: 'female', group: 'B', role: 'member'      },
];

// ===== 岗位定义 =====
// 岗位只保留：大门口、寝室（男寝女寝合并）、操场、餐厅、餐厅口、办公室、科技楼
const MAIN_POSTS = [
  { key: 'gate',       label: '大门口',  gender: 'male' },
  { key: 'dorm',       label: '寝室',    gender: 'any'  },
  { key: 'playground', label: '操场',    gender: 'male' },
  { key: 'office',     label: '办公室',  gender: 'any'  },
  { key: 'tech',       label: '科技楼',  gender: 'male' },
];

const SUB_POSITIONS = [
  { key: 'canteen',     label: '餐厅',    gender: 'any', type: 'canteen' },
  { key: 'canteenGate', label: '餐厅口',  gender: 'any', type: 'single'  },
];

// 岗位顺序（用户指定）：大门口、寝室、操场、餐厅、餐厅口、办公室、科技楼
// 每个人独立维护岗位指针，按此顺序轮换，遇到不符合性别的岗位跳过
const POST_ORDER = [
  { key: 'gate',        label: '大门口',  gender: 'male',   type: 'main', capacity: 1 },
  { key: 'dorm',        label: '寝室',    gender: 'any',    type: 'main', capacity: 1 },
  { key: 'playground',  label: '操场',    gender: 'male',   type: 'main', capacity: 1 },
  { key: 'canteen',     label: '餐厅',    gender: 'any',    type: 'sub',  capacity: 2 }, // 餐厅默认2人值班
  { key: 'canteenGate', label: '餐厅口',  gender: 'any',    type: 'sub',  capacity: 1 },
  { key: 'office',      label: '办公室',  gender: 'any',    type: 'main', capacity: 0 }, // 办公室默认"无"
  { key: 'tech',        label: '科技楼',  gender: 'male',   type: 'main', capacity: 1 },
];

const StoreContext = createContext(null);

function loadState(key, fallback) {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch { return fallback; }
}
function saveState(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

// 全局store字段与localStorage key的映射
const DUTY_FIELD_MAP = {
  dutyStaff: 'duty_staff',
  dutyAllPostPointers: 'duty_all_post_pointers',
  dutyGroupPostPointers: 'duty_group_post_pointers',
  dutyGroupRotation: 'duty_group_rotation',
  dutyGatePointer: 'duty_gate_pointer',
  dutyAfterSchoolPointer: 'duty_afterschool_pointer',
  dutyScheduleHistory: 'duty_schedule_history'
};

// 从全局store读取，不存在则用localStorage后备
function readDutyState(field, fallback) {
  try {
    if (typeof window !== 'undefined' && window.appStore) {
      const st = window.appStore.getState();
      if (st[field] !== undefined && st[field] !== null) return st[field];
    }
  } catch {}
  const key = DUTY_FIELD_MAP[field];
  if (key) return loadState(key, fallback);
  return fallback;
}

// 写入全局store，同时写localStorage作为后备
function writeDutyState(field, value) {
  try {
    if (typeof window !== 'undefined' && typeof window.onDutyDataChange === 'function') {
      window.onDutyDataChange(field, value);
      return;
    }
    if (typeof window !== 'undefined' && window.appStore) {
      const st = window.appStore.getState();
      st[field] = value;
      window.appStore.save();
    }
  } catch {}
  const key = DUTY_FIELD_MAP[field];
  if (key) saveState(key, value);
}

function getDateStr(dayOffset) {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}
function getFullDateStr(dayOffset) {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}
function getWeekStr(dayOffset) {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  return ['周日','周一','周二','周三','周四','周五','周六'][d.getDay()];
}

function StoreProvider({ children }) {
  const isCloudRefresh = useRef(false);

  const [staff, setStaff] = useState(() => {
    return readDutyState('dutyStaff', defaultStaff);
  });
  useEffect(() => {
    if (isCloudRefresh.current) return;
    writeDutyState('dutyStaff', staff);
  }, [staff]);

  // 全员模式：每人独立岗位指针 { personId: postIndex }
  const [allPostPointers, setAllPostPointers] = useState(() => {
    return readDutyState('dutyAllPostPointers', {});
  });
  useEffect(() => {
    if (isCloudRefresh.current) return;
    writeDutyState('dutyAllPostPointers', allPostPointers);
  }, [allPostPointers]);

  // 分组模式：每人独立岗位指针 { personId: postIndex }
  const [groupPostPointers, setGroupPostPointers] = useState(() => {
    return readDutyState('dutyGroupPostPointers', {});
  });
  useEffect(() => {
    if (isCloudRefresh.current) return;
    writeDutyState('dutyGroupPostPointers', groupPostPointers);
  }, [groupPostPointers]);

  // 分组模式主副班轮换：0=A主B副，1=B主A副，每次生成后翻转
  const [groupRotation, setGroupRotation] = useState(() => {
    return readDutyState('dutyGroupRotation', 0);
  });
  useEffect(() => {
    if (isCloudRefresh.current) return;
    writeDutyState('dutyGroupRotation', groupRotation);
  }, [groupRotation]);

  const [gatePointer, setGatePointer] = useState(() => {
    return readDutyState('dutyGatePointer', 0);
  });
  useEffect(() => {
    if (isCloudRefresh.current) return;
    writeDutyState('dutyGatePointer', gatePointer);
  }, [gatePointer]);

  const [afterSchoolPointer, setAfterSchoolPointer] = useState(() => {
    return readDutyState('dutyAfterSchoolPointer', 0);
  });
  useEffect(() => {
    if (isCloudRefresh.current) return;
    writeDutyState('dutyAfterSchoolPointer', afterSchoolPointer);
  }, [afterSchoolPointer]);

  const [scheduleHistory, setScheduleHistory] = useState(() => {
    return readDutyState('dutyScheduleHistory', []);
  });
  useEffect(() => {
    if (isCloudRefresh.current) return;
    writeDutyState('dutyScheduleHistory', scheduleHistory);
  }, [scheduleHistory]);

  // 监听云端数据更新，静默刷新所有状态（仅在数据真的变化时更新，避免打断用户输入）
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.onDutyDataUpdated = function() {
      try {
        // 如果用户正在输入（input/textarea获得焦点），跳过staff更新，避免打断输入
        var activeEl = typeof document !== 'undefined' ? document.activeElement : null;
        var isInputting = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');
        
        var newStaff = readDutyState('dutyStaff', defaultStaff);
        var newAll = readDutyState('dutyAllPostPointers', {});
        var newGroup = readDutyState('dutyGroupPostPointers', {});
        var newRot = readDutyState('dutyGroupRotation', 0);
        var newGate = readDutyState('dutyGatePointer', 0);
        var newAfter = readDutyState('dutyAfterSchoolPointer', 0);
        var newHist = readDutyState('dutyScheduleHistory', []);
        
        // 非输入状态下才更新staff
        if (!isInputting && JSON.stringify(newStaff) !== JSON.stringify(staff)) {
          isCloudRefresh.current = true;
          setStaff(newStaff);
        }
        if (JSON.stringify(newAll) !== JSON.stringify(allPostPointers)) {
          isCloudRefresh.current = true;
          setAllPostPointers(newAll);
        }
        if (JSON.stringify(newGroup) !== JSON.stringify(groupPostPointers)) {
          isCloudRefresh.current = true;
          setGroupPostPointers(newGroup);
        }
        if (newRot !== groupRotation) {
          isCloudRefresh.current = true;
          setGroupRotation(newRot);
        }
        if (newGate !== gatePointer) {
          isCloudRefresh.current = true;
          setGatePointer(newGate);
        }
        if (newAfter !== afterSchoolPointer) {
          isCloudRefresh.current = true;
          setAfterSchoolPointer(newAfter);
        }
        if (JSON.stringify(newHist) !== JSON.stringify(scheduleHistory)) {
          isCloudRefresh.current = true;
          setScheduleHistory(newHist);
        }
        setTimeout(() => { isCloudRefresh.current = false; }, 100);
      } catch (e) {}
    };
    return () => { window.onDutyDataUpdated = null; };
  }, []);

  const addStaff = useCallback((person) => {
    setStaff(prev => {
      const maxId = prev.reduce((m, p) => Math.max(m, p.id), 0);
      const next = [...prev, { role: 'member', ...person, id: maxId + 1 }];
      writeDutyState('dutyStaff', next);
      return next;
    });
  }, []);

  const updateStaff = useCallback((id, patch) => {
    setStaff(prev => {
      const next = prev.map(p => p.id === id ? { ...p, ...patch } : p);
      writeDutyState('dutyStaff', next);
      return next;
    });
  }, []);

  const deleteStaff = useCallback((id) => {
    setStaff(prev => {
      const next = prev.filter(p => p.id !== id);
      writeDutyState('dutyStaff', next);
      return next;
    });
  }, []);

  const resetStaff = useCallback(() => {
    setStaff(defaultStaff);
    writeDutyState('dutyStaff', defaultStaff);
  }, []);

  const genderMatch = (person, post) => {
    if (post.gender === 'any') return true;
    return person.gender === post.gender;
  };

  // 按岗位顺序轮换：按岗位依次填充，候选按指针升序保证轮换公平
  // 特殊优先级：寝室优先安排女生、餐厅优先安排男生
  // filterType: 'all'=全员模式, 'main'=分组主班, 'sub'=分组副班
  function scheduleByPostRotation(people, pointers, filterType) {
    const posts = POST_ORDER.filter(p => p.capacity > 0 && (filterType === 'all' || p.type === filterType));
    const assignments = {};
    posts.forEach(p => { assignments[p.key] = []; });
    const used = new Set();
    const newPointers = { ...pointers };

    const nextPostIdx = (person, curIdx) => {
      let nextIdx = (curIdx + 1) % POST_ORDER.length;
      while (nextIdx !== curIdx) {
        const np = POST_ORDER[nextIdx];
        if (np.capacity > 0 &&
            (filterType === 'all' || np.type === filterType) &&
            (np.gender === 'any' || person.gender === np.gender)) break;
        nextIdx = (nextIdx + 1) % POST_ORDER.length;
      }
      return nextIdx;
    };

    posts.forEach(post => {
      // 候选：未分配 + 性别符合，按指针升序（保证轮换公平）
      let candidates = people.filter(p => !used.has(p.id) && genderMatch(p, post));
      candidates.sort((a, b) => (pointers[a.id] || 0) - (pointers[b.id] || 0));
      // 性别优先级：寝室优先女生、餐厅优先男生（其余按指针轮换）
      if (post.key === 'dorm') {
        candidates.sort((a, b) => (a.gender === 'female' ? 0 : 1) - (b.gender === 'female' ? 0 : 1));
      } else if (post.key === 'canteen') {
        candidates.sort((a, b) => (a.gender === 'male' ? 0 : 1) - (b.gender === 'male' ? 0 : 1));
      }
      const need = post.capacity;
      for (let i = 0; i < candidates.length && assignments[post.key].length < need; i++) {
        const person = candidates[i];
        assignments[post.key].push(person);
        used.add(person.id);
        const curIdx = POST_ORDER.indexOf(post);
        newPointers[person.id] = nextPostIdx(person, curIdx);
      }
    });

    return { assignments, newPointers };
  }

  // 将 assignments 转换为 mainDuty/subDuty 格式
  function buildDutyFromAssignments(assignments) {
    const mainDuty = POST_ORDER.filter(p => p.type === 'main').map(p => ({
      ...p,
      // 办公室默认"无"，不自动分配
      person: p.capacity === 0 ? { name: '无' } : (assignments[p.key]?.[0] || { name: '待分配' }),
    }));
    const subDuty = {
      canteenGate: assignments.canteenGate?.[0] || { name: '待分配' },
      canteen: assignments.canteen || [],
    };
    return { mainDuty, subDuty };
  }

  // 根据岗位→人员映射，计算每个人的下一个可值岗位指针（用于自定义基准轮换）
  function computeNextPointers(assignments, people, filterType) {
    const pointers = {};
    people.forEach(person => {
      let currentIdx = -1;
      for (let i = 0; i < POST_ORDER.length; i++) {
        const post = POST_ORDER[i];
        if (post.capacity === 0) continue;
        if (filterType !== 'all' && post.type !== filterType) continue;
        const assigned = assignments[post.key] || [];
        if (assigned.some(p => p.id === person.id)) { currentIdx = i; break; }
      }
      if (currentIdx === -1) { pointers[person.id] = 0; return; }
      let nextIdx = (currentIdx + 1) % POST_ORDER.length;
      while (nextIdx !== currentIdx) {
        const np = POST_ORDER[nextIdx];
        if (np.capacity > 0 &&
            (filterType === 'all' || np.type === filterType) &&
            (np.gender === 'any' || person.gender === np.gender)) break;
        nextIdx = (nextIdx + 1) % POST_ORDER.length;
      }
      pointers[person.id] = nextIdx;
    });
    return pointers;
  }

  const generateSchedule = useCallback((mode = 'all', dayOffset = 1, baseAssignments = null) => {
    const dateStr = getDateStr(dayOffset);
    const fullDateStr = getFullDateStr(dayOffset);
    const weekStr = getWeekStr(dayOffset);

    const activeStaff = staff.filter(p => p.role !== 'captain' && p.role !== 'vice_captain');
    let mainDuty, subDuty, mainGroup, subGroup, finalAssignments;

    if (mode === 'all') {
      let pointers = allPostPointers;
      if (baseAssignments) {
        pointers = computeNextPointers(baseAssignments, activeStaff, 'all');
      }
      const result = scheduleByPostRotation(activeStaff, pointers, 'all');
      finalAssignments = result.assignments;
      const duty = buildDutyFromAssignments(result.assignments);
      mainDuty = duty.mainDuty;
      subDuty = duty.subDuty;
      setAllPostPointers(result.newPointers);
    } else {
      const isAMain = (groupRotation === 0);
      mainGroup = isAMain ? 'A' : 'B';
      subGroup  = isAMain ? 'B' : 'A';
      const mainPeople = activeStaff.filter(p => p.group === mainGroup);
      const subPeople  = activeStaff.filter(p => p.group === subGroup);

      let mainPointers = groupPostPointers;
      let subPointers = groupPostPointers;
      if (baseAssignments) {
        mainPointers = computeNextPointers(baseAssignments, mainPeople, 'main');
        subPointers = computeNextPointers(baseAssignments, subPeople, 'sub');
      }

      const mainResult = scheduleByPostRotation(mainPeople, mainPointers, 'main');
      const subResult  = scheduleByPostRotation(subPeople, subPointers, 'sub');

      const mergedPointers = { ...groupPostPointers, ...mainResult.newPointers, ...subResult.newPointers };
      setGroupPostPointers(mergedPointers);
      setGroupRotation(groupRotation === 0 ? 1 : 0);

      const merged = { ...mainResult.assignments };
      Object.keys(subResult.assignments).forEach(k => {
        if (subResult.assignments[k].length > 0) merged[k] = subResult.assignments[k];
      });
      finalAssignments = merged;
      const duty = buildDutyFromAssignments(merged);
      mainDuty = duty.mainDuty;
      subDuty = duty.subDuty;
    }

    return {
      dateStr, fullDateStr, weekStr,
      mode, mainGroup, subGroup,
      mainDuty, subDuty, assignments: finalAssignments,
    };
  }, [staff, allPostPointers, groupPostPointers, groupRotation]);

  const generateGateDuty = useCallback((startTime, endTime, shifts, dayOffset = 1) => {
    const allMales = staff.filter(p => p.gender === 'male');
    const normalMales = allMales.filter(p => p.role !== 'captain' && p.role !== 'vice_captain');
    const captain = allMales.find(p => p.role === 'captain');
    const viceCaptain = allMales.find(p => p.role === 'vice_captain');
    const aGroupLeader = allMales.find(p => p.group === 'A' && p.role === 'leader_a');

    const needed = shifts * 2;
    // 轮换池排除A组组长（固定在第一班）
    let pool = normalMales.filter(p => p.id !== aGroupLeader?.id);
    let usedCaptains = [];

    const poolNeeded = needed - (aGroupLeader ? 1 : 0);
    if (pool.length < poolNeeded) {
      if (viceCaptain && viceCaptain.id !== aGroupLeader?.id) { pool.push(viceCaptain); usedCaptains.push(viceCaptain); }
    }
    if (pool.length < poolNeeded) {
      if (captain && captain.id !== aGroupLeader?.id) { pool.push(captain); usedCaptains.push(captain); }
    }
    while (pool.length < poolNeeded && pool.length > 0) {
      pool = pool.concat(pool);
    }
    if (pool.length === 0) {
      pool = [{ name: '待分配', gender: 'male' }];
    }

    // 按指针顺序选取轮换人员（除A组组长外）
    const rotated = [];
    for (let i = 0; i < poolNeeded; i++) {
      rotated.push(pool[(gatePointer + i) % pool.length]);
    }

    // 组装：第1位固定A组组长，其余按轮换顺序排列
    const selected = [];
    if (aGroupLeader) {
      selected.push(aGroupLeader);
      selected.push(...rotated);
    } else {
      selected.push(...rotated);
    }

    // 每次生成整体顺延1人轮换
    const nextPointer = (gatePointer + 1) % pool.length;

    const slots = [];
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    const totalMin = (endH * 60 + endM) - (startH * 60 + startM);
    const slotMin = Math.floor(totalMin / shifts);
    const fmt = (m) => {
      const h = Math.floor(m / 60);
      const mm = m % 60;
      return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    };
    for (let i = 0; i < shifts; i++) {
      const fromMin = startH * 60 + startM + i * slotMin;
      const toMin = fromMin + slotMin;
      slots.push({ start: fmt(fromMin), end: fmt(toMin) });
    }

    const shiftList = slots.map((slot, i) => ({
      ...slot,
      people: [selected[i * 2], selected[i * 2 + 1]],
    }));

    const dateStr = getDateStr(dayOffset);
    const weekStr = getWeekStr(dayOffset);
    const actualUsed = usedCaptains.filter(p => selected.some(s => s.id === p.id));

    return { dateStr, weekStr, shiftList, usedCaptains: actualUsed, shifts, startTime, endTime, nextPointer };
  }, [staff, gatePointer]);

  const advanceGatePointer = useCallback((nextPointer) => {
    setGatePointer(nextPointer);
  }, []);

  // 纯函数：放学大门口两人一组轮流（排除队长副队长）
  // afterSchoolPointer 表示当前组号，每组2人；奇数人数时最后一人与第一人组对
  const getAfterSchoolGate = useCallback(() => {
    const allMales = staff.filter(p => p.gender === 'male' && p.role !== 'captain' && p.role !== 'vice_captain');
    if (allMales.length === 0) return [{ name: '待分配' }, { name: '待分配' }];
    const total = allMales.length;
    const groupCount = Math.ceil(total / 2);
    const groupNum = ((afterSchoolPointer % groupCount) + groupCount) % groupCount;
    const idx1 = (groupNum * 2) % total;
    const idx2 = (groupNum * 2 + 1) % total;
    return [allMales[idx1], allMales[idx2]];
  }, [staff, afterSchoolPointer]);

  const advanceAfterSchoolPointer = useCallback(() => {
    const allMales = staff.filter(p => p.gender === 'male' && p.role !== 'captain' && p.role !== 'vice_captain');
    if (allMales.length > 0) {
      const groupCount = Math.ceil(allMales.length / 2);
      setAfterSchoolPointer((afterSchoolPointer + 1) % groupCount);
    }
  }, [staff, afterSchoolPointer]);

  const saveScheduleHistory = useCallback((record) => {
    setScheduleHistory(prev => {
      const next = [record, ...prev].slice(0, 5);
      writeDutyState('dutyScheduleHistory', next);
      return next;
    });
  }, []);

  const deleteScheduleHistory = useCallback((id) => {
    setScheduleHistory(prev => {
      const next = prev.filter(r => r.id !== id);
      writeDutyState('dutyScheduleHistory', next);
      return next;
    });
  }, []);

  const clearScheduleHistory = useCallback(() => {
    setScheduleHistory([]);
    writeDutyState('dutyScheduleHistory', []);
  }, []);

  const value = {
    staff, addStaff, updateStaff, deleteStaff, resetStaff,
    generateSchedule, generateGateDuty, advanceGatePointer,
    getAfterSchoolGate, advanceAfterSchoolPointer,
    scheduleHistory, saveScheduleHistory, deleteScheduleHistory, clearScheduleHistory,
    groupRotation,
    ROLE_LABELS,
  };

  return (
    <StoreContext.Provider value={value}>
      {children}
    </StoreContext.Provider>
  );
}

function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}

Object.assign(window, { StoreProvider, useStore });
