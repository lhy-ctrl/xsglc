function GatePage({ onNavigate, embedded }) {
  const { generateGateDuty, advanceGatePointer, staff, ROLE_LABELS } = useStore();
  // 时间段1
  const [startTime, setStartTime] = React.useState('14:00');
  const [endTime, setEndTime] = React.useState('18:00');
  const [shifts, setShifts] = React.useState(4);
  // 时间段2
  const [startTime2, setStartTime2] = React.useState('18:00');
  const [endTime2, setEndTime2] = React.useState('21:00');
  const [shifts2, setShifts2] = React.useState(3);
  const [enableSecond, setEnableSecond] = React.useState(false);
  const [dayOffset, setDayOffset] = React.useState(1);
  const [result, setResult] = React.useState(null);
  const [toast, setToast] = React.useState(null);
  const [history, setHistory] = React.useState(() => {
    try {
      const saved = localStorage.getItem('duty_gate_history');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  React.useEffect(() => {
    try { localStorage.setItem('duty_gate_history', JSON.stringify(history)); } catch {}
  }, [history]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  // 计算提醒：岗位空缺和未参与人员
  const computeWarnings = (r) => {
    if (!r) return { emptySlots: [], unusedPeople: [] };
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
    return { emptySlots: [...new Set(emptySlots)], unusedPeople };
  };

  const handleGenerate = () => {
    const maleCount = staff.filter(p => p.gender === 'male').length;
    if (maleCount === 0) { showToast('暂无男生人员，请先在人员管理中添加'); return; }
    if (!startTime || !endTime) { showToast('请填写时间段1的起止时间'); return; }
    if (shifts < 1) { showToast('时间段1班次数量至少为 1'); return; }
    if (enableSecond && (!startTime2 || !endTime2)) { showToast('请填写时间段2的起止时间'); return; }
    if (enableSecond && shifts2 < 1) { showToast('时间段2班次数量至少为 1'); return; }

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
      startTime, endTime, shifts,
      startTime2: enableSecond ? startTime2 : null,
      endTime2: enableSecond ? endTime2 : null,
      shifts2: enableSecond ? shifts2 : null,
      enableSecond,
      shiftList: r1.shiftList,
      shiftList2: r2 ? r2.shiftList : null,
      usedCaptains: r1.usedCaptains,
      usedCaptains2: r2 ? r2.usedCaptains : null,
      createdAt: new Date().toLocaleString('zh-CN'),
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

  const renderTextFromRecord = (r) => {
    if (!r) return '';
    const lines = [];
    lines.push(`${r.dateStr}大门口值班`);
    lines.push('');
    lines.push('【时间段1】');
    r.shiftList.forEach(s => {
      const names = s.people.map(p => p?.name || '待分配').join('  ');
      lines.push(`${s.start}——${s.end}  ${names}`);
    });
    if (r.shiftList2 && r.shiftList2.length > 0) {
      lines.push('');
      lines.push('【时间段2】');
      r.shiftList2.forEach(s => {
        const names = s.people.map(p => p?.name || '待分配').join('  ');
        lines.push(`${s.start}——${s.end}  ${names}`);
      });
    }
    lines.push('');
    lines.push('所有教官按时到校打卡，路上注意安全！');
    return lines.join('\n');
  };

  const handleDeleteHistory = (id, e) => {
    e.stopPropagation();
    setHistory(prev => prev.filter(h => h.id !== id));
    showToast('已删除该条记录');
  };

  const currentWarnings = result ? computeWarnings(result) : { emptySlots: [], unusedPeople: [] };
  const maleCount = staff.filter(p => p.gender === 'male').length;
  const totalNeeded = shifts * 2 + (enableSecond ? shifts2 * 2 : 0);

  const timeInputStyle = {
    width: '100%', padding: '8px 12px', border: '1px solid rgba(60,80,120,.2)',
    borderRadius: '8px', fontSize: '14px', outline: 'none', background: '#fff', color: '#2a3a55',
  };

  // embedded 模式：左右并列布局
  if (embedded) {
    return (
      <div className="duty-gate-embedded">
        <div className="duty-gate-row">
          {/* 左侧：排班参数 */}
          <div className="duty-gate-params">
            <div className="duty-gate-params-header">
              <span className="duty-gate-params-title">排班参数</span>
            </div>
            <div className="duty-gate-params-body">
              {/* 时间段1 */}
              <div className="duty-gate-timeblock">
                <div className="duty-gate-timeblock-title">时间段1</div>
                <div className="duty-gate-timeblock-grid">
                  <div>
                    <label className="duty-gate-label">开始时间</label>
                    <input type="time" value={startTime} onChange={(e) => { setStartTime(e.target.value); setResult(null); }} style={timeInputStyle} />
                  </div>
                  <div>
                    <label className="duty-gate-label">结束时间</label>
                    <input type="time" value={endTime} onChange={(e) => { setEndTime(e.target.value); setResult(null); }} style={timeInputStyle} />
                  </div>
                  <div>
                    <label className="duty-gate-label">分几班</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="number" min="1" max="12" value={shifts}
                        onChange={(e) => {
                          const v = Math.max(1, Math.min(12, parseInt(e.target.value) || 1));
                          setShifts(v); setResult(null);
                        }}
                        style={{ ...timeInputStyle, width: '80px', textAlign: 'center' }}
                      />
                      <span style={{ fontSize: '13px', color: '#7a8aa5' }}>班</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 时间段2开关 */}
              <div className="duty-gate-second-toggle">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#3a4a6a', fontWeight: 500 }}>
                  <input type="checkbox" checked={enableSecond} onChange={(e) => { setEnableSecond(e.target.checked); setResult(null); }} />
                  启用时间段2
                </label>
              </div>

              {/* 时间段2 */}
              {enableSecond && (
                <div className="duty-gate-timeblock">
                  <div className="duty-gate-timeblock-title">时间段2</div>
                  <div className="duty-gate-timeblock-grid">
                    <div>
                      <label className="duty-gate-label">开始时间</label>
                      <input type="time" value={startTime2} onChange={(e) => { setStartTime2(e.target.value); setResult(null); }} style={timeInputStyle} />
                    </div>
                    <div>
                      <label className="duty-gate-label">结束时间</label>
                      <input type="time" value={endTime2} onChange={(e) => { setEndTime2(e.target.value); setResult(null); }} style={timeInputStyle} />
                    </div>
                    <div>
                      <label className="duty-gate-label">分几班</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                          type="number" min="1" max="12" value={shifts2}
                          onChange={(e) => {
                            const v = Math.max(1, Math.min(12, parseInt(e.target.value) || 1));
                            setShifts2(v); setResult(null);
                          }}
                          style={{ ...timeInputStyle, width: '80px', textAlign: 'center' }}
                        />
                        <span style={{ fontSize: '13px', color: '#7a8aa5' }}>班</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="duty-gate-params-info">
                现有男生 <span style={{ fontWeight: 600, color: '#2a3a55' }}>{maleCount}</span> 人，
                需 <span style={{ fontWeight: 600, color: '#2a3a55' }}>{totalNeeded}</span> 人次
                {maleCount < totalNeeded && (
                  <span style={{ color: '#ea580c', marginLeft: '6px' }}>（不足，将由副队长/队长补足）</span>
                )}
              </div>

              <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleGenerate}>生成排班</button>
            </div>
          </div>

          {/* 右侧：排班数据 */}
          <div className="duty-gate-result">
            {result ? (
              <div className="duty-result-card">
                <div className="duty-result-header">
                  <div className="duty-result-title-row">
                    <span className="duty-result-title">排班结果</span>
                    <span className="duty-result-date">{result.dateStr} {result.weekStr}</span>
                  </div>
                  <button className="btn btn-secondary btn-sm" onClick={() => {
                    navigator.clipboard?.writeText(renderTextFromRecord(result));
                    showToast('已复制到剪贴板');
                  }}>复制文本</button>
                </div>
                {(currentWarnings.emptySlots.length > 0 || currentWarnings.unusedPeople.length > 0) && (
                  <div className="duty-warnings">
                    {currentWarnings.emptySlots.length > 0 && (
                      <div>以下时段有空缺：<span style={{ fontWeight: 600 }}>{currentWarnings.emptySlots.join('、')}</span></div>
                    )}
                    {currentWarnings.unusedPeople.length > 0 && (
                      <div>以下男生未参与值班：<span style={{ fontWeight: 600 }}>{currentWarnings.unusedPeople.map(p => p.name).join('、')}</span></div>
                    )}
                  </div>
                )}
                <div className="duty-result-body">
                  <pre className="duty-result-text">{renderTextFromRecord(result)}</pre>
                  {(result.usedCaptains && result.usedCaptains.length > 0) || (result.usedCaptains2 && result.usedCaptains2.length > 0) ? (
                    <div style={{ marginTop: '16px', padding: '10px 14px', background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.2)', borderRadius: '8px', fontSize: '13px', color: '#92400e' }}>
                      <span style={{ fontWeight: 500 }}>提示：</span>
                      男生人数不足，以下干部参与了值班：
                      {[...(result.usedCaptains || []), ...(result.usedCaptains2 || [])].map((p, i) => (
                        <span key={i} style={{ margin: '0 4px' }}>{p.name}（{ROLE_LABELS[p.role]}）</span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="duty-empty-card">
                <div className="duty-empty-icon">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg>
                </div>
                <h3 className="duty-empty-title">暂无排班</h3>
                <p className="duty-empty-desc">设置好起止时间和班次数量后，点击"生成排班"</p>
                <button className="btn btn-primary" onClick={handleGenerate}>立即生成</button>
              </div>
            )}

            {/* 历史记录 */}
            {history.length > 0 && (
              <div className="duty-history-card" style={{ marginTop: '16px' }}>
                <div className="duty-history-header">
                  <span className="duty-history-title">历史记录</span>
                  <span className="duty-history-count">最近 {history.length} 条（最多5条）</span>
                </div>
                <div className="duty-history-list">
                  {history.map((record, idx) => (
                    <div key={record.id} className={'duty-history-item' + (idx < history.length - 1 ? ' border' : '')}>
                      <div className="duty-history-item-main" onClick={() => setResult({ ...record })}>
                        <span className="duty-history-date">{record.dateStr}</span>
                        <span className="duty-history-week">{record.weekStr}</span>
                        <span className="duty-history-group">{record.startTime}-{record.endTime} {record.shifts}班{record.enableSecond ? ' + 时段2' : ''}</span>
                        <span className="duty-history-time">生成于 {record.createdAt}</span>
                      </div>
                      <div className="duty-history-ops">
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
        </div>

        {toast && <div className="toast">{toast}</div>}
      </div>
    );
  }

  // 非 embedded 模式（独立使用）
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
            <h1 style={{ fontSize: '18px', fontWeight: 600, color: '#111827' }}>大门口值班</h1>
            <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 500, background: '#fff7ed', color: '#ea580c' }}>时段排班</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '13px', color: '#6b7280' }}>排班日期：</span>
          <span style={{ fontSize: '14px', fontWeight: 500, color: '#374151', padding: '4px 12px', background: '#f3f4f6', borderRadius: '6px' }}>明天</span>
        </div>
      </header>

      <main style={{ flex: 1, padding: '28px 32px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
          {/* 左侧：排班参数 */}
          <div style={{ width: '360px', flexShrink: 0, background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#111827', marginBottom: '16px' }}>排班参数</h3>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '10px' }}>时间段1</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '10px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px', display: 'block' }}>开始时间</label>
                  <input type="time" value={startTime} onChange={(e) => { setStartTime(e.target.value); setResult(null); }} style={timeInputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px', display: 'block' }}>结束时间</label>
                  <input type="time" value={endTime} onChange={(e) => { setEndTime(e.target.value); setResult(null); }} style={timeInputStyle} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px', display: 'block' }}>分几班</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input type="number" min="1" max="12" value={shifts} onChange={(e) => { const v = Math.max(1, Math.min(12, parseInt(e.target.value) || 1)); setShifts(v); setResult(null); }} style={{ ...timeInputStyle, width: '80px', textAlign: 'center' }} />
                  <span style={{ fontSize: '13px', color: '#6b7280' }}>班</span>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '16px', padding: '10px', background: '#f9fafb', borderRadius: '8px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#374151', fontWeight: 500 }}>
                <input type="checkbox" checked={enableSecond} onChange={(e) => { setEnableSecond(e.target.checked); setResult(null); }} />
                启用时间段2
              </label>
            </div>

            {enableSecond && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '10px' }}>时间段2</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '10px' }}>
                  <div>
                    <label style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px', display: 'block' }}>开始时间</label>
                    <input type="time" value={startTime2} onChange={(e) => { setStartTime2(e.target.value); setResult(null); }} style={timeInputStyle} />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px', display: 'block' }}>结束时间</label>
                    <input type="time" value={endTime2} onChange={(e) => { setEndTime2(e.target.value); setResult(null); }} style={timeInputStyle} />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px', display: 'block' }}>分几班</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input type="number" min="1" max="12" value={shifts2} onChange={(e) => { const v = Math.max(1, Math.min(12, parseInt(e.target.value) || 1)); setShifts2(v); setResult(null); }} style={{ ...timeInputStyle, width: '80px', textAlign: 'center' }} />
                    <span style={{ fontSize: '13px', color: '#6b7280' }}>班</span>
                  </div>
                </div>
              </div>
            )}

            <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px' }}>
              现有男生 <span style={{ fontWeight: 600, color: '#374151' }}>{maleCount}</span> 人，
              需 <span style={{ fontWeight: 600, color: '#374151' }}>{totalNeeded}</span> 人次
            </div>
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleGenerate}>生成排班</button>
          </div>

          {/* 右侧：排班数据 */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {result ? (
              <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', background: '#f8fafc', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ width: '4px', height: '18px', background: '#ea580c', borderRadius: '2px' }}></span>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#111827' }}>排班结果</h3>
                    <span style={{ fontSize: '13px', color: '#6b7280' }}>{result.dateStr} {result.weekStr}</span>
                  </div>
                  <button className="btn btn-secondary btn-sm" onClick={() => { navigator.clipboard?.writeText(renderTextFromRecord(result)); showToast('已复制到剪贴板'); }}>复制文本</button>
                </div>
                <div style={{ padding: '24px 28px' }}>
                  <pre style={{ margin: 0, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: '15px', lineHeight: 2.2, color: '#1f2937', whiteSpace: 'pre-wrap' }}>{renderTextFromRecord(result)}</pre>
                </div>
              </div>
            ) : (
              <div style={{ background: '#fff', borderRadius: '12px', border: '1px dashed #d1d5db', padding: '60px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 500, color: '#374151' }}>暂无排班</h3>
                <p style={{ fontSize: '13px', color: '#9ca3af', textAlign: 'center', maxWidth: '300px', lineHeight: 1.6 }}>设置好起止时间和班次数量后，点击"生成排班"</p>
                <button className="btn btn-primary" onClick={handleGenerate}>立即生成</button>
              </div>
            )}
          </div>
        </div>
      </main>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

Object.assign(window, { GatePage });
