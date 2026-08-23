// ===== 排班系统（由 JSX 编译生成，请勿手动编辑）=====
(function() {
"use strict";

// --- store.jsx ---
// 全局状态管理：人员数据 + 真实排班算法
const {
  useState,
  useEffect,
  useCallback,
  createContext,
  useContext
} = React;

// ===== 角色定义 =====
const ROLE_LABELS = {
  captain: '队长',
  vice_captain: '副队长',
  leader_a: 'A组组长',
  leader_b: 'B组组长',
  member: '普通成员'
};

// ===== 默认人员（12人，男7女5，A/B组各6人）=====
const defaultStaff = [{
  id: 1,
  name: '张伟',
  gender: 'male',
  group: 'A',
  role: 'captain'
}, {
  id: 2,
  name: '王芳',
  gender: 'female',
  group: 'A',
  role: 'vice_captain'
}, {
  id: 3,
  name: '李强',
  gender: 'male',
  group: 'A',
  role: 'leader_a'
}, {
  id: 4,
  name: '刘洋',
  gender: 'male',
  group: 'A',
  role: 'member'
}, {
  id: 5,
  name: '陈静',
  gender: 'female',
  group: 'A',
  role: 'member'
}, {
  id: 6,
  name: '杨帆',
  gender: 'male',
  group: 'A',
  role: 'member'
}, {
  id: 13,
  name: '黄磊',
  gender: 'male',
  group: 'A',
  role: 'member'
}, {
  id: 14,
  name: '周敏',
  gender: 'male',
  group: 'A',
  role: 'member'
}, {
  id: 7,
  name: '赵磊',
  gender: 'male',
  group: 'B',
  role: 'leader_b'
}, {
  id: 8,
  name: '孙丽',
  gender: 'female',
  group: 'B',
  role: 'member'
}, {
  id: 9,
  name: '周杰',
  gender: 'male',
  group: 'B',
  role: 'member'
}, {
  id: 10,
  name: '吴敏',
  gender: 'female',
  group: 'B',
  role: 'member'
}, {
  id: 11,
  name: '郑浩',
  gender: 'male',
  group: 'B',
  role: 'member'
}, {
  id: 12,
  name: '林婷',
  gender: 'female',
  group: 'B',
  role: 'member'
}];

// ===== 岗位定义 =====
const MAIN_POSTS = [{
  key: 'gate',
  label: '大门口',
  gender: 'male'
}, {
  key: 'dorm_m',
  label: '男寝',
  gender: 'any'
}, {
  key: 'playground',
  label: '操场',
  gender: 'male'
}, {
  key: 'dorm_f',
  label: '女寝',
  gender: 'female'
}, {
  key: 'office',
  label: '办公室',
  gender: 'female'
}, {
  key: 'tech',
  label: '科技楼',
  gender: 'male'
}];
const SUB_POSITIONS = [{
  key: 'garden',
  label: '花园口',
  gender: 'any',
  type: 'single'
}, {
  key: 'canteenGate',
  label: '餐厅口',
  gender: 'any',
  type: 'single'
}, {
  key: 'canteen1',
  label: '餐厅1',
  gender: 'any',
  type: 'canteen'
}, {
  key: 'canteen2',
  label: '餐厅2',
  gender: 'any',
  type: 'canteen'
}, {
  key: 'canteen3',
  label: '餐厅3',
  gender: 'any',
  type: 'canteen'
}, {
  key: 'canteen4',
  label: '餐厅4',
  gender: 'any',
  type: 'canteen'
}];

// 岗位顺序（用户指定）：大门口、花园口、男寝、厕所口、操场、餐厅、餐厅口、女寝、办公室、科技楼
// 每个人独立维护岗位指针，按此顺序轮换，遇到不符合性别的岗位跳过
const POST_ORDER = [{
  key: 'gate',
  label: '大门口',
  gender: 'male',
  type: 'main',
  capacity: 1
}, {
  key: 'garden',
  label: '花园口',
  gender: 'any',
  type: 'sub',
  capacity: 1
}, {
  key: 'dorm_m',
  label: '男寝',
  gender: 'any',
  type: 'main',
  capacity: 1
}, {
  key: 'toilet',
  label: '厕所口',
  gender: 'any',
  type: 'sub',
  capacity: 0
},
// 由餐厅第1人兼任
{
  key: 'playground',
  label: '操场',
  gender: 'male',
  type: 'main',
  capacity: 1
}, {
  key: 'canteen',
  label: '餐厅',
  gender: 'any',
  type: 'sub',
  capacity: 4
}, {
  key: 'canteenGate',
  label: '餐厅口',
  gender: 'any',
  type: 'sub',
  capacity: 1
}, {
  key: 'dorm_f',
  label: '女寝',
  gender: 'female',
  type: 'main',
  capacity: 1
}, {
  key: 'office',
  label: '办公室',
  gender: 'female',
  type: 'main',
  capacity: 1
}, {
  key: 'tech',
  label: '科技楼',
  gender: 'male',
  type: 'main',
  capacity: 1
}];
const StoreContext = createContext(null);
function loadState(key, fallback) {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
}
function saveState(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
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
  return ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()];
}
function StoreProvider({
  children
}) {
  const [staff, setStaff] = useState(() => {
    return loadState('duty_staff', defaultStaff);
  });
  useEffect(() => {
    saveState('duty_staff', staff);
  }, [staff]);

  // 全员模式：每人独立岗位指针 { personId: postIndex }
  const [allPostPointers, setAllPostPointers] = useState(() => {
    return loadState('duty_all_post_pointers', {});
  });
  useEffect(() => {
    saveState('duty_all_post_pointers', allPostPointers);
  }, [allPostPointers]);

  // 分组模式：每人独立岗位指针 { personId: postIndex }
  const [groupPostPointers, setGroupPostPointers] = useState(() => {
    return loadState('duty_group_post_pointers', {});
  });
  useEffect(() => {
    saveState('duty_group_post_pointers', groupPostPointers);
  }, [groupPostPointers]);

  // 分组模式主副班轮换：0=A主B副，1=B主A副，每次生成后翻转
  const [groupRotation, setGroupRotation] = useState(() => {
    return loadState('duty_group_rotation', 0);
  });
  useEffect(() => {
    saveState('duty_group_rotation', groupRotation);
  }, [groupRotation]);
  const [gatePointer, setGatePointer] = useState(() => {
    return loadState('duty_gate_pointer', 0);
  });
  useEffect(() => {
    saveState('duty_gate_pointer', gatePointer);
  }, [gatePointer]);
  const [afterSchoolPointer, setAfterSchoolPointer] = useState(() => {
    return loadState('duty_afterschool_pointer', 0);
  });
  useEffect(() => {
    saveState('duty_afterschool_pointer', afterSchoolPointer);
  }, [afterSchoolPointer]);
  const [scheduleHistory, setScheduleHistory] = useState(() => {
    return loadState('duty_schedule_history', []);
  });
  useEffect(() => {
    saveState('duty_schedule_history', scheduleHistory);
  }, [scheduleHistory]);
  const addStaff = useCallback(person => {
    setStaff(prev => {
      const maxId = prev.reduce((m, p) => Math.max(m, p.id), 0);
      return [...prev, {
        role: 'member',
        ...person,
        id: maxId + 1
      }];
    });
  }, []);
  const updateStaff = useCallback((id, patch) => {
    setStaff(prev => prev.map(p => p.id === id ? {
      ...p,
      ...patch
    } : p));
  }, []);
  const deleteStaff = useCallback(id => {
    setStaff(prev => prev.filter(p => p.id !== id));
  }, []);
  const resetStaff = useCallback(() => {
    setStaff(defaultStaff);
  }, []);
  const genderMatch = (person, post) => {
    if (post.gender === 'any') return true;
    return person.gender === post.gender;
  };

  // 按岗位顺序轮换：每人独立维护岗位指针，从自己的指针位置开始找第一个能值且未满的岗位
  // filterType: 'all'=全员模式, 'main'=分组主班, 'sub'=分组副班
  function scheduleByPostRotation(people, pointers, filterType) {
    // 四男二女时女生不值男寝（女寝+办公室已用掉2个女生）
    const femaleCount = people.filter(p => p.gender === 'female').length;
    const dormMGender = filterType === 'main' && femaleCount <= 2 ? 'male' : 'any';
    const posts = POST_ORDER.map(p => p.key === 'dorm_m' ? {
      ...p,
      gender: dormMGender
    } : p);
    const sorted = [...people].sort((a, b) => (pointers[a.id] || 0) - (pointers[b.id] || 0));
    const assignments = {};
    posts.forEach(p => {
      assignments[p.key] = [];
    });
    const newPointers = {
      ...pointers
    };
    sorted.forEach(person => {
      const ptr = pointers[person.id] || 0;
      for (let i = 0; i < posts.length; i++) {
        const idx = (ptr + i) % posts.length;
        const post = posts[idx];
        if (post.capacity === 0) continue;
        if (filterType !== 'all' && post.type !== filterType) continue;
        if (post.gender !== 'any' && person.gender !== post.gender) continue;
        if (assignments[post.key].length >= post.capacity) continue;
        assignments[post.key].push(person);
        let nextIdx = (idx + 1) % posts.length;
        while (nextIdx !== idx) {
          const np = posts[nextIdx];
          if (np.capacity > 0 && (filterType === 'all' || np.type === filterType) && (np.gender === 'any' || person.gender === np.gender)) {
            break;
          }
          nextIdx = (nextIdx + 1) % posts.length;
        }
        newPointers[person.id] = nextIdx;
        break;
      }
    });
    if (assignments.canteen.length > 0) {
      assignments.toilet = [assignments.canteen[0]];
    }
    return {
      assignments,
      newPointers
    };
  }

  // 将 assignments 转换为 mainDuty/subDuty 格式
  function buildDutyFromAssignments(assignments) {
    const mainDuty = POST_ORDER.filter(p => p.type === 'main').map(p => ({
      ...p,
      person: assignments[p.key]?.[0] || {
        name: '待分配'
      }
    }));
    const subDuty = {
      garden: assignments.garden?.[0] || {
        name: '待分配'
      },
      canteenGate: assignments.canteenGate?.[0] || {
        name: '待分配'
      },
      canteen: assignments.canteen || [],
      toilet: assignments.toilet?.[0] || {
        name: '待分配'
      }
    };
    return {
      mainDuty,
      subDuty
    };
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
        if (assigned.some(p => p.id === person.id)) {
          currentIdx = i;
          break;
        }
      }
      if (currentIdx === -1) {
        pointers[person.id] = 0;
        return;
      }
      let nextIdx = (currentIdx + 1) % POST_ORDER.length;
      while (nextIdx !== currentIdx) {
        const np = POST_ORDER[nextIdx];
        if (np.capacity > 0 && (filterType === 'all' || np.type === filterType) && (np.gender === 'any' || person.gender === np.gender)) break;
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
      const isAMain = groupRotation === 0;
      mainGroup = isAMain ? 'A' : 'B';
      subGroup = isAMain ? 'B' : 'A';
      const mainPeople = activeStaff.filter(p => p.group === mainGroup);
      const subPeople = activeStaff.filter(p => p.group === subGroup);
      let mainPointers = groupPostPointers;
      let subPointers = groupPostPointers;
      if (baseAssignments) {
        mainPointers = computeNextPointers(baseAssignments, mainPeople, 'main');
        subPointers = computeNextPointers(baseAssignments, subPeople, 'sub');
      }
      const mainResult = scheduleByPostRotation(mainPeople, mainPointers, 'main');
      const subResult = scheduleByPostRotation(subPeople, subPointers, 'sub');
      const mergedPointers = {
        ...groupPostPointers,
        ...mainResult.newPointers,
        ...subResult.newPointers
      };
      setGroupPostPointers(mergedPointers);
      setGroupRotation(groupRotation === 0 ? 1 : 0);
      const merged = {
        ...mainResult.assignments
      };
      Object.keys(subResult.assignments).forEach(k => {
        if (subResult.assignments[k].length > 0) merged[k] = subResult.assignments[k];
      });
      finalAssignments = merged;
      const duty = buildDutyFromAssignments(merged);
      mainDuty = duty.mainDuty;
      subDuty = duty.subDuty;
    }
    return {
      dateStr,
      fullDateStr,
      weekStr,
      mode,
      mainGroup,
      subGroup,
      mainDuty,
      subDuty,
      assignments: finalAssignments
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
      if (viceCaptain && viceCaptain.id !== aGroupLeader?.id) {
        pool.push(viceCaptain);
        usedCaptains.push(viceCaptain);
      }
    }
    if (pool.length < poolNeeded) {
      if (captain && captain.id !== aGroupLeader?.id) {
        pool.push(captain);
        usedCaptains.push(captain);
      }
    }
    while (pool.length < poolNeeded && pool.length > 0) {
      pool = pool.concat(pool);
    }
    if (pool.length === 0) {
      pool = [{
        name: '待分配',
        gender: 'male'
      }];
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
    const totalMin = endH * 60 + endM - (startH * 60 + startM);
    const slotMin = Math.floor(totalMin / shifts);
    const fmt = m => {
      const h = Math.floor(m / 60);
      const mm = m % 60;
      return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    };
    for (let i = 0; i < shifts; i++) {
      const fromMin = startH * 60 + startM + i * slotMin;
      const toMin = fromMin + slotMin;
      slots.push({
        start: fmt(fromMin),
        end: fmt(toMin)
      });
    }
    const shiftList = slots.map((slot, i) => ({
      ...slot,
      people: [selected[i * 2], selected[i * 2 + 1]]
    }));
    const dateStr = getDateStr(dayOffset);
    const weekStr = getWeekStr(dayOffset);
    const actualUsed = usedCaptains.filter(p => selected.some(s => s.id === p.id));
    return {
      dateStr,
      weekStr,
      shiftList,
      usedCaptains: actualUsed,
      shifts,
      startTime,
      endTime,
      nextPointer
    };
  }, [staff, gatePointer]);
  const advanceGatePointer = useCallback(nextPointer => {
    setGatePointer(nextPointer);
  }, []);

  // 纯函数：放学大门口两人一组轮流（排除队长副队长）
  // afterSchoolPointer 表示当前组号，每组2人；奇数人数时最后一人与第一人组对
  const getAfterSchoolGate = useCallback(() => {
    const allMales = staff.filter(p => p.gender === 'male' && p.role !== 'captain' && p.role !== 'vice_captain');
    if (allMales.length === 0) return [{
      name: '待分配'
    }, {
      name: '待分配'
    }];
    const total = allMales.length;
    const groupCount = Math.ceil(total / 2);
    const groupNum = (afterSchoolPointer % groupCount + groupCount) % groupCount;
    const idx1 = groupNum * 2 % total;
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
  const saveScheduleHistory = useCallback(record => {
    setScheduleHistory(prev => {
      return [record, ...prev].slice(0, 5);
    });
  }, []);
  const deleteScheduleHistory = useCallback(id => {
    setScheduleHistory(prev => prev.filter(r => r.id !== id));
  }, []);
  const clearScheduleHistory = useCallback(() => {
    setScheduleHistory([]);
  }, []);
  const value = {
    staff,
    addStaff,
    updateStaff,
    deleteStaff,
    resetStaff,
    generateSchedule,
    generateGateDuty,
    advanceGatePointer,
    getAfterSchoolGate,
    advanceAfterSchoolPointer,
    scheduleHistory,
    saveScheduleHistory,
    deleteScheduleHistory,
    clearScheduleHistory,
    groupRotation,
    ROLE_LABELS
  };
  return /*#__PURE__*/React.createElement(StoreContext.Provider, {
    value: value
  }, children);
}
function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
Object.assign(window, {
  StoreProvider,
  useStore
});

// --- HomePage.jsx ---
function HomePage({
  onNavigate
}) {
  const cardStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '14px',
    padding: '48px 32px',
    borderRadius: '16px',
    background: '#fff',
    border: '2px solid #e5e7eb',
    cursor: 'pointer',
    transition: 'all .2s ease'
  };
  const iconStyle = {
    width: '64px',
    height: '64px',
    borderRadius: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  };
  const cards = [{
    key: 'duty',
    title: '值班排班',
    desc: '全员模式 / 分组模式 / 大门口值班',
    color: '#2563eb',
    bg: '#eff6ff',
    icon: /*#__PURE__*/React.createElement("svg", {
      width: "32",
      height: "32",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "#2563eb",
      strokeWidth: "2",
      strokeLinecap: "round",
      strokeLinejoin: "round"
    }, /*#__PURE__*/React.createElement("rect", {
      x: "3",
      y: "4",
      width: "18",
      height: "18",
      rx: "2",
      ry: "2"
    }), /*#__PURE__*/React.createElement("line", {
      x1: "16",
      y1: "2",
      x2: "16",
      y2: "6"
    }), /*#__PURE__*/React.createElement("line", {
      x1: "8",
      y1: "2",
      x2: "8",
      y2: "6"
    }), /*#__PURE__*/React.createElement("line", {
      x1: "3",
      y1: "10",
      x2: "21",
      y2: "10"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M8 14h.01"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M12 14h.01"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M16 14h.01"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M8 18h.01"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M12 18h.01"
    })),
    onClick: () => onNavigate('dutySelect')
  }, {
    key: 'staff',
    title: '人员管理',
    desc: '维护人员信息\n设置性别、分组与角色',
    color: '#9333ea',
    bg: '#faf5ff',
    icon: /*#__PURE__*/React.createElement("svg", {
      width: "32",
      height: "32",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "#9333ea",
      strokeWidth: "2",
      strokeLinecap: "round",
      strokeLinejoin: "round"
    }, /*#__PURE__*/React.createElement("path", {
      d: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "9",
      cy: "7",
      r: "4"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M23 21v-2a4 4 0 0 0-3-3.87"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M16 3.13a4 4 0 0 1 0 7.75"
    }), /*#__PURE__*/React.createElement("line", {
      x1: "12",
      y1: "11",
      x2: "12",
      y2: "17"
    }), /*#__PURE__*/React.createElement("line", {
      x1: "9",
      y1: "14",
      x2: "15",
      y2: "14"
    })),
    onClick: () => onNavigate('staff')
  }];
  return /*#__PURE__*/React.createElement("div", {
    className: "page-enter",
    style: {
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement("header", {
    style: {
      padding: '32px 40px',
      background: '#fff',
      borderBottom: '1px solid #e5e7eb'
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      fontSize: '26px',
      fontWeight: 700,
      color: '#111827',
      letterSpacing: '0.5px'
    }
  }, "\u503C\u73ED\u6392\u73ED\u7CFB\u7EDF")), /*#__PURE__*/React.createElement("main", {
    style: {
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '60px 40px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: '24px',
      maxWidth: '700px',
      width: '100%'
    }
  }, cards.map(card => /*#__PURE__*/React.createElement("div", {
    key: card.key,
    style: cardStyle,
    onClick: card.onClick,
    onMouseEnter: e => {
      e.currentTarget.style.borderColor = card.color;
      e.currentTarget.style.transform = 'translateY(-4px)';
      e.currentTarget.style.boxShadow = `0 12px 24px ${card.color}20`;
    },
    onMouseLeave: e => {
      e.currentTarget.style.borderColor = '#e5e7eb';
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = 'none';
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      ...iconStyle,
      background: card.bg
    }
  }, card.icon), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontSize: '22px',
      fontWeight: 600,
      color: '#111827'
    }
  }, card.title), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: '13px',
      color: '#6b7280',
      textAlign: 'center',
      lineHeight: 1.6,
      whiteSpace: 'pre-line'
    }
  }, card.desc), /*#__PURE__*/React.createElement("span", {
    style: {
      marginTop: '4px',
      fontSize: '14px',
      color: card.color,
      fontWeight: 500
    }
  }, "\u8FDB\u5165 \u2192"))))));
}
Object.assign(window, {
  HomePage
});

