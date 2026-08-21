function DutyMainPage({ onNavigate }) {
  const { staff, groupRotation } = useStore();
  const [mode, setModeState] = React.useState('all');
  const [customAssignments, setCustomAssignments] = React.useState({});
  const [externalSchedule, setExternalSchedule] = React.useState(null);
  const [toast, setToast] = React.useState(null);

  const setMode = (m) => {
    setModeState(m);
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const activeStaff = staff.filter(p => p.role !== 'captain' && p.role !== 'vice_captain');
  const isAMain = groupRotation === 0;
  const mainGroup = isAMain ? 'A' : 'B';
  const subGroup = isAMain ? 'B' : 'A';

  const CUSTOM_POSTS = [
    { key: 'gate',        label: '大门口',  gender: 'male',   type: 'main', capacity: 1 },
    { key: 'garden',      label: '花园口',  gender: 'any',    type: 'sub',  capacity: 1 },
    { key: 'dorm_m',      label: '男寝',    gender: 'any',    type: 'main', capacity: 1 },
    { key: 'playground',  label: '操场',    gender: 'male',   type: 'main', capacity: 1 },
    { key: 'canteen',     label: '餐厅',    gender: 'any',    type: 'sub',  capacity: 4 },
    { key: 'canteenGate', label: '餐厅口',  gender: 'any',    type: 'sub',  capacity: 1 },
    { key: 'dorm_f',      label: '女寝',    gender: 'female', type: 'main', capacity: 1 },
    { key: 'office',      label: '办公室',  gender: 'female', type: 'main', capacity: 1 },
    { key: 'tech',        label: '科技楼',  gender: 'male',   type: 'main', capacity: 1 },
  ];

  const getPeopleForPost = (post) => {
    return activeStaff.filter(p => post.gender === 'any' || p.gender === post.gender);
  };

  const updateCustomPost = (postKey, personId, index = 0) => {
    setCustomAssignments(prev => {
      const next = { ...prev };
      if (!next[postKey]) next[postKey] = [];
      const person = activeStaff.find(p => p.id === personId);
      next[postKey][index] = person || { name: '待分配' };
      return next;
    });
  };

  const getCustomPerson = (postKey, index = 0) => {
    const arr = customAssignments[postKey];
    return arr && arr[index] ? arr[index] : null;
  };

  // 使用自定义排班（从底部按钮触发）
  const handleUseCustom = () => {
    const hasContent = Object.values(customAssignments).some(arr =>
      arr && arr.some(p => p && p.id));
    if (!hasContent) {
      showToast('请先填写岗位人员');
      return;
    }
    const mainPosts = [
      { key: 'gate', label: '大门口', gender: 'male', type: 'main' },
      { key: 'dorm_m', label: '男寝', gender: 'any', type: 'main' },
      { key: 'playground', label: '操场', gender: 'male', type: 'main' },
      { key: 'dorm_f', label: '女寝', gender: 'female', type: 'main' },
      { key: 'office', label: '办公室', gender: 'female', type: 'main' },
      { key: 'tech', label: '科技楼', gender: 'male', type: 'main' },
    ];
    const mainDuty = mainPosts.map(post => ({
      ...post,
      person: customAssignments[post.key]?.[0] || { name: '待分配' },
    }));
    const subDuty = {
      garden: customAssignments.garden?.[0] || { name: '待分配' },
      canteenGate: customAssignments.canteenGate?.[0] || { name: '待分配' },
      canteen: customAssignments.canteen || [],
      toilet: customAssignments.canteen?.[0] || { name: '待分配' },
    };
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const schedule = {
      dateStr: `${d.getMonth() + 1}月${d.getDate()}日`,
      fullDateStr: `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`,
      weekStr: ['周日','周一','周二','周三','周四','周五','周六'][d.getDay()],
      mode, mainGroup: mode === 'group' ? mainGroup : undefined,
      subGroup: mode === 'group' ? subGroup : undefined,
      mainDuty, subDuty,
    };
    setExternalSchedule({ ...schedule, trigger: Date.now() });
    showToast('已应用自定义排班');
  };

  const handleClearCustom = () => {
    setCustomAssignments({});
    showToast('已清空自定义框');
  };

  const tabs = [
    { key: 'all', label: '全员值班' },
    { key: 'group', label: '分组值班' },
    { key: 'gate', label: '大门口值班' },
  ];

  const selectStyle = {
    width: '100%', padding: '6px 10px', border: '1px solid rgba(60,80,120,.2)',
    borderRadius: '8px', fontSize: '13px', background: '#fff', outline: 'none', color: '#2a3a55',
  };

  return (
    <div className="duty-main">
      {/* 顶部切换按钮 */}
      <div className="duty-tabs">
        {tabs.map(tab => (
          <button
            key={tab.key}
            className={'duty-tab' + (mode === tab.key ? ' active' : '')}
            onClick={() => setMode(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 内容区：自定义岗位(左) + 排班数据(右) 并列一排 */}
      <div className="duty-row">
        {/* 左侧：自定义岗位人员 */}
        {(mode === 'all' || mode === 'group') && (
          <div className="duty-custom-panel">
            <div className="duty-custom-header">
              <span className="duty-custom-title">自定义岗位人员</span>
            </div>
            <div className="duty-custom-grid">
              {CUSTOM_POSTS.map(post => (
                <div key={post.key} className="duty-custom-item">
                  <div className="duty-custom-post-label">
                    <span>{post.label}</span>
                  </div>
                  {Array.from({ length: post.capacity }).map((_, idx) => {
                    const person = getCustomPerson(post.key, idx);
                    const options = getPeopleForPost(post);
                    return (
                      <select
                        key={idx}
                        style={{ ...selectStyle, marginBottom: idx < post.capacity - 1 ? '6px' : 0 }}
                        value={person?.id || ''}
                        onChange={(e) => updateCustomPost(post.key, e.target.value ? parseInt(e.target.value) : null, idx)}
                      >
                        <option value="">— 请选择 —</option>
                        {options.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    );
                  })}
                </div>
              ))}
              {/* 厕所口（可自定义，未填则默认餐厅第1人） */}
              <div className="duty-custom-item">
                <div className="duty-custom-post-label">
                  <span>厕所口</span>
                </div>
                <select
                  style={selectStyle}
                  value={getCustomPerson('toilet', 0)?.id || ''}
                  onChange={(e) => updateCustomPost('toilet', e.target.value ? parseInt(e.target.value) : null, 0)}
                >
                  <option value="">— 默认餐厅第1人 —</option>
                  {staff.filter(p => p.name && p.name.trim()).map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              {/* 中午收假条（可自定义，未填则默认办公室人员） */}
              {mode === 'all' && (
                <div className="duty-custom-item">
                  <div className="duty-custom-post-label">
                    <span>中午收假条</span>
                  </div>
                  <select
                    style={selectStyle}
                    value={getCustomPerson('lunch', 0)?.id || ''}
                    onChange={(e) => updateCustomPost('lunch', e.target.value ? parseInt(e.target.value) : null, 0)}
                  >
                    <option value="">— 默认办公室人员 —</option>
                    {staff.filter(p => p.name && p.name.trim()).map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            {/* 底部按钮 */}
            <div className="duty-custom-footer">
              <button className="btn btn-primary btn-sm" onClick={handleUseCustom}>使用该排班</button>
              <button className="btn btn-ghost btn-sm" onClick={handleClearCustom}>清空</button>
            </div>
          </div>
        )}

        {/* 右侧：排班数据 */}
        <div className="duty-content">
          {mode === 'gate' ? (
            <GatePage onNavigate={onNavigate} embedded />
          ) : (
            <SchedulePage
              mode={mode}
              onNavigate={onNavigate}
              embedded
              customAssignments={customAssignments}
              setCustomAssignments={setCustomAssignments}
              showToast={showToast}
              externalSchedule={externalSchedule}
            />
          )}
        </div>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

Object.assign(window, { DutyMainPage });
