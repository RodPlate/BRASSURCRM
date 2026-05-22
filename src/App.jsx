import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/layout/Layout';
import LoginPage from './pages/Login/LoginPage';
import Dashboard from './pages/Dashboard';
import SuppliersPage from './pages/Suppliers/SuppliersPage';
import ContactsPage from './pages/Contacts/ContactsPage';
import ActivitiesPage from './pages/Activities/ActivitiesPage';
import OpportunitiesPage from './pages/Opportunities/OpportunitiesPage';
import FollowUpsPage from './pages/FollowUps/FollowUpsPage';
import IntelligencePage from './pages/Intelligence/IntelligencePage';
import DataQualityPage from './pages/DataQuality/DataQualityPage';
import HoyPage from './pages/WorkCenter/HoyPage';
import PhotoInboxPage from './pages/PhotoInbox/PhotoInboxPage';
import ImportarProveedores from './pages/ImportarProveedores';
import { ROUTES } from './constants/routes';
import InstallPrompt from './components/pwa/InstallPrompt';
import InactivityWatcher from './components/auth/InactivityWatcher';

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <>
        <InstallPrompt />
        <div className="loading" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          Verificando sesión…
        </div>
      </>
    );
  }

  if (!user) {
    return (
      <>
        <InstallPrompt />
        <LoginPage />
      </>
    );
  }

  return (
    <>
      <InactivityWatcher />
      <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="fotos" element={<PhotoInboxPage />} />
        <Route path="hoy" element={<HoyPage />} />
        <Route path="proveedores" element={<SuppliersPage />} />
        <Route path="importar-proveedores" element={<ImportarProveedores />} />
        <Route path="importar" element={<Navigate to={ROUTES.importSuppliers} replace />} />
        <Route path="contactos" element={<ContactsPage />} />
        <Route path="actividades" element={<ActivitiesPage />} />
        <Route path="oportunidades" element={<OpportunitiesPage />} />
        <Route path="seguimientos" element={<FollowUpsPage />} />
        <Route path="inteligencia" element={<IntelligencePage />} />
        <Route path="calidad-datos" element={<DataQualityPage />} />
      </Route>
    </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
