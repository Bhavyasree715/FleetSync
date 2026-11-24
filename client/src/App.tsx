import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';
import { Header } from './components/common/Header';
import { Sidebar } from './components/common/Sidebar';

// Pages
import { Login } from './pages/Login';
import { DriverView } from './pages/driver/DriverView';
import { LiveMap } from './pages/manager/LiveMap';
import { AlertCenter } from './pages/manager/AlertCenter';
import { TripDispatch } from './pages/manager/TripDispatch';
import { HistoryReplay } from './pages/manager/HistoryReplay';
import { AnalyticsDashboard } from './pages/manager/AnalyticsDashboard';
import { Reports } from './pages/manager/Reports';
import { VehicleManagement } from './pages/manager/VehicleManagement';
import { GeofenceEditor } from './pages/manager/GeofenceEditor';
import { MaintenanceFuel } from './pages/manager/MaintenanceFuel';
import { SettingsPage } from './pages/manager/SettingsPage';
import { CustomerTracking } from './pages/public/CustomerTracking';

// Protected Route Guard
const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRole?: 'manager' | 'driver' }> = ({
  children,
  allowedRole,
}) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-xs text-white">
        Loading session...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Manager Shell with Header and Sidebar Layout
const ManagerLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          isSimulating={isSimulating}
          onSimulationChange={setIsSimulating}
        />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export const AppContent: React.FC = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/track/:trackingCode" element={<CustomerTracking />} />

      {/* Driver Mobile View (Accessible to Driver & Manager) */}
      <Route
        path="/driver"
        element={
          <ProtectedRoute>
            <DriverView />
          </ProtectedRoute>
        }
      />

      {/* Manager Console Pages wrapped with ManagerLayout */}
      <Route
        path="/map"
        element={
          <ProtectedRoute allowedRole="manager">
            <ManagerLayout>
              <LiveMap />
            </ManagerLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/alerts"
        element={
          <ProtectedRoute allowedRole="manager">
            <ManagerLayout>
              <AlertCenter />
            </ManagerLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dispatch"
        element={
          <ProtectedRoute allowedRole="manager">
            <ManagerLayout>
              <TripDispatch />
            </ManagerLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/history"
        element={
          <ProtectedRoute allowedRole="manager">
            <ManagerLayout>
              <HistoryReplay />
            </ManagerLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/analytics"
        element={
          <ProtectedRoute allowedRole="manager">
            <ManagerLayout>
              <AnalyticsDashboard />
            </ManagerLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute allowedRole="manager">
            <ManagerLayout>
              <Reports />
            </ManagerLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/vehicles"
        element={
          <ProtectedRoute allowedRole="manager">
            <ManagerLayout>
              <VehicleManagement />
            </ManagerLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/geofences"
        element={
          <ProtectedRoute allowedRole="manager">
            <ManagerLayout>
              <GeofenceEditor />
            </ManagerLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/maintenance"
        element={
          <ProtectedRoute allowedRole="manager">
            <ManagerLayout>
              <MaintenanceFuel />
            </ManagerLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute allowedRole="manager">
            <ManagerLayout>
              <SettingsPage />
            </ManagerLayout>
          </ProtectedRoute>
        }
      />

      {/* Default fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <BrowserRouter>
            <AppContent />
          </BrowserRouter>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
};

export default App;