// --- StaffPage.jsx ---
function StaffPage({
  onNavigate,
  canEdit
}) {
  const {
    staff,
    addStaff,
    updateStaff,
    deleteStaff,
    resetStaff,
    ROLE_LABELS
  } = useStore();
  const [showGroup, setShowGroup] = React.useState(true);
  const [filter, setFilter] = React.useState(null); // null=全部, male/female/A/B
  const [toast, setToast] = React.useState(null);
  const editable = canEdit !== false; // 默认可编辑，仅显式传 false 时只读

  const showToast = msg => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };
  const handleSave = () => {
    if (!editable) {
      showToast('当前账号无修改权限');
      return;
    }
    const invalid = staff.some(p => !p.name || !p.name.trim());
    if (invalid) {
      showToast('请填写所有人员姓名');
      return;
    }
    showToast('保存成功');
  };
  const handleAdd = () => {
    if (!editable) {
      showToast('当前账号无修改权限');
      return;
    }
    const count = staff.length;
    let role = 'member',
      group = 'A',
      gender = 'male';
    if (count === 0) {
      role = 'captain';
      group = 'A';
      gender = 'male';
    } else if (count === 1) {
      role = 'vice_captain';
      group = 'A';
      gender = 'male';
    } else if (count === 2) {
      role = 'leader_a';
      group = 'A';
      gender = 'male';
    } else if (count >= 3 && count <= 7) {
      role = 'member';
      group = 'A';
      gender = count % 2 === 0 ? 'female' : 'male';
    } else if (count === 8) {
      role = 'leader_b';
      group = 'B';
      gender = 'male';
    } else {
      role = 'member';
      group = 'B';
      gender = count % 2 === 0 ? 'female' : 'male';
    }
    addStaff({
      name: '',
      gender,
      group,
      role
    });
  };

  // 排序：队长、副队长、A组组长、A组成员、B组组长、B组成员
  const sortedStaff = [...staff].sort((a, b) => {
    // 队长、副队长排在最前面
    const aTop = a.role === 'captain' ? 0 : a.role === 'vice_captain' ? 1 : 2;
    const bTop = b.role === 'captain' ? 0 : b.role === 'vice_captain' ? 1 : 2;
    if (aTop !== bTop) return aTop - bTop;
    // 同级别按分组
    if (a.group !== b.group) return a.group === 'A' ? -1 : 1;
    // 同组内组长在前
    const aLeader = a.role === 'leader_a' || a.role === 'leader_b' ? 0 : 1;
    const bLeader = b.role === 'leader_a' || b.role === 'leader_b' ? 0 : 1;
    if (aLeader !== bLeader) return aLeader - bLeader;
    return a.id - b.id;
  });
  const handleDelete = id => {
    if (!editable) {
      showToast('当前账号无修改权限');
      return;
    }
    deleteStaff(id);
  };
  const handleReset = () => {
    if (!editable) {
      showToast('当前账号无修改权限');
      return;
    }
    resetStaff();
  };
  const handleRoleChange = (id, newRole) => {
    if (!editable) return;
    if (['captain', 'vice_captain', 'leader_a', 'leader_b'].includes(newRole)) {
      staff.forEach(p => {
        if (p.role === newRole && p.id !== id) {
          updateStaff(p.id, {
            role: 'member'
          });
        }
      });
    }
    let patch = {
      role: newRole
    };
    if (newRole === 'leader_a') patch.group = 'A';
    if (newRole === 'leader_b') patch.group = 'B';
    updateStaff(id, patch);
  };
  const handleUpdate = (id, patch) => {
    if (!editable) return;
    updateStaff(id, patch);
  };
  const maleCount = staff.filter(p => p.gender === 'male').length;
  const femaleCount = staff.filter(p => p.gender === 'female').length;
  const aCount = staff.filter(p => p.group === 'A' && p.role !== 'captain' && p.role !== 'vice_captain').length;
  const bCount = staff.filter(p => p.group === 'B' && p.role !== 'captain' && p.role !== 'vice_captain').length;
  const captain = staff.find(p => p.role === 'captain');
  const viceCaptain = staff.find(p => p.role === 'vice_captain');

  // 筛选后的人员列表（基于排序后的列表）
  const filteredStaff = sortedStaff.filter(p => {
    if (!filter) return true;
    if (filter === 'male') return p.gender === 'male';
    if (filter === 'female') return p.gender === 'female';
    if (filter === 'A') return p.group === 'A' && p.role !== 'captain' && p.role !== 'vice_captain';
    if (filter === 'B') return p.group === 'B' && p.role !== 'captain' && p.role !== 'vice_captain';
    return true;
  });
  const getRoleOptions = person => {
    const opts = [{
      value: 'member',
      label: '普通成员'
    }];
    opts.push({
      value: 'captain',
      label: '队长'
    });
    opts.push({
      value: 'vice_captain',
      label: '副队长'
    });
    opts.push({
      value: 'leader_a',
      label: 'A组组长'
    });
    opts.push({
      value: 'leader_b',
      label: 'B组组长'
    });
    return opts;
  };
  const roleTagStyle = role => {
    switch (role) {
      case 'captain':
        return {
          bg: '#fef3c7',
          color: '#b45309'
        };
      case 'vice_captain':
        return {
          bg: '#e0e7ff',
          color: '#4338ca'
        };
      case 'leader_a':
        return {
          bg: '#fef3c7',
          color: '#b45309'
        };
      case 'leader_b':
        return {
          bg: '#d1fae5',
          color: '#047857'
        };
      default:
        return {
          bg: '#f3f4f6',
          color: '#6b7280'
        };
    }
  };
  const isCaptainOrVice = person => person.role === 'captain' || person.role === 'vice_captain';

  // 姓名对齐：两个字中间加全角空格
  const formatName = name => {
    if (!name) return '';
    const n = name.trim();
    if (n.length === 2) return n.charAt(0) + '　' + n.charAt(1);
    return n;
  };
  // 去除全角空格，保存原始姓名
  const unformatName = name => name.replace(/　/g, '').trim();
  const filterBtnStyle = active => ({
    padding: '10px 16px',
    borderRadius: '10px',
    border: '1px solid',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: active ? '#eff6ff' : '#fff',
    borderColor: active ? '#2563eb' : '#e5e7eb',
    transition: 'all .15s'
  });
  const readOnlyInputStyle = {
    ...inputStyle,
    background: '#f9fafb',
    color: '#6b7280',
    cursor: 'default'
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement("header", {
    style: {
      padding: '20px 32px',
      background: '#fff',
      borderBottom: '1px solid #e5e7eb',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '16px'
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost btn-sm",
    onClick: () => onNavigate('home'),
    style: {
      marginLeft: '-8px'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "16",
    height: "16",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M19 12H5"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 19l-7-7 7-7"
  })), "\u8FD4\u56DE\u9996\u9875"), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontSize: '18px',
      fontWeight: 600,
      color: '#111827'
    }
  }, "\u5458\u5DE5\u7BA1\u7406"), !editable && /*#__PURE__*/React.createElement("span", {
    style: {
      padding: '3px 10px',
      borderRadius: '6px',
      fontSize: '12px',
      fontWeight: 500,
      background: '#fef3c7',
      color: '#b45309'
    }
  }, "\u53EA\u8BFB\u6A21\u5F0F")), /*#__PURE__*/React.createElement("div", {
    className: "radio-group"
  }, /*#__PURE__*/React.createElement("label", null, /*#__PURE__*/React.createElement("input", {
    type: "radio",
    checked: showGroup,
    onChange: () => setShowGroup(true)
  }), /*#__PURE__*/React.createElement("span", null, "\u663E\u793A\u5206\u7EC4")), /*#__PURE__*/React.createElement("label", null, /*#__PURE__*/React.createElement("input", {
    type: "radio",
    checked: !showGroup,
    onChange: () => setShowGroup(false)
  }), /*#__PURE__*/React.createElement("span", null, "\u9690\u85CF\u5206\u7EC4")))), /*#__PURE__*/React.createElement("main", {
    style: {
      flex: 1,
      padding: '28px 32px',
      maxWidth: '1280px',
      margin: '0 auto',
      width: '100%'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '12px',
      marginBottom: '20px',
      flexWrap: 'wrap',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: () => setFilter(null),
    style: filterBtnStyle(filter === null)
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '13px',
      color: filter === null ? '#1d4ed8' : '#374151',
      fontWeight: 600
    }
  }, "\u5171"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '18px',
      color: filter === null ? '#1e40af' : '#374151',
      fontWeight: 700
    }
  }, staff.length), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '13px',
      color: filter === null ? '#1d4ed8' : '#374151',
      fontWeight: 600
    }
  }, "\u4EBA")), /*#__PURE__*/React.createElement("div", {
    onClick: () => setFilter(filter === 'male' ? null : 'male'),
    style: filterBtnStyle(filter === 'male')
  }, /*#__PURE__*/React.createElement("span", {
    className: "tag tag-male"
  }, "\u7537"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '14px',
      color: '#374151',
      fontWeight: 500
    }
  }, maleCount, " \u4EBA")), /*#__PURE__*/React.createElement("div", {
    onClick: () => setFilter(filter === 'female' ? null : 'female'),
    style: filterBtnStyle(filter === 'female')
  }, /*#__PURE__*/React.createElement("span", {
    className: "tag tag-female"
  }, "\u5973"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '14px',
      color: '#374151',
      fontWeight: 500
    }
  }, femaleCount, " \u4EBA")), showGroup && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    onClick: () => setFilter(filter === 'A' ? null : 'A'),
    style: filterBtnStyle(filter === 'A')
  }, /*#__PURE__*/React.createElement("span", {
    className: "tag tag-group-a"
  }, "A\u7EC4"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '14px',
      color: '#374151',
      fontWeight: 500
    }
  }, aCount, " \u4EBA")), /*#__PURE__*/React.createElement("div", {
    onClick: () => setFilter(filter === 'B' ? null : 'B'),
    style: filterBtnStyle(filter === 'B')
  }, /*#__PURE__*/React.createElement("span", {
    className: "tag tag-group-b"
  }, "B\u7EC4"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '14px',
      color: '#374151',
      fontWeight: 500
    }
  }, bCount, " \u4EBA"))), filter && /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost btn-sm",
    onClick: () => setFilter(null),
    style: {
      color: '#6b7280'
    }
  }, "\u6E05\u9664\u7B5B\u9009")), filter && /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: '12px',
      fontSize: '13px',
      color: '#6b7280'
    }
  }, "\u5F53\u524D\u7B5B\u9009\uFF1A", /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 600,
      color: '#2563eb'
    }
  }, filter === 'male' ? '男生' : filter === 'female' ? '女生' : filter === 'A' ? 'A组' : 'B组'), "\uFF0C\u5171 ", filteredStaff.length, " \u4EBA"), /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#fff',
      borderRadius: '12px',
      border: '1px solid #e5e7eb',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '16px 20px',
      borderBottom: '1px solid #e5e7eb',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      fontSize: '16px',
      fontWeight: 600,
      color: '#111827'
    }
  }, "\u4EBA\u5458\u5217\u8868"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '8px'
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: 'btn btn-sm ' + (editable ? 'btn-secondary' : 'btn-ghost'),
    onClick: handleAdd,
    disabled: !editable,
    style: !editable ? {
      opacity: .5,
      cursor: 'not-allowed'
    } : {}
  }, /*#__PURE__*/React.createElement("svg", {
    width: "14",
    height: "14",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M12 5v14"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M5 12h14"
  })), "\u6DFB\u52A0\u4EBA\u5458"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost btn-sm",
    onClick: handleReset,
    disabled: !editable,
    style: !editable ? {
      color: '#c0c4cc',
      opacity: .5,
      cursor: 'not-allowed'
    } : {
      color: '#6b7280'
    }
  }, "\u91CD\u7F6E\u4E3A\u9ED8\u8BA4"))), /*#__PURE__*/React.createElement("table", {
    style: {
      width: '100%',
      tableLayout: 'fixed',
      borderCollapse: 'collapse'
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", {
    style: {
      width: '60px',
      whiteSpace: 'nowrap'
    }
  }, "\u5E8F\u53F7"), /*#__PURE__*/React.createElement("th", null, "\u59D3\u540D"), /*#__PURE__*/React.createElement("th", {
    style: {
      width: '120px'
    }
  }, "\u6027\u522B"), showGroup && /*#__PURE__*/React.createElement("th", {
    style: {
      width: '120px'
    }
  }, "\u5206\u7EC4"), /*#__PURE__*/React.createElement("th", {
    style: {
      width: '160px'
    }
  }, "\u804C\u4F4D"), /*#__PURE__*/React.createElement("th", {
    style: {
      width: '90px',
      textAlign: 'right'
    }
  }, "\u64CD\u4F5C"))), /*#__PURE__*/React.createElement("tbody", null, filteredStaff.map((person, idx) => {
    const roleOpts = getRoleOptions(person);
    const rtStyle = roleTagStyle(person.role);
    const isCapVice = isCaptainOrVice(person);
    return /*#__PURE__*/React.createElement("tr", {
      key: person.id
    }, /*#__PURE__*/React.createElement("td", {
      style: {
        color: '#9ca3af',
        fontSize: '13px'
      }
    }, idx + 1), /*#__PURE__*/React.createElement("td", null, editable ? /*#__PURE__*/React.createElement("input", {
      type: "text",
      value: formatName(person.name),
      onChange: e => handleUpdate(person.id, {
        name: unformatName(e.target.value)
      }),
      placeholder: "\u8BF7\u8F93\u5165\u59D3\u540D",
      style: {
        ...nameInputStyle,
        letterSpacing: person.name && person.name.trim().length === 2 ? '2px' : '0'
      },
      onFocus: e => e.target.style.borderColor = '#2563eb',
      onBlur: e => e.target.style.borderColor = 'transparent'
    }) : /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: '14px',
        color: '#374151',
        fontWeight: 500
      }
    }, formatName(person.name) || '（未命名）')), /*#__PURE__*/React.createElement("td", null, editable ? /*#__PURE__*/React.createElement("div", {
      className: "radio-group"
    }, /*#__PURE__*/React.createElement("label", null, /*#__PURE__*/React.createElement("input", {
      type: "radio",
      name: `gender-${person.id}`,
      checked: person.gender === 'male',
      onChange: () => handleUpdate(person.id, {
        gender: 'male'
      })
    }), /*#__PURE__*/React.createElement("span", null, "\u7537")), /*#__PURE__*/React.createElement("label", null, /*#__PURE__*/React.createElement("input", {
      type: "radio",
      name: `gender-${person.id}`,
      checked: person.gender === 'female',
      onChange: () => handleUpdate(person.id, {
        gender: 'female'
      })
    }), /*#__PURE__*/React.createElement("span", null, "\u5973"))) : /*#__PURE__*/React.createElement("span", {
      className: 'tag ' + (person.gender === 'male' ? 'tag-male' : 'tag-female')
    }, person.gender === 'male' ? '男' : '女')), showGroup && /*#__PURE__*/React.createElement("td", null, isCapVice ? /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: '13px',
        color: '#9ca3af'
      }
    }, "\u2014 \u4E0D\u53C2\u4E0E\u5206\u7EC4 \u2014") : editable ? /*#__PURE__*/React.createElement("div", {
      className: "radio-group"
    }, /*#__PURE__*/React.createElement("label", null, /*#__PURE__*/React.createElement("input", {
      type: "radio",
      name: `group-${person.id}`,
      checked: person.group === 'A',
      onChange: () => {
        let newRole = person.role;
        if (person.group === 'B' && person.role === 'leader_b') newRole = 'member';
        handleUpdate(person.id, {
          group: 'A',
          role: newRole
        });
      }
    }), /*#__PURE__*/React.createElement("span", null, "A\u7EC4")), /*#__PURE__*/React.createElement("label", null, /*#__PURE__*/React.createElement("input", {
      type: "radio",
      name: `group-${person.id}`,
      checked: person.group === 'B',
      onChange: () => {
        let newRole = person.role;
        if (person.group === 'A' && person.role === 'leader_a') newRole = 'member';
        handleUpdate(person.id, {
          group: 'B',
          role: newRole
        });
      }
    }), /*#__PURE__*/React.createElement("span", null, "B\u7EC4"))) : /*#__PURE__*/React.createElement("span", {
      className: 'tag tag-group-' + (person.group === 'A' ? 'a' : 'b')
    }, person.group, "\u7EC4")), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }
    }, editable ? /*#__PURE__*/React.createElement("select", {
      value: person.role,
      onChange: e => handleRoleChange(person.id, e.target.value),
      style: {
        padding: '6px 8px',
        border: '1px solid #d1d5db',
        borderRadius: '6px',
        fontSize: '13px',
        background: '#fff',
        outline: 'none',
        cursor: 'pointer'
      }
    }, roleOpts.map(opt => /*#__PURE__*/React.createElement("option", {
      key: opt.value,
      value: opt.value
    }, opt.label))) : null, /*#__PURE__*/React.createElement("span", {
      style: {
        padding: '2px 8px',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: 500,
        background: rtStyle.bg,
        color: rtStyle.color,
        whiteSpace: 'nowrap'
      }
    }, ROLE_LABELS[person.role]))), /*#__PURE__*/React.createElement("td", {
      style: {
        textAlign: 'right'
      }
    }, /*#__PURE__*/React.createElement("button", {
      className: "btn btn-danger btn-sm",
      onClick: () => handleDelete(person.id),
      disabled: !editable || staff.length <= 1,
      style: !editable || staff.length <= 1 ? {
        visibility: 'hidden'
      } : {}
    }, "\u5220\u9664")));
  }))), filteredStaff.length === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '60px 20px',
      textAlign: 'center',
      color: '#9ca3af',
      fontSize: '14px'
    }
  }, staff.length === 0 ? '暂无人员，点击上方"添加人员"开始录入' : '当前筛选条件下无人员')), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: '24px',
      background: '#fff',
      borderRadius: '12px',
      border: '1px solid #e5e7eb',
      padding: '20px 24px'
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      fontSize: '15px',
      fontWeight: 600,
      color: '#111827',
      marginBottom: '14px'
    }
  }, "\u5206\u7EC4\u4FE1\u606F"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      fontSize: '14px',
      color: '#374151',
      lineHeight: 1.8
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 600,
      color: '#b45309',
      marginRight: '8px'
    }
  }, "\u961F\u957F\uFF1A"), /*#__PURE__*/React.createElement("span", null, captain?.name || '未设置'), /*#__PURE__*/React.createElement("span", {
    style: {
      margin: '0 16px',
      color: '#d1d5db'
    }
  }, "|"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 600,
      color: '#4338ca',
      marginRight: '8px'
    }
  }, "\u526F\u961F\u957F\uFF1A"), /*#__PURE__*/React.createElement("span", null, viceCaptain?.name || '未设置'), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: '12px',
      fontSize: '12px',
      color: '#9ca3af'
    }
  }, "\uFF08\u4E0D\u53C2\u4E0E\u5206\u7EC4\uFF09")), /*#__PURE__*/React.createElement("div", {
    style: {
      paddingTop: '8px',
      borderTop: '1px dashed #e5e7eb'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 600,
      color: '#b45309',
      marginRight: '8px'
    }
  }, "A\u7EC4\u7EC4\u957F\uFF1A"), /*#__PURE__*/React.createElement("span", null, staff.find(p => p.role === 'leader_a')?.name || '未设置'), /*#__PURE__*/React.createElement("span", {
    style: {
      margin: '0 12px',
      color: '#d1d5db'
    }
  }, "|"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 600,
      color: '#374151',
      marginRight: '8px'
    }
  }, "\u6210\u5458\uFF1A"), /*#__PURE__*/React.createElement("span", null, staff.filter(p => p.group === 'A' && p.role !== 'leader_a' && p.role !== 'captain' && p.role !== 'vice_captain').map(p => p.name || '(未命名)').join('、') || '暂无')), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 600,
      color: '#047857',
      marginRight: '8px'
    }
  }, "B\u7EC4\u7EC4\u957F\uFF1A"), /*#__PURE__*/React.createElement("span", null, staff.find(p => p.role === 'leader_b')?.name || '未设置'), /*#__PURE__*/React.createElement("span", {
    style: {
      margin: '0 12px',
      color: '#d1d5db'
    }
  }, "|"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 600,
      color: '#374151',
      marginRight: '8px'
    }
  }, "\u6210\u5458\uFF1A"), /*#__PURE__*/React.createElement("span", null, staff.filter(p => p.group === 'B' && p.role !== 'leader_b' && p.role !== 'captain' && p.role !== 'vice_captain').map(p => p.name || '(未命名)').join('、') || '暂无')))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: '24px',
      display: 'flex',
      justifyContent: 'flex-end',
      gap: '12px'
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-secondary",
    onClick: () => onNavigate('home')
  }, "\u8FD4\u56DE\u9996\u9875"), /*#__PURE__*/React.createElement("button", {
    className: 'btn ' + (editable ? 'btn-primary' : 'btn-ghost'),
    onClick: handleSave,
    disabled: !editable,
    style: !editable ? {
      opacity: .5,
      cursor: 'not-allowed'
    } : {}
  }, "\u4FDD\u5B58\u8BBE\u7F6E"))), toast && /*#__PURE__*/React.createElement("div", {
    className: "toast"
  }, toast));
}
const inputStyle = {
  width: '100%',
  padding: '6px 10px',
  border: '1px solid #d1d5db',
  borderRadius: '6px',
  fontSize: '14px',
  outline: 'none',
  transition: 'border-color .15s'
};
const nameInputStyle = {
  width: '100%',
  padding: '6px 10px',
  border: '1px solid transparent',
  borderRadius: '6px',
  fontSize: '14px',
  outline: 'none',
  transition: 'border-color .15s',
  background: 'transparent',
  textAlign: 'center',
  fontWeight: 500
};
Object.assign(window, {
  StaffPage
});

