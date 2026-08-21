function DutyMainPage({ onNavigate }) {
  const { staff, groupRotation } = useStore();
  const [mode, setModeState] = React.useState(() => {
    try { return localStorage.getItem('duty_mode') || 'all'; } catch (e) { return 'all'; }
  });
  const [customAssignments, setCustomAssignments] = React.useState({});
  const [toast, setToast] = React.useState(null);

  const setMode = (m) => {
    setModeState(m);
    try { localStorage.setItem('duty_mode', m); } catch (e) {}
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
    <div className="page-enter duty-main">
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
            <span className="duty-custom-desc">填写后以此为基准轮换；生成后自动更新为最新结果</span>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => { setCustomAssignments({}); showToast('已清空自定义框'); }}
            >清空</button>
          </div>
          {mode === 'group' && (
            <div className="duty-group-hint">
              <span className="tag tag-group-a">{mainGroup}组</span>主班 /
              <span className="tag tag-group-b" style={{ marginLeft: '4px' }}>{subGroup}组</span>副班
            </div>
          )}
          <div className="duty-custom-grid">
            {CUSTOM_POSTS.map(post => (
              <div key={post.key} className="duty-custom-item">
                <div className="duty-custom-post-label">
                  <span>{post.label}</span>
                  <span className="duty-custom-post-meta">
                    {post.type === 'main' ? '主班' : '副班'}
                    {post.gender === 'male' ? ' · 男' : post.gender === 'female' ? ' · 女' : ''}
                  </span>
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
            {/* 厕所口只读 */}
            <div className="duty-custom-item duty-custom-readonly">
              <div className="duty-custom-post-label">
                <span>厕所口</span>
                <span className="duty-custom-post-meta">餐厅第1人兼任</span>
              </div>
              <div className="duty-custom-readonly-value">
                {getCustomPerson('canteen', 0)?.name || '—'}
              </div>
            </div>
            {/* 中午收假条（仅全员模式） */}
            {mode === 'all' && (
              <div className="duty-custom-item duty-custom-readonly">
                <div className="duty-custom-post-label">
                  <span>中午收假条</span>
                  <span className="duty-custom-post-meta">默认办公室人员</span>
                </div>
                <div className="duty-custom-readonly-value">
                  {getCustomPerson('office', 0)?.name || '—'}
                </div>
              </div>
            )}
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
            />
          )}
        </div>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

Object.assign(window, { DutyMainPage });
