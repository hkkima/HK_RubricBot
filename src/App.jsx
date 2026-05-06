import React, { useState, useCallback } from 'react';
import { WorkflowProvider } from './context/WorkflowContext.jsx';
import { useModelSelector } from './hooks/useModelSelector.js';
import Sidebar from './components/Layout/Sidebar.jsx';
import TopNav from './components/Layout/TopNav.jsx';
import Toast from './components/common/Toast.jsx';
import RubricGeneratePage from './pages/RubricGeneratePage.jsx';
import GradingPage from './pages/GradingPage.jsx';
import LibraryPage from './pages/LibraryPage.jsx';

function AppInner() {
  const [activePage, setActivePage] = useState('rubric');
  const [toast, setToast] = useState(null);
  const modelSelector = useModelSelector();

  const notify = useCallback((type, message) => setToast({ type, message, id: Date.now() }), []);
  const navigate = useCallback((page) => {
    setActivePage(page === 'assignment' ? 'rubric' : page);
  }, []);

  const pageProps = { modelSelector, notify, onNavigate: navigate };

  return (
    <div className="flex h-screen bg-surface text-text">
      <Sidebar modelSelector={modelSelector} activePage={activePage} onNavigate={navigate} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopNav activePage={activePage} onChange={navigate} />
        <main className="flex-1 overflow-y-auto">
          {activePage === 'rubric' && <RubricGeneratePage {...pageProps} />}
          {activePage === 'grading' && <GradingPage {...pageProps} />}
          {activePage === 'library' && <LibraryPage {...pageProps} />}
        </main>
      </div>
      {toast && <Toast key={toast.id} type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
    </div>
  );
}

export default function App() {
  return (
    <WorkflowProvider>
      <AppInner />
    </WorkflowProvider>
  );
}
