import { useEffect, useState } from 'react';
import { subscribeSuppliers } from '../services/suppliersService';

export function useSuppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeSuppliers((data) => {
      setSuppliers(data);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const getSupplierName = (id) => {
    const s = suppliers.find((x) => x.id === id);
    return s?.companyName || '—';
  };

  return { suppliers, loading, getSupplierName };
}
