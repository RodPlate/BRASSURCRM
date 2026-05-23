export default function FloatingActionButton({
  open,
  onToggle,
  onClose,
  onQuickActivity,
  onQuickOpportunity,
  onQuickPhoto,
  onNewSupplier,
}) {
  return (
    <>
      {open && (
        <button
          type="button"
          className="fab-backdrop"
          aria-label="Cerrar menú"
          onClick={onClose}
        />
      )}
      <div className={`fab-menu ${open ? 'fab-menu--open' : ''}`}>
        {open && (
          <div className="fab-menu__actions" role="menu">
            <button type="button" className="fab-menu__item" onClick={onQuickActivity}>
              <span>📞</span> Actividad rápida
            </button>
            <button type="button" className="fab-menu__item" onClick={onQuickOpportunity}>
              <span>🎯</span> Oportunidad rápida
            </button>
            <button type="button" className="fab-menu__item" onClick={onQuickPhoto}>
              <span>📷</span> Tomar foto
            </button>
            <button type="button" className="fab-menu__item" onClick={onNewSupplier}>
              <span>🏭</span> Nuevo proveedor
            </button>
          </div>
        )}
        <button
          type="button"
          className={`fab ${open ? 'fab--open' : ''}`}
          aria-label={open ? 'Cerrar acciones' : 'Acciones rápidas'}
          aria-expanded={open}
          onClick={onToggle}
        >
          +
        </button>
      </div>
    </>
  );
}
