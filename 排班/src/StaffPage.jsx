function StaffPage({ onNavigate, canEdit, autoBounce }) {
  const { staff, addStaff, updateStaff, deleteStaff, resetStaff, ROLE_LABELS } = useStore();
  const [showGroup, setShowGroup] = React.useState(true);
  const [filter, setFilter] = React.useState(null); // null=全部, male/female/A/B
  const [toast, setToast] = React.useState(null);
  const [bouncing, setBouncing] = React.useState(false);
  const editable = canEdit !== false; // 默认可编辑，仅显式传 false 时只读

  // 页面打开后一段时间自动跳动
  React.useEffect(() => {
    if (!autoBounce) return;
    const timer = setTimeout(() => {
      setBouncing(true);
      setTimeout(() => setBouncing(false), 650);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };

  const handleSave = () => {
    if (!editable) { showToast('当前账号无修改权限'); return; }
    const invalid = staff.some(p => !p.name || !p.name.trim());
    if (invalid) { showToast('请填写所有人员姓名'); return; }
    showToast('保存成功');
  };

  const handleAdd = () => {
    if (!editable) { showToast('当前账号无修改权限'); return; }
    const maleCount = staff.filter(p => p.gender === 'male').length;
    const defaultGender = maleCount < 7 ? 'male' : 'female';
    const defaultGroup = staff.length % 2 === 0 ? 'A' : 'B';
    addStaff({ name: '', gender: defaultGender, group: defaultGroup, role: 'member' });
  };

  const handleDelete = (id) => {
    if (!editable) { showToast('当前账号无修改权限'); return; }
    deleteStaff(id);
  };

  const handleReset = () => {
    if (!editable) { showToast('当前账号无修改权限'); return; }
    resetStaff();
  };

  const handleRoleChange = (id, newRole) => {
    if (!editable) return;
    if (['captain', 'vice_captain', 'leader_a', 'leader_b'].includes(newRole)) {
      staff.forEach(p => {
        if (p.role === newRole && p.id !== id) {
          updateStaff(p.id, { role: 'member' });
        }
      });
    }
    updateStaff(id, { role: newRole });
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

  // 筛选后的人员列表
  const filteredStaff = staff.filter(p => {
    if (!filter) return true;
    if (filter === 'male') return p.gender === 'male';
    if (filter === 'female') return p.gender === 'female';
    if (filter === 'A') return p.group === 'A' && p.role !== 'captain' && p.role !== 'vice_captain';
    if (filter === 'B') return p.group === 'B' && p.role !== 'captain' && p.role !== 'vice_captain';
    return true;
  });

  const getRoleOptions = (person) => {
    const opts = [{ value: 'member', label: '普通成员' }];
    opts.push({ value: 'captain', label: '队长' });
    opts.push({ value: 'vice_captain', label: '副队长' });
    if (person.group === 'A') opts.push({ value: 'leader_a', label: 'A组组长' });
    else if (person.group === 'B') opts.push({ value: 'leader_b', label: 'B组组长' });
    return opts;
  };

  const roleTagStyle = (role) => {
    switch (role) {
      case 'captain':      return { bg: '#fef3c7', color: '#b45309' };
      case 'vice_captain': return { bg: '#e0e7ff', color: '#4338ca' };
      case 'leader_a':     return { bg: '#fef3c7', color: '#b45309' };
      case 'leader_b':     return { bg: '#d1fae5', color: '#047857' };
      default:             return { bg: '#f3f4f6', color: '#6b7280' };
    }
  };

  const isCaptainOrVice = (person) => person.role === 'captain' || person.role === 'vice_captain';

  const filterBtnStyle = (active) => ({
    padding: '10px 16px', borderRadius: '10px',
    border: '1px solid', cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: '8px',
    background: active ? '#eff6ff' : '#fff',
    borderColor: active ? '#2563eb' : '#e5e7eb',
    transition: 'all .15s',
  });

  const readOnlyInputStyle = {
    ...inputStyle, background: '#f9fafb', color: '#6b7280', cursor: 'default',
  };

  return (
    <div className={'page-enter' + (bouncing ? ' staff-bounce' : '')} style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ padding: '20px 32px', background: '#fff', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('home')} style={{ marginLeft: '-8px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5"></path><path d="M12 19l-7-7 7-7"></path>
            </svg>
            返回首页
          </button>
          <h1 style={{ fontSize: '18px', fontWeight: 600, color: '#111827' }}>员工管理</h1>
          {!editable && (
            <span style={{ padding: '3px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 500, background: '#fef3c7', color: '#b45309' }}>只读模式</span>
          )}
        </div>
        <div className="radio-group">
          <label><input type="radio" checked={showGroup} onChange={() => setShowGroup(true)} /><span>显示分组</span></label>
          <label><input type="radio" checked={!showGroup} onChange={() => setShowGroup(false)} /><span>隐藏分组</span></label>
        </div>
      </header>

      <main style={{ flex: 1, padding: '28px 32px', maxWidth: '1280px', margin: '0 auto', width: '100%' }}>
        {/* 筛选统计栏 */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div onClick={() => setFilter(null)} style={filterBtnStyle(filter === null)}>
            <span style={{ fontSize: '13px', color: filter === null ? '#1d4ed8' : '#374151', fontWeight: 600 }}>共</span>
            <span style={{ fontSize: '18px', color: filter === null ? '#1e40af' : '#374151', fontWeight: 700 }}>{staff.length}</span>
            <span style={{ fontSize: '13px', color: filter === null ? '#1d4ed8' : '#374151', fontWeight: 600 }}>人</span>
          </div>
          <div onClick={() => setFilter(filter === 'male' ? null : 'male')} style={filterBtnStyle(filter === 'male')}>
            <span className="tag tag-male">男</span>
            <span style={{ fontSize: '14px', color: '#374151', fontWeight: 500 }}>{maleCount} 人</span>
          </div>
          <div onClick={() => setFilter(filter === 'female' ? null : 'female')} style={filterBtnStyle(filter === 'female')}>
            <span className="tag tag-female">女</span>
            <span style={{ fontSize: '14px', color: '#374151', fontWeight: 500 }}>{femaleCount} 人</span>
          </div>
          {showGroup && (
            <>
              <div onClick={() => setFilter(filter === 'A' ? null : 'A')} style={filterBtnStyle(filter === 'A')}>
                <span className="tag tag-group-a">A组</span>
                <span style={{ fontSize: '14px', color: '#374151', fontWeight: 500 }}>{aCount} 人</span>
              </div>
              <div onClick={() => setFilter(filter === 'B' ? null : 'B')} style={filterBtnStyle(filter === 'B')}>
                <span className="tag tag-group-b">B组</span>
                <span style={{ fontSize: '14px', color: '#374151', fontWeight: 500 }}>{bCount} 人</span>
              </div>
            </>
          )}
          {filter && (
            <button className="btn btn-ghost btn-sm" onClick={() => setFilter(null)} style={{ color: '#6b7280' }}>
              清除筛选
            </button>
          )}
          <div style={{ marginLeft: 'auto', fontSize: '13px', color: '#9ca3af', display: 'flex', alignItems: 'center' }}>
            建议配比：男 7 人 / 女 5 人
          </div>
        </div>

        {filter && (
          <div style={{ marginBottom: '12px', fontSize: '13px', color: '#6b7280' }}>
            当前筛选：<span style={{ fontWeight: 600, color: '#2563eb' }}>
              {filter === 'male' ? '男生' : filter === 'female' ? '女生' : filter === 'A' ? 'A组' : 'B组'}
            </span>，共 {filteredStaff.length} 人
          </div>
        )}

        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#111827' }}>人员列表</h2>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className={'btn btn-sm ' + (editable ? 'btn-secondary' : 'btn-ghost')} onClick={handleAdd} disabled={!editable} style={!editable ? { opacity: .5, cursor: 'not-allowed' } : {}}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14"></path><path d="M5 12h14"></path>
                </svg>
                添加人员
              </button>
              <button className="btn btn-ghost btn-sm" onClick={handleReset} disabled={!editable} style={!editable ? { color: '#c0c4cc', opacity: .5, cursor: 'not-allowed' } : { color: '#6b7280' }}>重置为默认</button>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style={{ width: '50px' }}>序号</th>
                <th style={{ minWidth: '120px' }}>姓名</th>
                <th style={{ width: '130px' }}>性别</th>
                {showGroup && <th style={{ width: '130px' }}>分组</th>}
                <th style={{ width: '160px' }}>角色</th>
                <th style={{ width: '90px', textAlign: 'right' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredStaff.map((person, idx) => {
                const roleOpts = getRoleOptions(person);
                const rtStyle = roleTagStyle(person.role);
                const isCapVice = isCaptainOrVice(person);
                return (
                  <tr key={person.id}>
                    <td style={{ color: '#9ca3af', fontSize: '13px' }}>{idx + 1}</td>
                    <td>
                      {editable ? (
                        <input
                          type="text" value={person.name}
                          onChange={(e) => handleUpdate(person.id, { name: e.target.value })}
                          placeholder="请输入姓名"
                          style={inputStyle}
                          onFocus={e => e.target.style.borderColor = '#2563eb'}
                          onBlur={e => e.target.style.borderColor = '#d1d5db'}
                        />
                      ) : (
                        <span style={{ fontSize: '14px', color: '#374151', fontWeight: 500 }}>{person.name || '（未命名）'}</span>
                      )}
                    </td>
                    <td>
                      {editable ? (
                        <div className="radio-group">
                          <label>
                            <input type="radio" name={`gender-${person.id}`} checked={person.gender === 'male'}
                              onChange={() => handleUpdate(person.id, { gender: 'male' })} />
                            <span>男</span>
                          </label>
                          <label>
                            <input type="radio" name={`gender-${person.id}`} checked={person.gender === 'female'}
                              onChange={() => handleUpdate(person.id, { gender: 'female' })} />
                            <span>女</span>
                          </label>
                        </div>
                      ) : (
                        <span className={'tag ' + (person.gender === 'male' ? 'tag-male' : 'tag-female')}>{person.gender === 'male' ? '男' : '女'}</span>
                      )}
                    </td>
                    {showGroup && (
                      <td>
                        {isCapVice ? (
                          <span style={{ fontSize: '13px', color: '#9ca3af' }}>— 不参与分组 —</span>
                        ) : editable ? (
                          <div className="radio-group">
                            <label>
                              <input type="radio" name={`group-${person.id}`} checked={person.group === 'A'}
                                onChange={() => {
                                  let newRole = person.role;
                                  if (person.group === 'B' && person.role === 'leader_b') newRole = 'member';
                                  handleUpdate(person.id, { group: 'A', role: newRole });
                                }} />
                              <span>A组</span>
                            </label>
                            <label>
                              <input type="radio" name={`group-${person.id}`} checked={person.group === 'B'}
                                onChange={() => {
                                  let newRole = person.role;
                                  if (person.group === 'A' && person.role === 'leader_a') newRole = 'member';
                                  handleUpdate(person.id, { group: 'B', role: newRole });
                                }} />
                              <span>B组</span>
                            </label>
                          </div>
                        ) : (
                          <span className={'tag tag-group-' + (person.group === 'A' ? 'a' : 'b')}>{person.group}组</span>
                        )}
                      </td>
                    )}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {editable ? (
                          <select
                            value={person.role}
                            onChange={(e) => handleRoleChange(person.id, e.target.value)}
                            style={{ padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', background: '#fff', outline: 'none', cursor: 'pointer' }}
                          >
                            {roleOpts.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        ) : null}
                        <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 500, background: rtStyle.bg, color: rtStyle.color, whiteSpace: 'nowrap' }}>
                          {ROLE_LABELS[person.role]}
                        </span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDelete(person.id)}
                        disabled={!editable || staff.length <= 1}
                        style={(!editable || staff.length <= 1) ? { visibility: 'hidden' } : {}}
                      >删除</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredStaff.length === 0 && (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>
              {staff.length === 0 ? '暂无人员，点击上方"添加人员"开始录入' : '当前筛选条件下无人员'}
            </div>
          )}
        </div>

        {/* 底部分组信息 */}
        <div style={{ marginTop: '24px', background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '20px 24px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#111827', marginBottom: '14px' }}>分组信息</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px', color: '#374151', lineHeight: 1.8 }}>
            <div>
              <span style={{ fontWeight: 600, color: '#b45309', marginRight: '8px' }}>队长：</span>
              <span>{captain?.name || '未设置'}</span>
              <span style={{ margin: '0 16px', color: '#d1d5db' }}>|</span>
              <span style={{ fontWeight: 600, color: '#4338ca', marginRight: '8px' }}>副队长：</span>
              <span>{viceCaptain?.name || '未设置'}</span>
              <span style={{ marginLeft: '12px', fontSize: '12px', color: '#9ca3af' }}>（不参与分组）</span>
            </div>
            <div style={{ paddingTop: '8px', borderTop: '1px dashed #e5e7eb' }}>
              <span style={{ fontWeight: 600, color: '#b45309', marginRight: '8px' }}>A组组长：</span>
              <span>{staff.find(p => p.role === 'leader_a')?.name || '未设置'}</span>
              <span style={{ margin: '0 12px', color: '#d1d5db' }}>|</span>
              <span style={{ fontWeight: 600, color: '#374151', marginRight: '8px' }}>成员：</span>
              <span>{staff.filter(p => p.group === 'A' && p.role !== 'leader_a' && p.role !== 'captain' && p.role !== 'vice_captain').map(p => p.name || '(未命名)').join('、') || '暂无'}</span>
            </div>
            <div>
              <span style={{ fontWeight: 600, color: '#047857', marginRight: '8px' }}>B组组长：</span>
              <span>{staff.find(p => p.role === 'leader_b')?.name || '未设置'}</span>
              <span style={{ margin: '0 12px', color: '#d1d5db' }}>|</span>
              <span style={{ fontWeight: 600, color: '#374151', marginRight: '8px' }}>成员：</span>
              <span>{staff.filter(p => p.group === 'B' && p.role !== 'leader_b' && p.role !== 'captain' && p.role !== 'vice_captain').map(p => p.name || '(未命名)').join('、') || '暂无'}</span>
            </div>
          </div>
        </div>

        <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button className="btn btn-secondary" onClick={() => onNavigate('home')}>返回首页</button>
          <button className={'btn ' + (editable ? 'btn-primary' : 'btn-ghost')} onClick={handleSave} disabled={!editable} style={!editable ? { opacity: .5, cursor: 'not-allowed' } : {}}>保存设置</button>
        </div>
      </main>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

const inputStyle = {
  width: '100%', padding: '6px 10px', border: '1px solid #d1d5db',
  borderRadius: '6px', fontSize: '14px', outline: 'none', transition: 'border-color .15s',
};

Object.assign(window, { StaffPage });
