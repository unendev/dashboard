import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import TimerPage from './pages/Timer';
import ProjectListPage from './pages/ProjectList';
import ProjectDetailPage from './pages/ProjectDetail';
import MemoPage from './pages/Memo';
import AIPage from './pages/AI';
import SettingsPage from './pages/Settings';
import CreatePage from './pages/Create';
import LoginPage from './pages/Login';
import PromptLibraryPage from './pages/PromptLibrary';
import { ErrorBoundary } from './components/shared/ErrorBoundary';
import { API_BASE_URL } from './lib/api';
import { validateTokenOrigin } from './lib/auth-token';

// 在应用启动时验证 Token 来源
// 如果 API 地址变化（如从本地切到生产），自动清除旧 Token
validateTokenOrigin(API_BASE_URL);

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          <Route path="/timer" element={<TimerPage />} />
          <Route path="/todo" element={<ProjectListPage />} />
          <Route path="/project/:id" element={<ProjectDetailPage />} />
          <Route path="/memo" element={<MemoPage />} />
          <Route path="/ai" element={<AIPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/create" element={<CreatePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/prompt-library" element={<PromptLibraryPage />} />
          <Route path="/" element={<Navigate to="/timer" replace />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
