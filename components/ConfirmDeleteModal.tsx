

import React from 'react';
import Spinner from './Spinner';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}

const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({ isOpen, onClose, onConfirm, isDeleting }) => {
  if (!isOpen) {
    return null;
  }

  // Handle keydown events for accessibility
  const handleKeyDown = (event: KeyboardEvent) => {
    // FIX: Cast event to 'any' to access 'key' property due to TS lib issue.
    if ((event as any).key === 'Escape') {
      onClose();
    }
  };

  React.useEffect(() => {
    // FIX: Cast 'window' to 'any' to bypass TS lib issue with 'document'.
    (window as any).document.addEventListener('keydown', handleKeyDown);
    return () => {
      // FIX: Cast 'window' to 'any' to bypass TS lib issue with 'document'.
      (window as any).document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);


  return (
    <div
        className="fixed inset-0 bg-background/70 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity duration-300"
        aria-labelledby="modal-title"
        role="dialog"
        aria-modal="true"
        onClick={onClose}
    >
      <div
        className="bg-surface rounded-lg shadow-xl p-6 w-full max-w-md mx-4 border border-border"
        onClick={(e) => e.stopPropagation()} // Prevent modal from closing when clicking inside
      >
        <h3 id="modal-title" className="text-lg font-bold text-text-primary">Delete Post</h3>
        <p className="mt-2 text-sm text-text-secondary">
          Are you sure you want to permanently delete this post? This action cannot be undone.
        </p>
        <div className="mt-6 flex justify-end gap-4">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 bg-surface-light text-text-primary rounded-md hover:bg-border transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface focus:ring-border"
            aria-label="Cancel deletion"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-red-900 disabled:cursor-not-allowed flex items-center gap-2 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface focus:ring-red-500"
            aria-label="Confirm deletion"
          >
            {isDeleting ? <Spinner /> : null}
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDeleteModal;