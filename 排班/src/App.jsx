function App() {
  const [page, setPage] = React.useState('home');
  const [pageParams, setPageParams] = React.useState({});
  const [pageKey, setPageKey] = React.useState(0);

  const navigate = (target, params = {}) => {
    setPage(target);
    setPageParams(params);
    setPageKey(k => k + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  let content;
  if (page === 'home') {
    content = <DutyMainPage key={pageKey} onNavigate={navigate} />;
  } else if (page === 'staff') {
    content = <StaffPage key={pageKey} onNavigate={navigate} />;
  } else if (page === 'schedule') {
    content = <SchedulePage key={pageKey} mode={pageParams.mode || 'all'} onNavigate={navigate} />;
  } else if (page === 'dutySelect') {
    content = <DutyMainPage key={pageKey} onNavigate={navigate} />;
  } else if (page === 'gate') {
    content = <GatePage key={pageKey} onNavigate={navigate} />;
  }

  return (
    <StoreProvider>
      {content}
    </StoreProvider>
  );
}

Object.assign(window, { App });
