export function Modal({ children, onClose, size = 'md', backdropClose = true, dim = 'rgba(0,0,0,0.4)' }) {
  const widths = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-2xl', full: 'max-w-6xl' };
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
         style={{ background: dim }}
         onClick={() => backdropClose && onClose?.()}>
      <div className={`bg-white rounded-xl shadow-xl w-full ${widths[size]}`}
           onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}
