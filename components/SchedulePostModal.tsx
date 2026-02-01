import React, { useState, useEffect } from 'react';
import Spinner from './Spinner';

interface SchedulePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSchedule: (publishAt: Date) => void;
  isScheduling: boolean;
}

const SchedulePostModal: React.FC<SchedulePostModalProps> = ({ isOpen, onClose, onSchedule, isScheduling }) => {
  const [publishAt, setPublishAt] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Set default to 1 hour from now
      const now = new Date();
      now.setHours(now.getHours() + 1);
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      setPublishAt(`${year}-${month}-${day}T${hours}:${minutes}`);
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }
  
  const handleConfirm = () => {
      const selectedDate = new Date(publishAt);
      if (isNaN(selectedDate.getTime())) {
          setError("Invalid date format.");
          return;
      }
      if (selectedDate <= new Date()) {
          setError("Please select a time in the future.");
          return;
      }
      setError(null);
      onSchedule(selectedDate);
  }

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
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="modal-title" className="text-lg font-bold text-text-primary">Schedule Post</h3>
        <p className="mt-2 text-sm text-text-secondary">
          Select a future date and time to automatically publish this post.
        </p>

        <div className="mt-4">
            <label htmlFor="publish-datetime" className="block text-sm font-medium text-text-secondary mb-2">Publish Date & Time</label>
            <input
                type="datetime-local"
                id="publish-datetime"
                value={publishAt}
                // FIX: Cast event.target to 'any' to access its 'value' property due to TS lib issue.
                onChange={(e) => setPublishAt((e.target as any).value)}
                className="w-full bg-surface-light border-border rounded-md text-text-primary focus:ring-primary focus:border-primary p-2"
                min={new Date().toISOString().slice(0, 16)}
            />
            {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
        </div>

        <div className="mt-6 flex justify-end gap-4">
          <button
            onClick={onClose}
            disabled={isScheduling}
            className="px-4 py-2 bg-surface-light text-text-primary rounded-md hover:bg-border transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isScheduling}
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-hover disabled:bg-indigo-900 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
          >
            {isScheduling ? <Spinner /> : null}
            {isScheduling ? 'Scheduling...' : 'Confirm Schedule'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SchedulePostModal;