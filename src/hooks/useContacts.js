import { useEffect, useState } from 'react';
import { subscribeContacts } from '../services/contactsService';

export function useContacts() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeContacts((data) => {
      setContacts(data);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const getContactName = (id) => {
    if (!id) return '—';
    const c = contacts.find((x) => x.id === id);
    return c?.name || '—';
  };

  const contactsBySupplier = (supplierId) =>
    contacts.filter((c) => c.supplierId === supplierId);

  return { contacts, loading, getContactName, contactsBySupplier };
}
