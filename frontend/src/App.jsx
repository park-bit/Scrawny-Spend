import { Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/authStore';
import AppLayout    from './components/layout/AppLayout';

// Pages
import Login          from './pages/Login';
import Register       from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard      from './pages/Dashboard';
import AddExpense   from './pages/AddExpense';
import History      from './pages/History';
import Analytics    from './pages/Analytics';
import AIInsights   from './pages/AIInsights';
import Settings     from './pages/Settings';

function PrivateRoute({ children }) {
  const token = useAuthStore((s) => s.accessToken);
  return token ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const token = useAuthStore((s) => s.accessToken);
  return token ? <Navigate to="/" replace /> : children;
}

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login"    element={<PublicRoute><Login    /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
      <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />

      {/* Protected – wrapped in persistent shell */}
      <Route path="/" element={<PrivateRoute><AppLayout /></PrivateRoute>}>
        <Route index            element={<Dashboard  />} />
        <Route path="add"       element={<AddExpense />} />
        <Route path="history"   element={<History    />} />
        <Route path="analytics" element={<Analytics  />} />
        <Route path="ai"        element={<AIInsights />} />
        <Route path="settings"  element={<Settings   />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
