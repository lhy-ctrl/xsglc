function GatePage({ onNavigate, embedded }) {
  const { generateGateDuty, advanceGatePointer, staff, ROLE_LABELS } = useStore();
  const [startTime, setStartTime] = React.useState('14:00');
  const [endTime, setEndTime] = React.useState('18:00');
  const [shifts, setShifts] = React.useState(4);
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
    r.shiftList.forEach((s, i) => {
      s.people.forEach((p, j) => {
        if (p.name === '待分配' || !p.id) {
          emptySlots.push(`${s.start}-${s.end}第${j + 1}人`);
        } else {
          assignedIds.add(p.id);
        }
      });
    });
    // 未参与的男生（排除队长副队长，因为他们默认不参与）
    const normalMales = staff.filter(p => p.gender === 'male' && p.role !== 'captain' && p.role !== 'vice_captain' && p.name && p.name.trim());
    const unusedPeople = normalMales.filter(p => !assignedIds.has(p.id));
    return { emptySlots: [...new Set(emptySlots)], unusedPeople };
  };

  const handleGenerate = () => {
    const maleCount = staff.filter(p => p.gender === 'male').length;
    if (maleCount === 0) { showToast('暂无男生人员，请先在人员管理中添加'); return; }
    if (!startTime || !endTime) { showToast('请填写起止时间'); return; }
    if (shifts < 1) { showToast('班次数量至少为 1'); return; }

    const r = generateGateDuty(startTime, endTime, shifts, dayOffset);
    advanceGatePointer(r.nextPointer);

    const record = {
      id: Date.now(),
      dateStr: r.dateStr,
      weekStr: r.weekStr,
      startTime, endTime, shifts,
      shiftList: r.shiftList,
      usedCaptains: r.usedCaptains,
      createdAt: new Date().toLocaleString('zh-CN'),
    };
    setResult(record);
    setHistory(prev => [record, ...prev].slice(0, 5));

    // 提醒
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
    r.shiftList.forEach(s => {
      const names = s.people.map(p => p?.name || '待分配').join('  ');
      lines.push(`${s.start}——${s.end}  ${names}`);
    });
    lines.push('所有教官13:40前到校打卡，路上注意安全！');
    return lines.join('\n');
  };

  const handleDeleteHistory = (id, e) => {
    e.stopPropagation();
    setHistory(prev => prev.filter(h => h.id !== id));
    showToast('已删除该条记录');
  };

  const currentWarnings = result ? computeWarnings(result) : { emptySlots: [], unusedPeople: [] };
  const maleCount = staff.filter(p => p.gender === 'male').length;

  return (
    <div className={'page-enter' + (embedded ? ' duty-gate-embedded' : '')} style={{ minHeight: embedded ? 'auto' : '100vh', display: 'flex', flexDirection: 'column' }}>
      {!embedded && (
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
      )}

      <main style={{ flex: 1, padding: embedded ? '0' : '28px 32px', maxWidth: embedded ? 'none' : '800px', margin: embedded ? '0' : '0 auto', width: '100%' }}>
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '24px', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#111827', marginBottom: '16px' }}>排班参数</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            <div>
              <label style={{ fontSize: '13px', color: '#374151', marginBottom: '6px', display: 'block', fontWeight: 500 }}>开始时间</label>
              <input type="time" value={startTime} onChange={(e) => { setStartTime(e.target.value); setResult(null); }} style={timeInputStyle} />
            </div>
            <div>
              <label style={{ fontSize: '13px', color: '#374151', marginBottom: '6px', display: 'block', fontWeight: 500 }}>结束时间</label>
              <input type="time" value={endTime} onChange={(e) => { setEndTime(e.target.value); setResult(null); }} style={timeInputStyle} />
            </div>
            <div>
              <label style={{ fontSize: '13px', color: '#374151', marginBottom: '6px', display: 'block', fontWeight: 500 }}>分几班</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="number" min="1" max="12" value={shifts}
                  onChange={(e) => {
                    const v = Math.max(1, Math.min(12, parseInt(e.target.value) || 1));
                    setShifts(v); setResult(null);
                  }}
                  style={{ ...timeInputStyle, width: '80px', textAlign: 'center' }}
                />
                <span style={{ fontSize: '13px', color: '#6b7280' }}>班</span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ fontSize: '13px', color: '#6b7280' }}>
              现有男生 <span style={{ fontWeight: 600, color: '#374151' }}>{maleCount}</span> 人，
              需 <span style={{ fontWeight: 600, color: '#374151' }}>{shifts * 2}</span> 人次
              {maleCount < shifts * 2 && (
                <span style={{ color: '#ea580c', marginLeft: '6px' }}>（不足，将由副队长/队长补足）</span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('staff')}>人员管理</button>
              <button className="btn btn-primary" onClick={handleGenerate}>生成排班</button>
            </div>
          </div>
        </div>

        {result ? (
          <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', background: '#f8fafc', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ width: '4px', height: '18px', background: '#ea580c', borderRadius: '2px' }}></span>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#111827' }}>排班结果</h3>
                <span style={{ fontSize: '13px', color: '#6b7280' }}>{result.dateStr} {result.weekStr}</span>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => {
                navigator.clipboard?.writeText(renderTextFromRecord(result));
                showToast('已复制到剪贴板');
              }}>复制文本</button>
            </div>
            {(currentWarnings.emptySlots.length > 0 || currentWarnings.unusedPeople.length > 0) && (
              <div style={{ padding: '12px 20px', background: '#fffbeb', borderBottom: '1px solid #fcd34d', fontSize: '13px', color: '#92400e', lineHeight: 1.8 }}>
                {currentWarnings.emptySlots.length > 0 && (
                  <div>⚠️ 以下时段有空缺：<span style={{ fontWeight: 600 }}>{currentWarnings.emptySlots.join('、')}</span></div>
                )}
                {currentWarnings.unusedPeople.length > 0 && (
                  <div>⚠️ 以下男生未参与值班：<span style={{ fontWeight: 600 }}>{currentWarnings.unusedPeople.map(p => p.name).join('、')}</span></div>
                )}
              </div>
            )}
            <div style={{ padding: '24px 28px' }}>
              <pre style={{
                margin: 0,
                fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
                fontSize: '15px', lineHeight: 2.2, color: '#1f2937', whiteSpace: 'pre-wrap',
              }}>
                {renderTextFromRecord(result)}
              </pre>
              {result.usedCaptains && result.usedCaptains.length > 0 && (
                <div style={{ marginTop: '16px', padding: '10px 14px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '8px', fontSize: '13px', color: '#92400e' }}>
                  <span style={{ fontWeight: 500 }}>提示：</span>
                  男生人数不足，以下干部参与了值班：
                  {result.usedCaptains.map((p, i) => (
                    <span key={i} style={{ margin: '0 4px' }}>{p.name}（{ROLE_LABELS[p.role]}）</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ background: '#fff', borderRadius: '12px', border: '1px dashed #d1d5db', padding: '60px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: 500, color: '#374151' }}>暂无排班</h3>
            <p style={{ fontSize: '13px', color: '#9ca3af', textAlign: 'center', maxWidth: '300px', lineHeight: 1.6 }}>
              设置好起止时间和班次数量后，点击"生成排班"
            </p>
            <button className="btn btn-primary" onClick={handleGenerate}>立即生成</button>
          </div>
        )}

        {/* 历史记录 */}
        {history.length > 0 && (
          <div style={{ marginTop: '24px', background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', background: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ width: '4px', height: '18px', background: '#6b7280', borderRadius: '2px' }}></span>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#111827' }}>历史记录</h3>
                <span style={{ fontSize: '13px', color: '#9ca3af' }}>最近 {history.length} 条（最多5条）</span>
              </div>
            </div>
            <div>
              {history.map((record, idx) => (
                <div key={record.id} style={{ borderBottom: idx < history.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                  <div style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ cursor: 'pointer', flex: 1 }} onClick={() => setResult({ ...record })}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#374151', minWidth: '80px' }}>{record.dateStr}</span>
                        <span style={{ fontSize: '12px', color: '#9ca3af' }}>{record.weekStr}</span>
                        <span style={{ fontSize: '12px', color: '#6b7280' }}>{record.startTime}-{record.endTime} {record.shifts}班</span>
                        <span style={{ fontSize: '11px', color: '#d1d5db' }}>生成于 {record.createdAt}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn btn-ghost btn-sm" onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard?.writeText(renderTextFromRecord(record));
                        showToast('已复制到剪贴板');
                      }}>复制</button>
                      <button className="btn btn-danger btn-sm" onClick={(e) => handleDeleteHistory(record.id, e)}>删除</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

const timeInputStyle = {
  width: '100%', padding: '8px 12px', border: '1px solid #d1d5db',
  borderRadius: '6px', fontSize: '14px', outline: 'none', background: '#fff',
};

Object.assign(window, { GatePage });
