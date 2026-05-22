import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import InstallPrompt from '../pwa/InstallPrompt';
import OfflineBanner from '../pwa/OfflineBanner';
import { ROUTES } from '../../constants/routes';

const pageMeta = {
  [ROUTES.dashboard]: {
    title: 'Dashboard',
    subtitle: 'Resumen general y seguimientos pendientes',
  },
  [ROUTES.photoInbox]: {
    title: 'Bandeja de Fotos',
    subtitle: 'Captura, vista previa y asignación de fotos de visita',
  },
  [ROUTES.today]: {
    title: 'Hoy',
    subtitle: 'Centro de trabajo — tareas comerciales del día',
  },
  [ROUTES.importSuppliers]: {
    title: 'Importar Proveedores',
    subtitle: 'Carga inicial desde Excel — PROVEEDORES POT.',
  },
  [ROUTES.suppliers]: {
    title: 'Proveedores',
    subtitle: 'Ficha con contactos, oportunidades y actividades',
  },
  [ROUTES.contacts]: {
    title: 'Contactos',
    subtitle: 'Personas de contacto por proveedor',
  },
  [ROUTES.opportunities]: {
    title: 'Oportunidades de compra',
    subtitle: 'Negociación y seguimiento de compras de material',
  },
  [ROUTES.activities]: {
    title: 'Actividades',
    subtitle: 'Seguimiento e interacciones con proveedores',
  },
  [ROUTES.followUps]: {
    title: 'Seguimientos',
    subtitle: 'Vencidos, hoy y próximos compromisos con proveedores',
  },
  [ROUTES.intelligence]: {
    title: 'Inteligencia Comercial',
    subtitle: 'KPIs, ranking y recomendaciones para priorizar compras',
  },
  [ROUTES.dataQuality]: {
    title: 'Calidad de Datos',
    subtitle: 'Duplicados, completitud, scoring y enriquecimiento de proveedores',
  },
};

export default function Layout() {
  const { pathname } = useLocation();
  const meta = pageMeta[pathname] || { title: 'CRM BRASSUR', subtitle: '' };
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="app-layout">
      <OfflineBanner />
      <button
        type="button"
        className={`sidebar-backdrop ${menuOpen ? 'sidebar-backdrop--visible' : ''}`}
        aria-hidden={!menuOpen}
        tabIndex={menuOpen ? 0 : -1}
        onClick={closeMenu}
      />
      <Sidebar mobileOpen={menuOpen} onNavigate={closeMenu} />
      <div className="main-wrapper">
        <Topbar
          title={meta.title}
          subtitle={meta.subtitle}
          onMenuToggle={() => setMenuOpen((v) => !v)}
          menuOpen={menuOpen}
        />
        <main className="main-content">
          <InstallPrompt />
          <Outlet />
        </main>
      </div>
    </div>
  );
}