// --- SchedulePage.jsx ---
function SchedulePage({
  mode,
  onNavigate,
  embedded,
  customAssignments,
  setCustomAssignments,
  showToast: propShowToast,
  externalSchedule
}) {
  const {
    generateSchedule,
    getAfterSchoolGate,
    advanceAfterSchoolPointer,
    scheduleHistory,
    saveScheduleHistory,
    deleteScheduleHistory,
    staff,
    groupRotation
  } = useStore();
  const [schedule, setSchedule] = React.useState(null);
  const [afterSchoolPeople, setAfterSchoolPeople] = React.useState(null);
  const [localToast, setLocalToast] = React.useState(null);

  // 监听外部 schedule 变化（从自定义岗位"使用该排班"按钮触发）
  React.useEffect(() => {
    if (externalSchedule && externalSchedule.trigger) {
      const {
        trigger,
        ...rest
      } = externalSchedule;
      setSchedule(rest);
      setAfterSchoolPeople(null);
    }
  }, [externalSchedule]);
  const showToast = propShowToast || (msg => {
    setLocalToast(msg);
    setTimeout(() => setLocalToast(null), 2500);
  });
  const isGroupMode = mode === 'group';
  const modeLabel = isGroupMode ? '分组模式' : '全员模式';
  const modeColor = isGroupMode ? '#059669' : '#2563eb';
  const modeBg = isGroupMode ? '#ecfdf5' : '#eff6ff';
  const isAMain = groupRotation === 0;
  const mainGroup = isAMain ? 'A' : 'B';
  const subGroup = isAMain ? 'B' : 'A';
  const activeStaff = staff.filter(p => p.role !== 'captain' && p.role !== 'vice_captain');
  const handleGenerate = () => {
    if (activeStaff.length === 0) {
      showToast('暂无参与值班的人员');
      return;
    }
    const hasCustom = customAssignments && Object.keys(customAssignments).length > 0 && Object.values(customAssignments).some(arr => arr && arr.some(p => p && p.id));
    const base = hasCustom ? customAssignments : null;
    const result = generateSchedule(mode, 1, base);
    setSchedule(result);
    if (setCustomAssignments) setCustomAssignments(result.assignments || {});
    let afterSchool = null;
    if (isGroupMode) {
      afterSchool = getAfterSchoolGate();
      setAfterSchoolPeople(afterSchool);
      advanceAfterSchoolPointer();
    }
    const historyRecord = {
      id: Date.now(),
      mode: mode,
      modeLabel: modeLabel,
      dateStr: result.dateStr,
      fullDateStr: result.fullDateStr,
      weekStr: result.weekStr,
      mainGroup: result.mainGroup,
      subGroup: result.subGroup,
      mainDuty: result.mainDuty,
      subDuty: result.subDuty,
      assignments: result.assignments,
      afterSchool: afterSchool,
      createdAt: new Date().toLocaleString('zh-CN')
    };
    saveScheduleHistory(historyRecord);
    const warnings = computeWarnings(historyRecord);
    if (warnings.emptyPosts.length > 0 || warnings.unusedPeople.length > 0) {
      let msg = '';
      if (warnings.emptyPosts.length > 0) msg += `无人岗位:${warnings.emptyPosts.join('、')} `;
      if (warnings.unusedPeople.length > 0) msg += `未参与:${warnings.unusedPeople.map(p => p.name).join('、')}`;
      showToast(msg);
    } else {
      showToast('排班已生成');
    }
  };
  const handleUseRecord = record => {
    if (record.assignments) {
      if (setCustomAssignments) setCustomAssignments(record.assignments);
      setSchedule({
        dateStr: record.dateStr,
        fullDateStr: record.fullDateStr,
        weekStr: record.weekStr,
        mainGroup: record.mainGroup,
        subGroup: record.subGroup,
        mainDuty: record.mainDuty,
        subDuty: record.subDuty
      });
      setAfterSchoolPeople(record.afterSchool);
      showToast('已加载到自定义框，下次生成将以此为基准轮换');
    }
  };
  const renderTextFromRecord = record => {
    if (!record) return '';
    const lines = [];
    lines.push(`${record.dateStr}值班`);
    lines.push('');
    const padPost = name => {
      if (!name) return '';
      if (name.length === 2) return name.charAt(0) + '  ' + name.charAt(1);
      return name;
    };
    const {
      mainDuty,
      subDuty
    } = record;
    mainDuty.forEach(post => {
      const postName = post.label || post.name || '';
      lines.push(`${padPost(postName)}：${post.person.name || '待分配'}`);
    });
    lines.push(`花园口：${subDuty.garden.name || '待分配'}`);
    const canteenNames = subDuty.canteen.map(p => p.name || '待分配').join(' ');
    lines.push(`餐  厅：${canteenNames}`);
    lines.push(`餐厅口：${subDuty.canteenGate.name || '待分配'}`);
    lines.push(`厕所口：${subDuty.toilet?.name || '待分配'}`);
    if (record.mode === 'all') {
      const lunchPerson = subDuty.lunch || record.mainDuty.find(p => (p.key || p.label) === 'office' || (p.label || p.name) === '办公室')?.person;
      lines.push(`中午收假条：${lunchPerson?.name || '待分配'}`);
    }
    if (record.mode === 'group' && record.afterSchool) {
      lines.push('');
      lines.push('放学大门口：');
      lines.push('前门');
      const names = record.afterSchool.map(p => p?.name || '待分配').join('  ');
      lines.push(`16:10——16:40  ${names}`);
      lines.push('楼层教官注意断水、断电、关闭窗户，16:50检查没有问题统一离校。');
    }
    return lines.join('\n');
  };
  const computeWarnings = record => {
    if (!record) return {
      emptyPosts: [],
      unusedPeople: []
    };
    const emptyPosts = [];
    const assignedIds = new Set();
    const checkPerson = (postLabel, person) => {
      if (person.name === '待分配' || !person.id) emptyPosts.push(postLabel);else assignedIds.add(person.id);
    };
    record.mainDuty.forEach(post => checkPerson(post.label || post.name, post.person));
    checkPerson('花园口', record.subDuty.garden);
    checkPerson('餐厅口', record.subDuty.canteenGate);
    checkPerson('厕所口', record.subDuty.toilet);
    record.subDuty.canteen.forEach((p, i) => checkPerson(`餐厅${i + 1}`, p));
    const unusedPeople = activeStaff.filter(p => !assignedIds.has(p.id) && p.name && p.name.trim());
    return {
      emptyPosts: [...new Set(emptyPosts)],
      unusedPeople
    };
  };
  const currentRecord = schedule ? {
    mode: mode,
    dateStr: schedule.dateStr,
    fullDateStr: schedule.fullDateStr,
    weekStr: schedule.weekStr,
    mainGroup: schedule.mainGroup,
    subGroup: schedule.subGroup,
    mainDuty: schedule.mainDuty,
    subDuty: schedule.subDuty,
    afterSchool: afterSchoolPeople
  } : null;
  const currentWarnings = currentRecord ? computeWarnings(currentRecord) : {
    emptyPosts: [],
    unusedPeople: []
  };
  const modeHistory = scheduleHistory.filter(h => h.mode === mode);
  const handleDeleteHistory = (id, e) => {
    e.stopPropagation();
    deleteScheduleHistory(id);
    showToast('已删除该条记录');
  };
  const buildScheduleFromCustom = () => {
    const mainPosts = [{
      key: 'gate',
      label: '大门口',
      gender: 'male',
      type: 'main'
    }, {
      key: 'dorm_m',
      label: '男寝',
      gender: 'any',
      type: 'main'
    }, {
      key: 'playground',
      label: '操场',
      gender: 'male',
      type: 'main'
    }, {
      key: 'dorm_f',
      label: '女寝',
      gender: 'female',
      type: 'main'
    }, {
      key: 'office',
      label: '办公室',
      gender: 'female',
      type: 'main'
    }, {
      key: 'tech',
      label: '科技楼',
      gender: 'male',
      type: 'main'
    }];
    const mainDuty = mainPosts.map(post => ({
      ...post,
      person: customAssignments?.[post.key]?.[0] || {
        name: '待分配'
      }
    }));
    const subDuty = {
      garden: customAssignments?.garden?.[0] || {
        name: '待分配'
      },
      canteenGate: customAssignments?.canteenGate?.[0] || {
        name: '待分配'
      },
      canteen: customAssignments?.canteen || [],
      toilet: customAssignments?.toilet?.[0] || customAssignments?.canteen?.[0] || {
        name: '待分配'
      },
      lunch: customAssignments?.lunch?.[0] || customAssignments?.office?.[0] || {
        name: '待分配'
      }
    };
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return {
      dateStr: `${d.getMonth() + 1}月${d.getDate()}日`,
      fullDateStr: `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`,
      weekStr: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()],
      mode,
      mainGroup: isGroupMode ? mainGroup : undefined,
      subGroup: isGroupMode ? subGroup : undefined,
      mainDuty,
      subDuty,
      assignments: {
        ...customAssignments
      }
    };
  };
  const handleUseCustom = () => {
    const hasContent = customAssignments && Object.values(customAssignments).some(arr => arr && arr.some(p => p && p.id));
    if (!hasContent) {
      showToast('请先在底部填写岗位人员');
      return;
    }
    setSchedule(buildScheduleFromCustom());
    setAfterSchoolPeople(null);
    showToast('已应用自定义排班');
  };

  // embedded 模式：只渲染内容区（无 header、无左侧自定义区域）
  if (embedded) {
    return /*#__PURE__*/React.createElement("div", {
      className: "duty-schedule-embedded"
    }, /*#__PURE__*/React.createElement("div", {
      className: "duty-schedule-toolbar"
    }, /*#__PURE__*/React.createElement("div", {
      className: "duty-schedule-toolbar-left"
    }, isGroupMode && schedule && /*#__PURE__*/React.createElement("div", {
      className: "duty-group-badge"
    }, /*#__PURE__*/React.createElement("span", {
      className: "tag tag-group-a"
    }, schedule.mainGroup, "\u7EC4"), /*#__PURE__*/React.createElement("span", {
      className: "duty-group-badge-text"
    }, "\u4E3B\u73ED"), /*#__PURE__*/React.createElement("span", {
      className: "duty-group-badge-sep"
    }, "/"), /*#__PURE__*/React.createElement("span", {
      className: "tag tag-group-b"
    }, schedule.subGroup, "\u7EC4"), /*#__PURE__*/React.createElement("span", {
      className: "duty-group-badge-text"
    }, "\u526F\u73ED"))), /*#__PURE__*/React.createElement("div", {
      className: "duty-schedule-toolbar-right"
    }, /*#__PURE__*/React.createElement("button", {
      className: "btn btn-primary",
      onClick: handleGenerate
    }, /*#__PURE__*/React.createElement("svg", {
      width: "16",
      height: "16",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      style: {
        marginRight: '4px'
      }
    }, /*#__PURE__*/React.createElement("polygon", {
      points: "5 3 19 12 5 21 5 3"
    })), "\u751F\u6210\u6392\u73ED"))), schedule ? /*#__PURE__*/React.createElement("div", {
      className: "duty-result-card"
    }, /*#__PURE__*/React.createElement("div", {
      className: "duty-result-header"
    }, /*#__PURE__*/React.createElement("div", {
      className: "duty-result-title-row"
    }, /*#__PURE__*/React.createElement("span", {
      className: "duty-result-title"
    }, "\u6392\u73ED\u7ED3\u679C"), /*#__PURE__*/React.createElement("span", {
      className: "duty-result-date"
    }, schedule.fullDateStr, " ", schedule.weekStr)), /*#__PURE__*/React.createElement("button", {
      className: "btn btn-secondary btn-sm",
      onClick: () => {
        navigator.clipboard?.writeText(renderTextFromRecord(currentRecord));
        showToast('已复制到剪贴板');
      }
    }, "\u590D\u5236\u6587\u672C")), (currentWarnings.emptyPosts.length > 0 || currentWarnings.unusedPeople.length > 0) && /*#__PURE__*/React.createElement("div", {
      className: "duty-warnings"
    }, currentWarnings.emptyPosts.length > 0 && /*#__PURE__*/React.createElement("div", null, "\u4EE5\u4E0B\u5C97\u4F4D\u65E0\u4EBA\uFF1A", /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 600
      }
    }, currentWarnings.emptyPosts.join('、'))), currentWarnings.unusedPeople.length > 0 && /*#__PURE__*/React.createElement("div", null, "\u4EE5\u4E0B\u4EBA\u5458\u672A\u53C2\u4E0E\u503C\u73ED\uFF1A", /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 600
      }
    }, currentWarnings.unusedPeople.map(p => p.name).join('、')))), /*#__PURE__*/React.createElement("div", {
      className: "duty-result-body"
    }, /*#__PURE__*/React.createElement("pre", {
      className: "duty-result-text"
    }, renderTextFromRecord(currentRecord)))) : /*#__PURE__*/React.createElement("div", {
      className: "duty-empty-card"
    }, /*#__PURE__*/React.createElement("div", {
      className: "duty-empty-icon"
    }, /*#__PURE__*/React.createElement("svg", {
      width: "36",
      height: "36",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "#9ca3af",
      strokeWidth: "1.5",
      strokeLinecap: "round",
      strokeLinejoin: "round"
    }, /*#__PURE__*/React.createElement("rect", {
      x: "3",
      y: "4",
      width: "18",
      height: "18",
      rx: "2",
      ry: "2"
    }), /*#__PURE__*/React.createElement("line", {
      x1: "16",
      y1: "2",
      x2: "16",
      y2: "6"
    }), /*#__PURE__*/React.createElement("line", {
      x1: "8",
      y1: "2",
      x2: "8",
      y2: "6"
    }), /*#__PURE__*/React.createElement("line", {
      x1: "3",
      y1: "10",
      x2: "21",
      y2: "10"
    }))), /*#__PURE__*/React.createElement("h3", {
      className: "duty-empty-title"
    }, "\u6682\u65E0\u6392\u73ED\u6570\u636E"), /*#__PURE__*/React.createElement("p", {
      className: "duty-empty-desc"
    }, "\u53EF\u5728\u5E95\u90E8\u81EA\u5B9A\u4E49\u5C97\u4F4D\u4EBA\u5458\u4F5C\u4E3A\u57FA\u51C6\uFF0C\u6216\u76F4\u63A5\u70B9\u51FB\"\u751F\u6210\u6392\u73ED\""), /*#__PURE__*/React.createElement("button", {
      className: "btn btn-primary",
      onClick: handleGenerate
    }, "\u7ACB\u5373\u751F\u6210")), modeHistory.length > 0 && /*#__PURE__*/React.createElement("div", {
      className: "duty-history-card"
    }, /*#__PURE__*/React.createElement("div", {
      className: "duty-history-header"
    }, /*#__PURE__*/React.createElement("span", {
      className: "duty-history-title"
    }, "\u5386\u53F2\u8BB0\u5F55"), /*#__PURE__*/React.createElement("span", {
      className: "duty-history-count"
    }, "\u6700\u8FD1 ", modeHistory.length, " \u6761\uFF08\u6700\u591A5\u6761\uFF09")), /*#__PURE__*/React.createElement("div", {
      className: "duty-history-list"
    }, modeHistory.map((record, idx) => /*#__PURE__*/React.createElement("div", {
      key: record.id,
      className: 'duty-history-item' + (idx < modeHistory.length - 1 ? ' border' : '')
    }, /*#__PURE__*/React.createElement("div", {
      className: "duty-history-item-main",
      onClick: () => {
        setSchedule({
          dateStr: record.dateStr,
          fullDateStr: record.fullDateStr,
          weekStr: record.weekStr,
          mainGroup: record.mainGroup,
          subGroup: record.subGroup,
          mainDuty: record.mainDuty,
          subDuty: record.subDuty
        });
        setAfterSchoolPeople(record.afterSchool);
      }
    }, /*#__PURE__*/React.createElement("span", {
      className: "duty-history-date"
    }, record.dateStr), /*#__PURE__*/React.createElement("span", {
      className: "duty-history-week"
    }, record.weekStr), record.mode === 'group' && /*#__PURE__*/React.createElement("span", {
      className: "duty-history-group"
    }, record.mainGroup, "\u7EC4\u4E3B\u73ED/", record.subGroup, "\u7EC4\u526F\u73ED"), /*#__PURE__*/React.createElement("span", {
      className: "duty-history-time"
    }, "\u751F\u6210\u4E8E ", record.createdAt)), /*#__PURE__*/React.createElement("div", {
      className: "duty-history-ops"
    }, /*#__PURE__*/React.createElement("button", {
      className: "btn btn-ghost btn-sm",
      onClick: () => handleUseRecord(record)
    }, "\u4F7F\u7528\u8BE5\u6392\u73ED"), /*#__PURE__*/React.createElement("button", {
      className: "btn btn-ghost btn-sm",
      onClick: e => {
        e.stopPropagation();
        navigator.clipboard?.writeText(renderTextFromRecord(record));
        showToast('已复制到剪贴板');
      }
    }, "\u590D\u5236"), /*#__PURE__*/React.createElement("button", {
      className: "btn btn-danger btn-sm",
      onClick: e => handleDeleteHistory(record.id, e)
    }, "\u5220\u9664")))))));
  }

  // 非 embedded 模式（独立使用，保留原有布局）
  return /*#__PURE__*/React.createElement("div", {
    className: "page-enter",
    style: {
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement("header", {
    style: {
      padding: '20px 32px',
      background: '#fff',
      borderBottom: '1px solid #e5e7eb',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '16px'
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost btn-sm",
    onClick: () => onNavigate('home'),
    style: {
      marginLeft: '-8px'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "16",
    height: "16",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M19 12H5"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 19l-7-7 7-7"
  })), "\u8FD4\u56DE\u9996\u9875"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      fontSize: '18px',
      fontWeight: 600,
      color: '#111827'
    }
  }, "\u6392\u73ED\u751F\u6210"), /*#__PURE__*/React.createElement("span", {
    style: {
      padding: '4px 10px',
      borderRadius: '6px',
      fontSize: '12px',
      fontWeight: 500,
      background: modeBg,
      color: modeColor
    }
  }, modeLabel))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '13px',
      color: '#6b7280'
    }
  }, "\u6392\u73ED\u65E5\u671F\uFF1A"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '14px',
      fontWeight: 500,
      color: '#374151',
      padding: '4px 12px',
      background: '#f3f4f6',
      borderRadius: '6px'
    }
  }, "\u660E\u5929"))), /*#__PURE__*/React.createElement("main", {
    style: {
      flex: 1,
      padding: '24px 28px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '16px',
      flexWrap: 'wrap',
      gap: '10px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      flexWrap: 'wrap'
    }
  }, isGroupMode && schedule && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 14px',
      background: '#fff',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      fontSize: '14px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "tag tag-group-a"
  }, schedule.mainGroup, "\u7EC4"), /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#374151',
      fontWeight: 500
    }
  }, "\u4E3B\u73ED"), /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#9ca3af',
      margin: '0 4px'
    }
  }, "/"), /*#__PURE__*/React.createElement("span", {
    className: "tag tag-group-b"
  }, schedule.subGroup, "\u7EC4"), /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#374151',
      fontWeight: 500
    }
  }, "\u526F\u73ED"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '10px'
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-secondary btn-sm",
    onClick: () => onNavigate('staff')
  }, "\u4EBA\u5458\u7BA1\u7406"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-primary",
    onClick: handleGenerate
  }, /*#__PURE__*/React.createElement("svg", {
    width: "16",
    height: "16",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: {
      marginRight: '4px'
    }
  }, /*#__PURE__*/React.createElement("polygon", {
    points: "5 3 19 12 5 21 5 3"
  })), "\u751F\u6210\u6392\u73ED"))), schedule ? /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#fff',
      borderRadius: '12px',
      border: '1px solid #e5e7eb',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '14px 20px',
      background: '#f8fafc',
      borderBottom: '1px solid #e5e7eb',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: '4px',
      height: '18px',
      background: modeColor,
      borderRadius: '2px'
    }
  }), /*#__PURE__*/React.createElement("h3", {
    style: {
      fontSize: '16px',
      fontWeight: 600,
      color: '#111827'
    }
  }, "\u6392\u73ED\u7ED3\u679C"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '13px',
      color: '#6b7280'
    }
  }, schedule.fullDateStr, " ", schedule.weekStr)), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-secondary btn-sm",
    onClick: () => {
      navigator.clipboard?.writeText(renderTextFromRecord(currentRecord));
      showToast('已复制到剪贴板');
    }
  }, "\u590D\u5236\u6587\u672C")), (currentWarnings.emptyPosts.length > 0 || currentWarnings.unusedPeople.length > 0) && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '12px 20px',
      background: '#fffbeb',
      borderBottom: '1px solid #fcd34d',
      fontSize: '13px',
      color: '#92400e',
      lineHeight: 1.8
    }
  }, currentWarnings.emptyPosts.length > 0 && /*#__PURE__*/React.createElement("div", null, "\u26A0\uFE0F \u4EE5\u4E0B\u5C97\u4F4D\u65E0\u4EBA\uFF1A", /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 600
    }
  }, currentWarnings.emptyPosts.join('、'))), currentWarnings.unusedPeople.length > 0 && /*#__PURE__*/React.createElement("div", null, "\u26A0\uFE0F \u4EE5\u4E0B\u4EBA\u5458\u672A\u53C2\u4E0E\u503C\u73ED\uFF1A", /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 600
    }
  }, currentWarnings.unusedPeople.map(p => p.name).join('、')))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '24px 28px'
    }
  }, /*#__PURE__*/React.createElement("pre", {
    style: {
      margin: 0,
      fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
      fontSize: '15px',
      lineHeight: 2,
      color: '#1f2937',
      whiteSpace: 'pre-wrap'
    }
  }, renderTextFromRecord(currentRecord)))) : /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#fff',
      borderRadius: '12px',
      border: '1px dashed #d1d5db',
      padding: '60px 20px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '14px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: '72px',
      height: '72px',
      borderRadius: '50%',
      background: '#f3f4f6',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "36",
    height: "36",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "#9ca3af",
    strokeWidth: "1.5",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "3",
    y: "4",
    width: "18",
    height: "18",
    rx: "2",
    ry: "2"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "16",
    y1: "2",
    x2: "16",
    y2: "6"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "8",
    y1: "2",
    x2: "8",
    y2: "6"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "3",
    y1: "10",
    x2: "21",
    y2: "10"
  }))), /*#__PURE__*/React.createElement("h3", {
    style: {
      fontSize: '16px',
      fontWeight: 500,
      color: '#374151'
    }
  }, "\u6682\u65E0\u6392\u73ED\u6570\u636E"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: '13px',
      color: '#9ca3af',
      textAlign: 'center',
      maxWidth: '300px',
      lineHeight: 1.6
    }
  }, "\u53EF\u5728\u5DE6\u4FA7\u81EA\u5B9A\u4E49\u5C97\u4F4D\u4EBA\u5458\u4F5C\u4E3A\u57FA\u51C6\uFF0C\u6216\u76F4\u63A5\u70B9\u51FB\"\u751F\u6210\u6392\u73ED\""), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-primary",
    onClick: handleGenerate
  }, "\u7ACB\u5373\u751F\u6210")), modeHistory.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: '20px',
      background: '#fff',
      borderRadius: '12px',
      border: '1px solid #e5e7eb',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '14px 20px',
      background: '#f8fafc',
      borderBottom: '1px solid #e5e7eb'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: '4px',
      height: '18px',
      background: '#6b7280',
      borderRadius: '2px'
    }
  }), /*#__PURE__*/React.createElement("h3", {
    style: {
      fontSize: '16px',
      fontWeight: 600,
      color: '#111827'
    }
  }, "\u5386\u53F2\u8BB0\u5F55"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '13px',
      color: '#9ca3af'
    }
  }, "\u6700\u8FD1 ", modeHistory.length, " \u6761\uFF08\u6700\u591A5\u6761\uFF09"))), /*#__PURE__*/React.createElement("div", null, modeHistory.map((record, idx) => /*#__PURE__*/React.createElement("div", {
    key: record.id,
    style: {
      borderBottom: idx < modeHistory.length - 1 ? '1px solid #f3f4f6' : 'none'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '12px 20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '10px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      cursor: 'pointer',
      flex: 1,
      minWidth: 0
    },
    onClick: () => {
      setSchedule({
        dateStr: record.dateStr,
        fullDateStr: record.fullDateStr,
        weekStr: record.weekStr,
        mainGroup: record.mainGroup,
        subGroup: record.subGroup,
        mainDuty: record.mainDuty,
        subDuty: record.subDuty
      });
      setAfterSchoolPeople(record.afterSchool);
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '13px',
      fontWeight: 600,
      color: '#374151',
      minWidth: '70px'
    }
  }, record.dateStr), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '12px',
      color: '#9ca3af'
    }
  }, record.weekStr), record.mode === 'group' && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '12px',
      color: '#6b7280'
    }
  }, record.mainGroup, "\u7EC4\u4E3B\u73ED/", record.subGroup, "\u7EC4\u526F\u73ED"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '11px',
      color: '#d1d5db'
    }
  }, "\u751F\u6210\u4E8E ", record.createdAt)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '6px',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost btn-sm",
    style: {
      fontSize: '12px',
      padding: '4px 10px'
    },
    onClick: () => handleUseRecord(record)
  }, "\u4F7F\u7528\u8BE5\u6392\u73ED"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost btn-sm",
    style: {
      fontSize: '12px',
      padding: '4px 10px'
    },
    onClick: e => {
      e.stopPropagation();
      navigator.clipboard?.writeText(renderTextFromRecord(record));
      showToast('已复制到剪贴板');
    }
  }, "\u590D\u5236"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-danger btn-sm",
    style: {
      fontSize: '12px',
      padding: '4px 10px'
    },
    onClick: e => handleDeleteHistory(record.id, e)
  }, "\u5220\u9664")))))))), localToast && /*#__PURE__*/React.createElement("div", {
    className: "toast"
  }, localToast));
}
Object.assign(window, {
  SchedulePage
});

