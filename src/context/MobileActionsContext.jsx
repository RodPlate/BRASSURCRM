import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { subscribeSuppliers } from '../services/suppliersService';
import { subscribeContacts } from '../services/contactsService';
import QuickActivityModal from '../components/mobile/QuickActivityModal';
import QuickPhotoPickerModal from '../components/mobile/QuickPhotoPickerModal';
import OpportunityFormModal from '../components/opportunities/OpportunityFormModal';
import SupplierCreateModal from '../components/suppliers/SupplierCreateModal';
import { getLastSupplierId } from '../utils/mobilePrefs';

const MobileActionsContext = createContext(null);

export function MobileActionsProvider({ children }) {
  const [suppliers, setSuppliers] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [fabOpen, setFabOpen] = useState(false);
  const [quickActivityOpen, setQuickActivityOpen] = useState(false);
  const [quickOpportunityOpen, setQuickOpportunityOpen] = useState(false);
  const [quickPhotoOpen, setQuickPhotoOpen] = useState(false);
  const [newSupplierOpen, setNewSupplierOpen] = useState(false);
  const [editSupplier, setEditSupplier] = useState(null);
  const [opportunitySupplierId, setOpportunitySupplierId] = useState('');
  const [photoSupplierId, setPhotoSupplierId] = useState('');

  useEffect(() => {
    const unsubs = [
      subscribeSuppliers(setSuppliers),
      subscribeContacts(setContacts),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  const openQuickActivity = useCallback(() => {
    setFabOpen(false);
    setQuickActivityOpen(true);
  }, []);

  const openQuickOpportunity = useCallback((supplierId = '') => {
    setFabOpen(false);
    setOpportunitySupplierId(supplierId || getLastSupplierId());
    setQuickOpportunityOpen(true);
  }, []);

  const openQuickPhoto = useCallback((supplierId = '') => {
    setFabOpen(false);
    setPhotoSupplierId(supplierId);
    setQuickPhotoOpen(true);
  }, []);

  const openNewSupplier = useCallback(() => {
    setFabOpen(false);
    setNewSupplierOpen(true);
  }, []);

  const openEditSupplier = useCallback((supplier) => {
    setFabOpen(false);
    setEditSupplier(supplier);
  }, []);

  const value = useMemo(
    () => ({
      suppliers,
      contacts,
      fabOpen,
      setFabOpen,
      openQuickActivity,
      openQuickOpportunity,
      openQuickPhoto,
      openNewSupplier,
      openEditSupplier,
      openFabMenu: () => setFabOpen(true),
    }),
    [
      suppliers,
      contacts,
      fabOpen,
      openQuickActivity,
      openQuickOpportunity,
      openQuickPhoto,
      openNewSupplier,
      openEditSupplier,
    ]
  );

  return (
    <MobileActionsContext.Provider value={value}>
      {children}
      <QuickActivityModal
        open={quickActivityOpen}
        onClose={() => setQuickActivityOpen(false)}
        suppliers={suppliers}
      />
      <OpportunityFormModal
        open={quickOpportunityOpen}
        onClose={() => setQuickOpportunityOpen(false)}
        defaultSupplierId={opportunitySupplierId || getLastSupplierId()}
        suppliers={suppliers}
        lockSupplier={
          !!(opportunitySupplierId || getLastSupplierId()) &&
          suppliers.some((s) => s.id === (opportunitySupplierId || getLastSupplierId()))
        }
      />
      <QuickPhotoPickerModal
        open={quickPhotoOpen}
        onClose={() => setQuickPhotoOpen(false)}
        suppliers={suppliers}
        defaultSupplierId={photoSupplierId}
      />
      <SupplierCreateModal
        open={newSupplierOpen}
        onClose={() => setNewSupplierOpen(false)}
        suppliers={suppliers}
      />
      <SupplierCreateModal
        open={!!editSupplier}
        supplier={editSupplier}
        onClose={() => setEditSupplier(null)}
        suppliers={suppliers}
      />
    </MobileActionsContext.Provider>
  );
}

export function useMobileActions() {
  const ctx = useContext(MobileActionsContext);
  if (!ctx) {
    throw new Error('useMobileActions debe usarse dentro de MobileActionsProvider');
  }
  return ctx;
}
