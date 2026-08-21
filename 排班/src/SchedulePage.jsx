function SchedulePage({ mode, onNavigate, embedded, customAssignments, setCustomAssignments, showToast: propShowToast, externalSchedule }) {
  const { generateSchedule, getAfterSchoolGate, advanceAfterSchoolPointer,
          scheduleHistory, saveScheduleHistory, deleteScheduleHistory, staff, groupRotation } = useStore();
  const [schedule, setSchedule] = React.useState(null);
  const [afterSchoolPeople, setAfterSchoolPeople] = React.useState(null);
  const [localToast, setLocalToast] = React.useState(null);

  // 监听外部 schedule 变化（从自定义岗位"使用该排班"按钮触发）
  React.useEffect(() => {
    if (externalSchedule && externalSchedule.trigger) {
      const { trigger, ...rest } = externalSchedule;
      setSchedule(rest);
      setAfterSchoolPeople(null);
    }
  }, [externalSchedule]);

  const showToast = propShowToast || ((msg) => {
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
    const hasCustom = customAssignments && Object.keys(customAssignments).length > 0 &&
      Object.values(customAssignments).some(arr => arr && arr.some(p => p && p.id));
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
      createdAt: new Date().toLocaleString('zh-CN'),
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

  const handleUseRecord = (record) => {
    if (record.assignments) {
      if (setCustomAssignments) setCustomAssignments(record.assignments);
      setSchedule({
        dateStr: record.dateStr,
        fullDateStr: record.fullDateStr,
        weekStr: record.weekStr,
        mainGroup: record.mainGroup,
        subGroup: record.subGroup,
        mainDuty: record.mainDuty,
        subDuty: record.subDuty,
      });
      setAfterSchoolPeople(record.afterSchool);
      showToast('已加载到自定义框，下次生成将以此为基准轮换');
    }
  };

  const renderTextFromRecord = (record) => {
    if (!record) return '';
    const lines = [];
    lines.push(`${record.dateStr}值班`);
    lines.push('');
    const padPost = (name) => {
      if (!name) return '';
      if (name.length === 2) return name.charAt(0) + '  ' + name.charAt(1);
      return name;
    };
    const { mainDuty, subDuty } = record;
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
      const officePerson = record.mainDuty.find(p => (p.key || p.label) === 'office' || (p.label || p.name) === '办公室')?.person;
      lines.push(`中午收假条：${officePerson?.name || '待分配'}`);
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

  const computeWarnings = (record) => {
    if (!record) return { emptyPosts: [], unusedPeople: [] };
    const emptyPosts = [];
    const assignedIds = new Set();
    const checkPerson = (postLabel, person) => {
      if (person.name === '待分配' || !person.id) emptyPosts.push(postLabel);
      else assignedIds.add(person.id);
    };
    record.mainDuty.forEach(post => checkPerson(post.label || post.name, post.person));
    checkPerson('花园口', record.subDuty.garden);
    checkPerson('餐厅口', record.subDuty.canteenGate);
    checkPerson('厕所口', record.subDuty.toilet);
    record.subDuty.canteen.forEach((p, i) => checkPerson(`餐厅${i + 1}`, p));
    const unusedPeople = activeStaff.filter(p => !assignedIds.has(p.id) && p.name && p.name.trim());
    return { emptyPosts: [...new Set(emptyPosts)], unusedPeople };
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
    afterSchool: afterSchoolPeople,
  } : null;
  const currentWarnings = currentRecord ? computeWarnings(currentRecord) : { emptyPosts: [], unusedPeople: [] };
  const modeHistory = scheduleHistory.filter(h => h.mode === mode);

  const handleDeleteHistory = (id, e) => {
    e.stopPropagation();
    deleteScheduleHistory(id);
    showToast('已删除该条记录');
  };

  const buildScheduleFromCustom = () => {
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
      person: customAssignments?.[post.key]?.[0] || { name: '待分配' },
    }));
    const subDuty = {
      garden: customAssignments?.garden?.[0] || { name: '待分配' },
      canteenGate: customAssignments?.canteenGate?.[0] || { name: '待分配' },
      canteen: customAssignments?.canteen || [],
      toilet: customAssignments?.canteen?.[0] || { name: '待分配' },
    };
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return {
      dateStr: `${d.getMonth() + 1}月${d.getDate()}日`,
      fullDateStr: `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`,
      weekStr: ['周日','周一','周二','周三','周四','周五','周六'][d.getDay()],
      mode, mainGroup: isGroupMode ? mainGroup : undefined,
      subGroup: isGroupMode ? subGroup : undefined,
      mainDuty, subDuty, assignments: { ...customAssignments },
    };
  };

  const handleUseCustom = () => {
    const hasContent = customAssignments && Object.values(customAssignments).some(arr =>
      arr && arr.some(p => p && p.id));
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
    return (
      <div className="duty-schedule-embedded">
        <div className="duty-schedule-toolbar">
          <div className="duty-schedule-toolbar-left">
            {isGroupMode && schedule && (
              <div className="duty-group-badge">
                <span className="tag tag-group-a">{schedule.mainGroup}组</span>
                <span className="duty-group-badge-text">主班</span>
                <span className="duty-group-badge-sep">/</span>
                <span className="tag tag-group-b">{schedule.subGroup}组</span>
                <span className="duty-group-badge-text">副班</span>
              </div>
            )}
          </div>
          <div className="duty-schedule-toolbar-right">
            <button className="btn btn-primary" onClick={handleGenerate}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}>
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
              生成排班
            </button>
          </div>
        </div>

        {schedule ? (
          <div className="duty-result-card">
            <div className="duty-result-header">
              <div className="duty-result-title-row">
                <span className="duty-result-title">排班结果</span>
                <span className="duty-result-date">{schedule.fullDateStr} {schedule.weekStr}</span>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => {
                navigator.clipboard?.writeText(renderTextFromRecord(currentRecord));
                showToast('已复制到剪贴板');
              }}>复制文本</button>
            </div>
            {(currentWarnings.emptyPosts.length > 0 || currentWarnings.unusedPeople.length > 0) && (
              <div className="duty-warnings">
                {currentWarnings.emptyPosts.length > 0 && (
                  <div>以下岗位无人：<span style={{ fontWeight: 600 }}>{currentWarnings.emptyPosts.join('、')}</span></div>
                )}
                {currentWarnings.unusedPeople.length > 0 && (
                  <div>以下人员未参与值班：<span style={{ fontWeight: 600 }}>{currentWarnings.unusedPeople.map(p => p.name).join('、')}</span></div>
                )}
              </div>
            )}
            <div className="duty-result-body">
              <pre className="duty-result-text">{renderTextFromRecord(currentRecord)}</pre>
            </div>
          </div>
        ) : (
          <div className="duty-empty-card">
            <div className="duty-empty-icon">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
            </div>
            <h3 className="duty-empty-title">暂无排班数据</h3>
            <p className="duty-empty-desc">可在底部自定义岗位人员作为基准，或直接点击"生成排班"</p>
            <button className="btn btn-primary" onClick={handleGenerate}>立即生成</button>
          </div>
        )}

        {modeHistory.length > 0 && (
          <div className="duty-history-card">
            <div className="duty-history-header">
              <span className="duty-history-title">历史记录</span>
              <span className="duty-history-count">最近 {modeHistory.length} 条（最多5条）</span>
            </div>
            <div className="duty-history-list">
              {modeHistory.map((record, idx) => (
                <div key={record.id} className={'duty-history-item' + (idx < modeHistory.length - 1 ? ' border' : '')}>
                  <div className="duty-history-item-main"
                    onClick={() => {
                      setSchedule({
                        dateStr: record.dateStr, fullDateStr: record.fullDateStr, weekStr: record.weekStr,
                        mainGroup: record.mainGroup, subGroup: record.subGroup,
                        mainDuty: record.mainDuty, subDuty: record.subDuty,
                      });
                      setAfterSchoolPeople(record.afterSchool);
                    }}
                  >
                    <span className="duty-history-date">{record.dateStr}</span>
                    <span className="duty-history-week">{record.weekStr}</span>
                    {record.mode === 'group' && (
                      <span className="duty-history-group">{record.mainGroup}组主班/{record.subGroup}组副班</span>
                    )}
                    <span className="duty-history-time">生成于 {record.createdAt}</span>
                  </div>
                  <div className="duty-history-ops">
                    <button className="btn btn-ghost btn-sm" onClick={() => handleUseRecord(record)}>使用该排班</button>
                    <button className="btn btn-ghost btn-sm" onClick={(e) => {
                      e.stopPropagation();
                      navigator.clipboard?.writeText(renderTextFromRecord(record));
                      showToast('已复制到剪贴板');
                    }}>复制</button>
                    <button className="btn btn-danger btn-sm" onClick={(e) => handleDeleteHistory(record.id, e)}>删除</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // 非 embedded 模式（独立使用，保留原有布局）
  return (
    <div className="page-enter" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ padding: '20px 32px', background: '#fff', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('home')} style={{ marginLeft: '-8px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5"></path><path d="M12 19l-7-7 7-7"></path>
            </svg>
            返回首页
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ fontSize: '18px', fontWeight: 600, color: '#111827' }}>排班生成</h1>
            <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 500, background: modeBg, color: modeColor }}>{modeLabel}</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '13px', color: '#6b7280' }}>排班日期：</span>
          <span style={{ fontSize: '14px', fontWeight: 500, color: '#374151', padding: '4px 12px', background: '#f3f4f6', borderRadius: '6px' }}>明天</span>
        </div>
      </header>

      <main style={{ flex: 1, padding: '24px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {isGroupMode && schedule && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px' }}>
                <span className="tag tag-group-a">{schedule.mainGroup}组</span>
                <span style={{ color: '#374151', fontWeight: 500 }}>主班</span>
                <span style={{ color: '#9ca3af', margin: '0 4px' }}>/</span>
                <span className="tag tag-group-b">{schedule.subGroup}组</span>
                <span style={{ color: '#374151', fontWeight: 500 }}>副班</span>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('staff')}>人员管理</button>
            <button className="btn btn-primary" onClick={handleGenerate}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}>
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
              生成排班
            </button>
          </div>
        </div>

        {schedule ? (
          <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', background: '#f8fafc', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ width: '4px', height: '18px', background: modeColor, borderRadius: '2px' }}></span>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#111827' }}>排班结果</h3>
                <span style={{ fontSize: '13px', color: '#6b7280' }}>{schedule.fullDateStr} {schedule.weekStr}</span>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => {
                navigator.clipboard?.writeText(renderTextFromRecord(currentRecord));
                showToast('已复制到剪贴板');
              }}>复制文本</button>
            </div>
            {(currentWarnings.emptyPosts.length > 0 || currentWarnings.unusedPeople.length > 0) && (
              <div style={{ padding: '12px 20px', background: '#fffbeb', borderBottom: '1px solid #fcd34d', fontSize: '13px', color: '#92400e', lineHeight: 1.8 }}>
                {currentWarnings.emptyPosts.length > 0 && (
                  <div>⚠️ 以下岗位无人：<span style={{ fontWeight: 600 }}>{currentWarnings.emptyPosts.join('、')}</span></div>
                )}
                {currentWarnings.unusedPeople.length > 0 && (
                  <div>⚠️ 以下人员未参与值班：<span style={{ fontWeight: 600 }}>{currentWarnings.unusedPeople.map(p => p.name).join('、')}</span></div>
                )}
              </div>
            )}
            <div style={{ padding: '24px 28px' }}>
              <pre style={{
                margin: 0,
                fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
                fontSize: '15px', lineHeight: 2, color: '#1f2937', whiteSpace: 'pre-wrap',
              }}>
                {renderTextFromRecord(currentRecord)}
              </pre>
            </div>
          </div>
        ) : (
          <div style={{ background: '#fff', borderRadius: '12px', border: '1px dashed #d1d5db', padding: '60px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: 500, color: '#374151' }}>暂无排班数据</h3>
            <p style={{ fontSize: '13px', color: '#9ca3af', textAlign: 'center', maxWidth: '300px', lineHeight: 1.6 }}>
              可在左侧自定义岗位人员作为基准，或直接点击"生成排班"
            </p>
            <button className="btn btn-primary" onClick={handleGenerate}>立即生成</button>
          </div>
        )}

        {modeHistory.length > 0 && (
          <div style={{ marginTop: '20px', background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', background: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ width: '4px', height: '18px', background: '#6b7280', borderRadius: '2px' }}></span>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#111827' }}>历史记录</h3>
                <span style={{ fontSize: '13px', color: '#9ca3af' }}>最近 {modeHistory.length} 条（最多5条）</span>
              </div>
            </div>
            <div>
              {modeHistory.map((record, idx) => (
                <div key={record.id} style={{ borderBottom: idx < modeHistory.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                  <div style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', flex: 1, minWidth: 0 }}
                      onClick={() => {
                        setSchedule({
                          dateStr: record.dateStr, fullDateStr: record.fullDateStr, weekStr: record.weekStr,
                          mainGroup: record.mainGroup, subGroup: record.subGroup,
                          mainDuty: record.mainDuty, subDuty: record.subDuty,
                        });
                        setAfterSchoolPeople(record.afterSchool);
                      }}
                    >
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#374151', minWidth: '70px' }}>{record.dateStr}</span>
                      <span style={{ fontSize: '12px', color: '#9ca3af' }}>{record.weekStr}</span>
                      {record.mode === 'group' && (
                        <span style={{ fontSize: '12px', color: '#6b7280' }}>{record.mainGroup}组主班/{record.subGroup}组副班</span>
                      )}
                      <span style={{ fontSize: '11px', color: '#d1d5db' }}>生成于 {record.createdAt}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                      <button className="btn btn-ghost btn-sm" style={{ fontSize: '12px', padding: '4px 10px' }}
                        onClick={() => handleUseRecord(record)}>使用该排班</button>
                      <button className="btn btn-ghost btn-sm" style={{ fontSize: '12px', padding: '4px 10px' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard?.writeText(renderTextFromRecord(record));
                          showToast('已复制到剪贴板');
                        }}>复制</button>
                      <button className="btn btn-danger btn-sm" style={{ fontSize: '12px', padding: '4px 10px' }}
                        onClick={(e) => handleDeleteHistory(record.id, e)}>删除</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {localToast && <div className="toast">{localToast}</div>}
    </div>
  );
}

Object.assign(window, { SchedulePage });