// --- GatePage.jsx ---
function GatePage({
  onNavigate,
  embedded
}) {
  const {
    generateGateDuty,
    advanceGatePointer,
    staff,
    ROLE_LABELS
  } = useStore();
  // 下午时间段（默认显示）
  const [startTime, setStartTime] = React.useState('14:00');
  const [endTime, setEndTime] = React.useState('18:00');
  const [shifts, setShifts] = React.useState(4);
  // 上午时间段（默认隐藏，点击添加后显示）
  const [startTime2, setStartTime2] = React.useState('08:00');
  const [endTime2, setEndTime2] = React.useState('12:00');
  const [shifts2, setShifts2] = React.useState(4);
  const [enableSecond, setEnableSecond] = React.useState(false);
  const [dayOffset, setDayOffset] = React.useState(1);
  const [result, setResult] = React.useState(null);
  const [toast, setToast] = React.useState(null);
  const [history, setHistory] = React.useState(() => {
    try {
      const saved = localStorage.getItem('duty_gate_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  React.useEffect(() => {
    try {
      localStorage.setItem('duty_gate_history', JSON.stringify(history));
    } catch {}
  }, [history]);
  const showToast = msg => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  // 计算提醒：岗位空缺和未参与人员
  const computeWarnings = r => {
    if (!r) return {
      emptySlots: [],
      unusedPeople: []
    };
    const emptySlots = [];
    const assignedIds = new Set();
    const allShifts = [...r.shiftList, ...(r.shiftList2 || [])];
    allShifts.forEach((s, i) => {
      s.people.forEach((p, j) => {
        if (p.name === '待分配' || !p.id) {
          emptySlots.push(`${s.start}-${s.end}第${j + 1}人`);
        } else {
          assignedIds.add(p.id);
        }
      });
    });
    const normalMales = staff.filter(p => p.gender === 'male' && p.role !== 'captain' && p.role !== 'vice_captain' && p.name && p.name.trim());
    const unusedPeople = normalMales.filter(p => !assignedIds.has(p.id));
    return {
      emptySlots: [...new Set(emptySlots)],
      unusedPeople
    };
  };
  const handleGenerate = () => {
    const maleCount = staff.filter(p => p.gender === 'male').length;
    if (maleCount === 0) {
      showToast('暂无男生人员，请先在人员管理中添加');
      return;
    }
    if (!startTime || !endTime) {
      showToast('请填写下午时间段的起止时间');
      return;
    }
    if (shifts < 1) {
      showToast('下午班次数量至少为 1');
      return;
    }
    if (enableSecond && (!startTime2 || !endTime2)) {
      showToast('请填写上午时间段的起止时间');
      return;
    }
    if (enableSecond && shifts2 < 1) {
      showToast('上午班次数量至少为 1');
      return;
    }

    // 生成时间段1
    const r1 = generateGateDuty(startTime, endTime, shifts, dayOffset);
    advanceGatePointer(r1.nextPointer);
    let r2 = null;
    if (enableSecond) {
      // 生成时间段2（指针已前进）
      r2 = generateGateDuty(startTime2, endTime2, shifts2, dayOffset);
      advanceGatePointer(r2.nextPointer);
    }
    const record = {
      id: Date.now(),
      dateStr: r1.dateStr,
      weekStr: r1.weekStr,
      startTime,
      endTime,
      shifts,
      startTime2: enableSecond ? startTime2 : null,
      endTime2: enableSecond ? endTime2 : null,
      shifts2: enableSecond ? shifts2 : null,
      enableSecond,
      shiftList: r1.shiftList,
      shiftList2: r2 ? r2.shiftList : null,
      usedCaptains: r1.usedCaptains,
      usedCaptains2: r2 ? r2.usedCaptains : null,
      createdAt: new Date().toLocaleString('zh-CN')
    };
    setResult(record);
    setHistory(prev => [record, ...prev].slice(0, 5));
    const warnings = computeWarnings(record);
    if (warnings.emptySlots.length > 0 || warnings.unusedPeople.length > 0) {
      let msg = '';
      if (warnings.emptySlots.length > 0) msg += `有空缺时段 `;
      if (warnings.unusedPeople.length > 0) msg += `未参与:${warnings.unusedPeople.map(p => p.name).join('、')}`;
      showToast(msg || '排班已生成');
    } else {
      showToast('排班已生成');
    }
  };
  const renderTextFromRecord = r => {
    if (!r) return '';
    const lines = [];
    lines.push(`${r.dateStr}大门口值班`);
    lines.push('');
    if (r.shiftList2 && r.shiftList2.length > 0) {
      lines.push('【上午】');
      r.shiftList2.forEach(s => {
        const names = s.people.map(p => p?.name || '待分配').join('  ');
        lines.push(`${s.start}——${s.end}  ${names}`);
      });
      lines.push('');
    }
    lines.push('【下午】');
    r.shiftList.forEach(s => {
      const names = s.people.map(p => p?.name || '待分配').join('  ');
      lines.push(`${s.start}——${s.end}  ${names}`);
    });
    lines.push('');
    if (r.shiftList2 && r.shiftList2.length > 0) {
      lines.push('上午值班教官准时到岗，其他教官13:40前到校打卡，路上注意安全！');
    } else {
      lines.push('所有教官13:40前到校打卡，路上注意安全！');
    }
    return lines.join('\n');
  };
  const handleDeleteHistory = (id, e) => {
    e.stopPropagation();
    setHistory(prev => prev.filter(h => h.id !== id));
    showToast('已删除该条记录');
  };
  const currentWarnings = result ? computeWarnings(result) : {
    emptySlots: [],
    unusedPeople: []
  };
  const maleCount = staff.filter(p => p.gender === 'male').length;
  const totalNeeded = shifts * 2 + (enableSecond ? shifts2 * 2 : 0);
  const timeInputStyle = {
    width: '90px',
    padding: '8px 10px',
    border: '1px solid rgba(60,80,120,.2)',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    background: '#fff',
    color: '#2a3a55',
    textAlign: 'center'
  };

  // embedded 模式：左右并列布局
  if (embedded) {
    return /*#__PURE__*/React.createElement("div", {
      className: "duty-gate-embedded"
    }, /*#__PURE__*/React.createElement("div", {
      className: "duty-gate-row"
    }, /*#__PURE__*/React.createElement("div", {
      className: "duty-gate-params"
    }, /*#__PURE__*/React.createElement("div", {
      className: "duty-gate-params-header"
    }, /*#__PURE__*/React.createElement("span", {
      className: "duty-gate-params-title"
    }, "\u6392\u73ED\u53C2\u6570")), /*#__PURE__*/React.createElement("div", {
      className: "duty-gate-params-body"
    }, /*#__PURE__*/React.createElement("div", {
      className: "duty-gate-timeblock"
    }, /*#__PURE__*/React.createElement("div", {
      className: "duty-gate-timeblock-title"
    }, "\u4E0B\u5348"), /*#__PURE__*/React.createElement("div", {
      className: "duty-gate-timeblock-grid"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
      className: "duty-gate-label"
    }, "\u5F00\u59CB\u65F6\u95F4"), /*#__PURE__*/React.createElement("input", {
      type: "time",
      value: startTime,
      onChange: e => {
        setStartTime(e.target.value);
        setResult(null);
      },
      style: timeInputStyle
    })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
      className: "duty-gate-label"
    }, "\u7ED3\u675F\u65F6\u95F4"), /*#__PURE__*/React.createElement("input", {
      type: "time",
      value: endTime,
      onChange: e => {
        setEndTime(e.target.value);
        setResult(null);
      },
      style: timeInputStyle
    })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
      className: "duty-gate-label"
    }, "\u5206\u51E0\u73ED"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }
    }, /*#__PURE__*/React.createElement("input", {
      type: "number",
      min: "1",
      max: "12",
      value: shifts,
      onChange: e => {
        const v = Math.max(1, Math.min(12, parseInt(e.target.value) || 1));
        setShifts(v);
        setResult(null);
      },
      style: {
        ...timeInputStyle,
        width: '80px',
        textAlign: 'center'
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: '13px',
        color: '#7a8aa5'
      }
    }, "\u73ED"))))), !enableSecond && /*#__PURE__*/React.createElement("button", {
      className: "btn btn-secondary btn-sm",
      style: {
        width: '100%'
      },
      onClick: () => {
        setEnableSecond(true);
        setResult(null);
      }
    }, "+ \u6DFB\u52A0\u4E0A\u5348\u503C\u73ED"), enableSecond && /*#__PURE__*/React.createElement("div", {
      className: "duty-gate-timeblock"
    }, /*#__PURE__*/React.createElement("div", {
      className: "duty-gate-timeblock-title",
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }
    }, /*#__PURE__*/React.createElement("span", null, "\u4E0A\u5348"), /*#__PURE__*/React.createElement("button", {
      className: "btn btn-ghost btn-sm",
      style: {
        padding: '2px 8px',
        fontSize: '12px'
      },
      onClick: () => {
        setEnableSecond(false);
        setResult(null);
      }
    }, "\u79FB\u9664")), /*#__PURE__*/React.createElement("div", {
      className: "duty-gate-timeblock-grid"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
      className: "duty-gate-label"
    }, "\u5F00\u59CB\u65F6\u95F4"), /*#__PURE__*/React.createElement("input", {
      type: "time",
      value: startTime2,
      onChange: e => {
        setStartTime2(e.target.value);
        setResult(null);
      },
      style: timeInputStyle
    })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
      className: "duty-gate-label"
    }, "\u7ED3\u675F\u65F6\u95F4"), /*#__PURE__*/React.createElement("input", {
      type: "time",
      value: endTime2,
      onChange: e => {
        setEndTime2(e.target.value);
        setResult(null);
      },
      style: timeInputStyle
    })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
      className: "duty-gate-label"
    }, "\u5206\u51E0\u73ED"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }
    }, /*#__PURE__*/React.createElement("input", {
      type: "number",
      min: "1",
      max: "12",
      value: shifts2,
      onChange: e => {
        const v = Math.max(1, Math.min(12, parseInt(e.target.value) || 1));
        setShifts2(v);
        setResult(null);
      },
      style: {
        ...timeInputStyle,
        width: '80px',
        textAlign: 'center'
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: '13px',
        color: '#7a8aa5'
      }
    }, "\u73ED"))))), /*#__PURE__*/React.createElement("div", {
      className: "duty-gate-params-info"
    }, "\u73B0\u6709\u7537\u751F ", /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 600,
        color: '#2a3a55'
      }
    }, maleCount), " \u4EBA\uFF0C \u9700 ", /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 600,
        color: '#2a3a55'
      }
    }, totalNeeded), " \u4EBA\u6B21", maleCount < totalNeeded && /*#__PURE__*/React.createElement("span", {
      style: {
        color: '#ea580c',
        marginLeft: '6px'
      }
    }, "\uFF08\u4E0D\u8DB3\uFF0C\u5C06\u7531\u526F\u961F\u957F/\u961F\u957F\u8865\u8DB3\uFF09")), /*#__PURE__*/React.createElement("button", {
      className: "btn btn-primary",
      style: {
        width: '100%'
      },
      onClick: handleGenerate
    }, "\u751F\u6210\u6392\u73ED"))), /*#__PURE__*/React.createElement("div", {
      className: "duty-gate-result"
    }, result ? /*#__PURE__*/React.createElement("div", {
      className: "duty-result-card"
    }, /*#__PURE__*/React.createElement("div", {
      className: "duty-result-header"
    }, /*#__PURE__*/React.createElement("div", {
      className: "duty-result-title-row"
    }, /*#__PURE__*/React.createElement("span", {
      className: "duty-result-title"
    }, "\u6392\u73ED\u7ED3\u679C"), /*#__PURE__*/React.createElement("span", {
      className: "duty-result-date"
    }, result.dateStr, " ", result.weekStr)), /*#__PURE__*/React.createElement("button", {
      className: "btn btn-secondary btn-sm",
      onClick: () => {
        navigator.clipboard?.writeText(renderTextFromRecord(result));
        showToast('已复制到剪贴板');
      }
    }, "\u590D\u5236\u6587\u672C")), (currentWarnings.emptySlots.length > 0 || currentWarnings.unusedPeople.length > 0) && /*#__PURE__*/React.createElement("div", {
      className: "duty-warnings"
    }, currentWarnings.emptySlots.length > 0 && /*#__PURE__*/React.createElement("div", null, "\u4EE5\u4E0B\u65F6\u6BB5\u6709\u7A7A\u7F3A\uFF1A", /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 600
      }
    }, currentWarnings.emptySlots.join('、'))), currentWarnings.unusedPeople.length > 0 && /*#__PURE__*/React.createElement("div", null, "\u4EE5\u4E0B\u7537\u751F\u672A\u53C2\u4E0E\u503C\u73ED\uFF1A", /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 600
      }
    }, currentWarnings.unusedPeople.map(p => p.name).join('、')))), /*#__PURE__*/React.createElement("div", {
      className: "duty-result-body"
    }, /*#__PURE__*/React.createElement("pre", {
      className: "duty-result-text"
    }, renderTextFromRecord(result)), result.usedCaptains && result.usedCaptains.length > 0 || result.usedCaptains2 && result.usedCaptains2.length > 0 ? /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: '16px',
        padding: '10px 14px',
        background: 'rgba(245,158,11,.08)',
        border: '1px solid rgba(245,158,11,.2)',
        borderRadius: '8px',
        fontSize: '13px',
        color: '#92400e'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 500
      }
    }, "\u63D0\u793A\uFF1A"), "\u7537\u751F\u4EBA\u6570\u4E0D\u8DB3\uFF0C\u4EE5\u4E0B\u5E72\u90E8\u53C2\u4E0E\u4E86\u503C\u73ED\uFF1A", [...(result.usedCaptains || []), ...(result.usedCaptains2 || [])].map((p, i) => /*#__PURE__*/React.createElement("span", {
      key: i,
      style: {
        margin: '0 4px'
      }
    }, p.name, "\uFF08", ROLE_LABELS[p.role], "\uFF09"))) : null)) : /*#__PURE__*/React.createElement("div", {
      className: "duty-empty-card"
    }, /*#__PURE__*/React.createElement("div", {
      className: "duty-empty-icon"
    }, /*#__PURE__*/React.createElement("svg", {
      width: "36",
      height: "36",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "#9ca3af",
      strokeWidth: "1.5",
      strokeLinecap: "round",
      strokeLinejoin: "round"
    }, /*#__PURE__*/React.createElement("circle", {
      cx: "12",
      cy: "12",
      r: "10"
    }), /*#__PURE__*/React.createElement("polyline", {
      points: "12 6 12 12 16 14"
    }))), /*#__PURE__*/React.createElement("h3", {
      className: "duty-empty-title"
    }, "\u6682\u65E0\u6392\u73ED"), /*#__PURE__*/React.createElement("p", {
      className: "duty-empty-desc"
    }, "\u8BBE\u7F6E\u597D\u8D77\u6B62\u65F6\u95F4\u548C\u73ED\u6B21\u6570\u91CF\u540E\uFF0C\u70B9\u51FB\"\u751F\u6210\u6392\u73ED\""), /*#__PURE__*/React.createElement("button", {
      className: "btn btn-primary",
      onClick: handleGenerate
    }, "\u7ACB\u5373\u751F\u6210")), history.length > 0 && /*#__PURE__*/React.createElement("div", {
      className: "duty-history-card",
      style: {
        marginTop: '16px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "duty-history-header"
    }, /*#__PURE__*/React.createElement("span", {
      className: "duty-history-title"
    }, "\u5386\u53F2\u8BB0\u5F55"), /*#__PURE__*/React.createElement("span", {
      className: "duty-history-count"
    }, "\u6700\u8FD1 ", history.length, " \u6761\uFF08\u6700\u591A5\u6761\uFF09")), /*#__PURE__*/React.createElement("div", {
      className: "duty-history-list"
    }, history.map((record, idx) => /*#__PURE__*/React.createElement("div", {
      key: record.id,
      className: 'duty-history-item' + (idx < history.length - 1 ? ' border' : '')
    }, /*#__PURE__*/React.createElement("div", {
      className: "duty-history-item-main",
      onClick: () => setResult({
        ...record
      })
    }, /*#__PURE__*/React.createElement("span", {
      className: "duty-history-date"
    }, record.dateStr), /*#__PURE__*/React.createElement("span", {
      className: "duty-history-week"
    }, record.weekStr), /*#__PURE__*/React.createElement("span", {
      className: "duty-history-group"
    }, record.startTime, "-", record.endTime, " ", record.shifts, "\u73ED", record.enableSecond ? ' + 时段2' : ''), /*#__PURE__*/React.createElement("span", {
      className: "duty-history-time"
    }, "\u751F\u6210\u4E8E ", record.createdAt)), /*#__PURE__*/React.createElement("div", {
      className: "duty-history-ops"
    }, /*#__PURE__*/React.createElement("button", {
      className: "btn btn-ghost btn-sm",
      onClick: e => {
        e.stopPropagation();
        navigator.clipboard?.writeText(renderTextFromRecord(record));
        showToast('已复制到剪贴板');
      }
    }, "\u590D\u5236"), /*#__PURE__*/React.createElement("button", {
      className: "btn btn-danger btn-sm",
      onClick: e => handleDeleteHistory(record.id, e)
    }, "\u5220\u9664")))))))), toast && /*#__PURE__*/React.createElement("div", {
      className: "toast"
    }, toast));
  }

  // 非 embedded 模式（独立使用）
  return /*#__PURE__*/React.createElement("div", {
    className: "page-enter",
    style: {
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement("header", {
    style: {
      padding: '20px 32px',
      background: '#fff',
      borderBottom: '1px solid #e5e7eb',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '16px'
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost btn-sm",
    onClick: () => onNavigate('home'),
    style: {
      marginLeft: '-8px'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "16",
    height: "16",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M19 12H5"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 19l-7-7 7-7"
  })), "\u8FD4\u56DE\u9996\u9875"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      fontSize: '18px',
      fontWeight: 600,
      color: '#111827'
    }
  }, "\u5927\u95E8\u53E3\u503C\u73ED"), /*#__PURE__*/React.createElement("span", {
    style: {
      padding: '4px 10px',
      borderRadius: '6px',
      fontSize: '12px',
      fontWeight: 500,
      background: '#fff7ed',
      color: '#ea580c'
    }
  }, "\u65F6\u6BB5\u6392\u73ED"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '13px',
      color: '#6b7280'
    }
  }, "\u6392\u73ED\u65E5\u671F\uFF1A"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '14px',
      fontWeight: 500,
      color: '#374151',
      padding: '4px 12px',
      background: '#f3f4f6',
      borderRadius: '6px'
    }
  }, "\u660E\u5929"))), /*#__PURE__*/React.createElement("main", {
    style: {
      flex: 1,
      padding: '28px 32px',
      maxWidth: '1200px',
      margin: '0 auto',
      width: '100%'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '20px',
      alignItems: 'flex-start'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: '360px',
      flexShrink: 0,
      background: '#fff',
      borderRadius: '12px',
      border: '1px solid #e5e7eb',
      padding: '20px'
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      fontSize: '15px',
      fontWeight: 600,
      color: '#111827',
      marginBottom: '16px'
    }
  }, "\u6392\u73ED\u53C2\u6570"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: '16px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '13px',
      fontWeight: 600,
      color: '#374151',
      marginBottom: '10px'
    }
  }, "\u4E0B\u5348"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '12px',
      marginBottom: '10px'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: {
      fontSize: '12px',
      color: '#6b7280',
      marginBottom: '4px',
      display: 'block'
    }
  }, "\u5F00\u59CB\u65F6\u95F4"), /*#__PURE__*/React.createElement("input", {
    type: "time",
    value: startTime,
    onChange: e => {
      setStartTime(e.target.value);
      setResult(null);
    },
    style: timeInputStyle
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: {
      fontSize: '12px',
      color: '#6b7280',
      marginBottom: '4px',
      display: 'block'
    }
  }, "\u7ED3\u675F\u65F6\u95F4"), /*#__PURE__*/React.createElement("input", {
    type: "time",
    value: endTime,
    onChange: e => {
      setEndTime(e.target.value);
      setResult(null);
    },
    style: timeInputStyle
  }))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: {
      fontSize: '12px',
      color: '#6b7280',
      marginBottom: '4px',
      display: 'block'
    }
  }, "\u5206\u51E0\u73ED"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "number",
    min: "1",
    max: "12",
    value: shifts,
    onChange: e => {
      const v = Math.max(1, Math.min(12, parseInt(e.target.value) || 1));
      setShifts(v);
      setResult(null);
    },
    style: {
      ...timeInputStyle,
      width: '80px',
      textAlign: 'center'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '13px',
      color: '#6b7280'
    }
  }, "\u73ED")))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: '16px',
      padding: '10px',
      background: '#f9fafb',
      borderRadius: '8px'
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      cursor: 'pointer',
      fontSize: '13px',
      color: '#374151',
      fontWeight: 500
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: enableSecond,
    onChange: e => {
      setEnableSecond(e.target.checked);
      setResult(null);
    }
  }), "\u542F\u7528\u4E0A\u5348\u503C\u73ED")), enableSecond && /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: '16px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '13px',
      fontWeight: 600,
      color: '#374151',
      marginBottom: '10px'
    }
  }, "\u4E0A\u5348"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '12px',
      marginBottom: '10px'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: {
      fontSize: '12px',
      color: '#6b7280',
      marginBottom: '4px',
      display: 'block'
    }
  }, "\u5F00\u59CB\u65F6\u95F4"), /*#__PURE__*/React.createElement("input", {
    type: "time",
    value: startTime2,
    onChange: e => {
      setStartTime2(e.target.value);
      setResult(null);
    },
    style: timeInputStyle
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: {
      fontSize: '12px',
      color: '#6b7280',
      marginBottom: '4px',
      display: 'block'
    }
  }, "\u7ED3\u675F\u65F6\u95F4"), /*#__PURE__*/React.createElement("input", {
    type: "time",
    value: endTime2,
    onChange: e => {
      setEndTime2(e.target.value);
      setResult(null);
    },
    style: timeInputStyle
  }))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: {
      fontSize: '12px',
      color: '#6b7280',
      marginBottom: '4px',
      display: 'block'
    }
  }, "\u5206\u51E0\u73ED"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "number",
    min: "1",
    max: "12",
    value: shifts2,
    onChange: e => {
      const v = Math.max(1, Math.min(12, parseInt(e.target.value) || 1));
      setShifts2(v);
      setResult(null);
    },
    style: {
      ...timeInputStyle,
      width: '80px',
      textAlign: 'center'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '13px',
      color: '#6b7280'
    }
  }, "\u73ED")))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '13px',
      color: '#6b7280',
      marginBottom: '16px'
    }
  }, "\u73B0\u6709\u7537\u751F ", /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 600,
      color: '#374151'
    }
  }, maleCount), " \u4EBA\uFF0C \u9700 ", /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 600,
      color: '#374151'
    }
  }, totalNeeded), " \u4EBA\u6B21"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-primary",
    style: {
      width: '100%'
    },
    onClick: handleGenerate
  }, "\u751F\u6210\u6392\u73ED")), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, result ? /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#fff',
      borderRadius: '12px',
      border: '1px solid #e5e7eb',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '14px 20px',
      background: '#f8fafc',
      borderBottom: '1px solid #e5e7eb',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: '4px',
      height: '18px',
      background: '#ea580c',
      borderRadius: '2px'
    }
  }), /*#__PURE__*/React.createElement("h3", {
    style: {
      fontSize: '16px',
      fontWeight: 600,
      color: '#111827'
    }
  }, "\u6392\u73ED\u7ED3\u679C"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '13px',
      color: '#6b7280'
    }
  }, result.dateStr, " ", result.weekStr)), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-secondary btn-sm",
    onClick: () => {
      navigator.clipboard?.writeText(renderTextFromRecord(result));
      showToast('已复制到剪贴板');
    }
  }, "\u590D\u5236\u6587\u672C")), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '24px 28px'
    }
  }, /*#__PURE__*/React.createElement("pre", {
    style: {
      margin: 0,
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
      fontSize: '15px',
      lineHeight: 2.2,
      color: '#1f2937',
      whiteSpace: 'pre-wrap'
    }
  }, renderTextFromRecord(result)))) : /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#fff',
      borderRadius: '12px',
      border: '1px dashed #d1d5db',
      padding: '60px 20px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '14px'
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      fontSize: '16px',
      fontWeight: 500,
      color: '#374151'
    }
  }, "\u6682\u65E0\u6392\u73ED"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: '13px',
      color: '#9ca3af',
      textAlign: 'center',
      maxWidth: '300px',
      lineHeight: 1.6
    }
  }, "\u8BBE\u7F6E\u597D\u8D77\u6B62\u65F6\u95F4\u548C\u73ED\u6B21\u6570\u91CF\u540E\uFF0C\u70B9\u51FB\"\u751F\u6210\u6392\u73ED\""), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-primary",
    onClick: handleGenerate
  }, "\u7ACB\u5373\u751F\u6210"))))), toast && /*#__PURE__*/React.createElement("div", {
    className: "toast"
  }, toast));
}
Object.assign(window, {
  GatePage
});

// --- DutySelectPage.jsx ---
function DutySelectPage({
  onNavigate
}) {
  const cardStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '14px',
    padding: '40px 24px',
    borderRadius: '16px',
    background: '#fff',
    border: '2px solid #e5e7eb',
    cursor: 'pointer',
    transition: 'all .2s ease'
  };
  const iconStyle = {
    width: '56px',
    height: '56px',
    borderRadius: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  };
  const cards = [{
    key: 'all',
    title: '全员模式',
    desc: '从所有人员中安排\n主班与副班各6人',
    color: '#2563eb',
    bg: '#eff6ff',
    icon: /*#__PURE__*/React.createElement("svg", {
      width: "28",
      height: "28",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "#2563eb",
      strokeWidth: "2",
      strokeLinecap: "round",
      strokeLinejoin: "round"
    }, /*#__PURE__*/React.createElement("path", {
      d: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "9",
      cy: "7",
      r: "4"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M23 21v-2a4 4 0 0 0-3-3.87"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M16 3.13a4 4 0 0 1 0 7.75"
    })),
    onClick: () => onNavigate('schedule', {
      mode: 'all'
    })
  }, {
    key: 'group',
    title: '分组模式',
    desc: 'A / B 两组轮值\n每日交替主副班',
    color: '#059669',
    bg: '#ecfdf5',
    icon: /*#__PURE__*/React.createElement("svg", {
      width: "28",
      height: "28",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "#059669",
      strokeWidth: "2",
      strokeLinecap: "round",
      strokeLinejoin: "round"
    }, /*#__PURE__*/React.createElement("rect", {
      x: "3",
      y: "3",
      width: "7",
      height: "7",
      rx: "1"
    }), /*#__PURE__*/React.createElement("rect", {
      x: "14",
      y: "3",
      width: "7",
      height: "7",
      rx: "1"
    }), /*#__PURE__*/React.createElement("rect", {
      x: "3",
      y: "14",
      width: "7",
      height: "7",
      rx: "1"
    }), /*#__PURE__*/React.createElement("rect", {
      x: "14",
      y: "14",
      width: "7",
      height: "7",
      rx: "1"
    })),
    onClick: () => onNavigate('schedule', {
      mode: 'group'
    })
  }, {
    key: 'gate',
    title: '大门口值班',
    desc: '自定义时间段与班次\n男生按顺序轮换',
    color: '#ea580c',
    bg: '#fff7ed',
    icon: /*#__PURE__*/React.createElement("svg", {
      width: "28",
      height: "28",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "#ea580c",
      strokeWidth: "2",
      strokeLinecap: "round",
      strokeLinejoin: "round"
    }, /*#__PURE__*/React.createElement("path", {
      d: "M3 21h18"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M5 21V7l7-4 7 4v14"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M9 21v-6h6v6"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M12 11v2"
    })),
    onClick: () => onNavigate('gate')
  }];
  return /*#__PURE__*/React.createElement("div", {
    className: "page-enter",
    style: {
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement("header", {
    style: {
      padding: '20px 32px',
      background: '#fff',
      borderBottom: '1px solid #e5e7eb',
      display: 'flex',
      alignItems: 'center',
      gap: '16px'
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost btn-sm",
    onClick: () => onNavigate('home'),
    style: {
      marginLeft: '-8px'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "16",
    height: "16",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M19 12H5"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 19l-7-7 7-7"
  })), "\u8FD4\u56DE\u9996\u9875"), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontSize: '18px',
      fontWeight: 600,
      color: '#111827'
    }
  }, "\u503C\u73ED\u6392\u73ED")), /*#__PURE__*/React.createElement("main", {
    style: {
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '60px 40px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '20px',
      maxWidth: '900px',
      width: '100%'
    }
  }, cards.map(card => /*#__PURE__*/React.createElement("div", {
    key: card.key,
    style: cardStyle,
    onClick: card.onClick,
    onMouseEnter: e => {
      e.currentTarget.style.borderColor = card.color;
      e.currentTarget.style.transform = 'translateY(-4px)';
      e.currentTarget.style.boxShadow = `0 12px 24px ${card.color}20`;
    },
    onMouseLeave: e => {
      e.currentTarget.style.borderColor = '#e5e7eb';
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = 'none';
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      ...iconStyle,
      background: card.bg
    }
  }, card.icon), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontSize: '18px',
      fontWeight: 600,
      color: '#111827'
    }
  }, card.title), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: '12px',
      color: '#6b7280',
      textAlign: 'center',
      lineHeight: 1.6,
      whiteSpace: 'pre-line'
    }
  }, card.desc), /*#__PURE__*/React.createElement("span", {
    style: {
      marginTop: '4px',
      fontSize: '13px',
      color: card.color,
      fontWeight: 500
    }
  }, "\u8FDB\u5165 \u2192"))))));
}
Object.assign(window, {
  DutySelectPage
});

// --- DutyMainPage.jsx ---
function DutyMainPage({
  onNavigate
}) {
  const {
    staff,
    groupRotation
  } = useStore();
  const [mode, setModeState] = React.useState('all');
  const [customAssignments, setCustomAssignments] = React.useState({});
  const [externalSchedule, setExternalSchedule] = React.useState(null);
  const [toast, setToast] = React.useState(null);
  const setMode = m => {
    setModeState(m);
  };
  const showToast = msg => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };
  const activeStaff = staff.filter(p => p.role !== 'captain' && p.role !== 'vice_captain');
  const isAMain = groupRotation === 0;
  const mainGroup = isAMain ? 'A' : 'B';
  const subGroup = isAMain ? 'B' : 'A';
  const CUSTOM_POSTS = [{
    key: 'gate',
    label: '大门口',
    gender: 'male',
    type: 'main',
    capacity: 1
  }, {
    key: 'garden',
    label: '花园口',
    gender: 'any',
    type: 'sub',
    capacity: 1
  }, {
    key: 'dorm_m',
    label: '男寝',
    gender: 'any',
    type: 'main',
    capacity: 1
  }, {
    key: 'playground',
    label: '操场',
    gender: 'male',
    type: 'main',
    capacity: 1
  }, {
    key: 'canteen',
    label: '餐厅',
    gender: 'any',
    type: 'sub',
    capacity: 4
  }, {
    key: 'canteenGate',
    label: '餐厅口',
    gender: 'any',
    type: 'sub',
    capacity: 1
  }, {
    key: 'dorm_f',
    label: '女寝',
    gender: 'female',
    type: 'main',
    capacity: 1
  }, {
    key: 'office',
    label: '办公室',
    gender: 'female',
    type: 'main',
    capacity: 1
  }, {
    key: 'tech',
    label: '科技楼',
    gender: 'male',
    type: 'main',
    capacity: 1
  }];
  const getPeopleForPost = post => {
    return activeStaff.filter(p => post.gender === 'any' || p.gender === post.gender);
  };
  const updateCustomPost = (postKey, personId, index = 0) => {
    setCustomAssignments(prev => {
      const next = {
        ...prev
      };
      if (!next[postKey]) next[postKey] = [];
      const person = activeStaff.find(p => p.id === personId);
      next[postKey][index] = person || {
        name: '待分配'
      };
      return next;
    });
  };
  const getCustomPerson = (postKey, index = 0) => {
    const arr = customAssignments[postKey];
    return arr && arr[index] ? arr[index] : null;
  };

  // 使用自定义排班（从底部按钮触发）
  const handleUseCustom = () => {
    const hasContent = Object.values(customAssignments).some(arr => arr && arr.some(p => p && p.id));
    if (!hasContent) {
      showToast('请先填写岗位人员');
      return;
    }
    const mainPosts = [{
      key: 'gate',
      label: '大门口',
      gender: 'male',
      type: 'main'
    }, {
      key: 'dorm_m',
      label: '男寝',
      gender: 'any',
      type: 'main'
    }, {
      key: 'playground',
      label: '操场',
      gender: 'male',
      type: 'main'
    }, {
      key: 'dorm_f',
      label: '女寝',
      gender: 'female',
      type: 'main'
    }, {
      key: 'office',
      label: '办公室',
      gender: 'female',
      type: 'main'
    }, {
      key: 'tech',
      label: '科技楼',
      gender: 'male',
      type: 'main'
    }];
    const mainDuty = mainPosts.map(post => ({
      ...post,
      person: customAssignments[post.key]?.[0] || {
        name: '待分配'
      }
    }));
    const subDuty = {
      garden: customAssignments.garden?.[0] || {
        name: '待分配'
      },
      canteenGate: customAssignments.canteenGate?.[0] || {
        name: '待分配'
      },
      canteen: customAssignments.canteen || [],
      toilet: customAssignments.canteen?.[0] || {
        name: '待分配'
      }
    };
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const schedule = {
      dateStr: `${d.getMonth() + 1}月${d.getDate()}日`,
      fullDateStr: `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`,
      weekStr: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()],
      mode,
      mainGroup: mode === 'group' ? mainGroup : undefined,
      subGroup: mode === 'group' ? subGroup : undefined,
      mainDuty,
      subDuty
    };
    setExternalSchedule({
      ...schedule,
      trigger: Date.now()
    });
    showToast('已应用自定义排班');
  };
  const handleClearCustom = () => {
    setCustomAssignments({});
    showToast('已清空自定义框');
  };
  const tabs = [{
    key: 'all',
    label: '全员值班'
  }, {
    key: 'group',
    label: '分组值班'
  }, {
    key: 'gate',
    label: '大门口值班'
  }];
  const selectStyle = {
    width: '100%',
    padding: '6px 10px',
    border: '1px solid rgba(60,80,120,.2)',
    borderRadius: '8px',
    fontSize: '13px',
    background: '#fff',
    outline: 'none',
    color: '#2a3a55'
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "duty-main"
  }, /*#__PURE__*/React.createElement("div", {
    className: "duty-tabs"
  }, tabs.map(tab => /*#__PURE__*/React.createElement("button", {
    key: tab.key,
    className: 'duty-tab' + (mode === tab.key ? ' active' : ''),
    onClick: () => setMode(tab.key)
  }, tab.label))), /*#__PURE__*/React.createElement("div", {
    className: "duty-row"
  }, (mode === 'all' || mode === 'group') && /*#__PURE__*/React.createElement("div", {
    className: "duty-custom-panel"
  }, /*#__PURE__*/React.createElement("div", {
    className: "duty-custom-header"
  }, /*#__PURE__*/React.createElement("span", {
    className: "duty-custom-title"
  }, "\u81EA\u5B9A\u4E49\u5C97\u4F4D\u4EBA\u5458")), /*#__PURE__*/React.createElement("div", {
    className: "duty-custom-grid"
  }, CUSTOM_POSTS.map(post => /*#__PURE__*/React.createElement("div", {
    key: post.key,
    className: "duty-custom-item"
  }, /*#__PURE__*/React.createElement("div", {
    className: "duty-custom-post-label"
  }, /*#__PURE__*/React.createElement("span", null, post.label)), Array.from({
    length: post.capacity
  }).map((_, idx) => {
    const person = getCustomPerson(post.key, idx);
    const options = getPeopleForPost(post);
    return /*#__PURE__*/React.createElement("select", {
      key: idx,
      style: {
        ...selectStyle,
        marginBottom: idx < post.capacity - 1 ? '6px' : 0
      },
      value: person?.id || '',
      onChange: e => updateCustomPost(post.key, e.target.value ? parseInt(e.target.value) : null, idx)
    }, /*#__PURE__*/React.createElement("option", {
      value: ""
    }, "\u2014 \u8BF7\u9009\u62E9 \u2014"), options.map(p => /*#__PURE__*/React.createElement("option", {
      key: p.id,
      value: p.id
    }, p.name)));
  }))), /*#__PURE__*/React.createElement("div", {
    className: "duty-custom-item"
  }, /*#__PURE__*/React.createElement("div", {
    className: "duty-custom-post-label"
  }, /*#__PURE__*/React.createElement("span", null, "\u5395\u6240\u53E3")), /*#__PURE__*/React.createElement("select", {
    style: selectStyle,
    value: getCustomPerson('toilet', 0)?.id || '',
    onChange: e => updateCustomPost('toilet', e.target.value ? parseInt(e.target.value) : null, 0)
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "\u2014 \u9ED8\u8BA4\u9910\u5385\u7B2C1\u4EBA \u2014"), staff.filter(p => p.name && p.name.trim()).map(p => /*#__PURE__*/React.createElement("option", {
    key: p.id,
    value: p.id
  }, p.name)))), mode === 'all' && /*#__PURE__*/React.createElement("div", {
    className: "duty-custom-item"
  }, /*#__PURE__*/React.createElement("div", {
    className: "duty-custom-post-label"
  }, /*#__PURE__*/React.createElement("span", null, "\u4E2D\u5348\u6536\u5047\u6761")), /*#__PURE__*/React.createElement("select", {
    style: selectStyle,
    value: getCustomPerson('lunch', 0)?.id || '',
    onChange: e => updateCustomPost('lunch', e.target.value ? parseInt(e.target.value) : null, 0)
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "\u2014 \u9ED8\u8BA4\u529E\u516C\u5BA4\u4EBA\u5458 \u2014"), staff.filter(p => p.name && p.name.trim()).map(p => /*#__PURE__*/React.createElement("option", {
    key: p.id,
    value: p.id
  }, p.name))))), /*#__PURE__*/React.createElement("div", {
    className: "duty-custom-footer"
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-primary btn-sm",
    onClick: handleUseCustom
  }, "\u4F7F\u7528\u8BE5\u6392\u73ED"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost btn-sm",
    onClick: handleClearCustom
  }, "\u6E05\u7A7A"))), /*#__PURE__*/React.createElement("div", {
    className: "duty-content"
  }, mode === 'gate' ? /*#__PURE__*/React.createElement(GatePage, {
    onNavigate: onNavigate,
    embedded: true
  }) : /*#__PURE__*/React.createElement(SchedulePage, {
    mode: mode,
    onNavigate: onNavigate,
    embedded: true,
    customAssignments: customAssignments,
    setCustomAssignments: setCustomAssignments,
    showToast: showToast,
    externalSchedule: externalSchedule
  }))), toast && /*#__PURE__*/React.createElement("div", {
    className: "toast"
  }, toast));
}
Object.assign(window, {
  DutyMainPage
});

// --- App.jsx ---
function App() {
  const [page, setPage] = React.useState('home');
  const [pageParams, setPageParams] = React.useState({});
  const [pageKey, setPageKey] = React.useState(0);
  const navigate = (target, params = {}) => {
    setPage(target);
    setPageParams(params);
    setPageKey(k => k + 1);
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };
  let content;
  if (page === 'home') {
    content = /*#__PURE__*/React.createElement(DutyMainPage, {
      key: pageKey,
      onNavigate: navigate
    });
  } else if (page === 'staff') {
    content = /*#__PURE__*/React.createElement(StaffPage, {
      key: pageKey,
      onNavigate: navigate
    });
  } else if (page === 'schedule') {
    content = /*#__PURE__*/React.createElement(SchedulePage, {
      key: pageKey,
      mode: pageParams.mode || 'all',
      onNavigate: navigate
    });
  } else if (page === 'dutySelect') {
    content = /*#__PURE__*/React.createElement(DutyMainPage, {
      key: pageKey,
      onNavigate: navigate
    });
  } else if (page === 'gate') {
    content = /*#__PURE__*/React.createElement(GatePage, {
      key: pageKey,
      onNavigate: navigate
    });
  }
  return /*#__PURE__*/React.createElement(StoreProvider, null, content);
}
Object.assign(window, {
  App
});

})();
