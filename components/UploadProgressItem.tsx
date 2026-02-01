import React from 'react';
import { SavingSpinner } from './icons/SavingSpinner';
import { ErrorIcon } from './icons/ErrorIcon';

interface UploadProgressItemProps {
  name: string;
  status: 'uploading' | 'completed' | 'error';
  error?: string;
  dbId?: number;
  isSelected?: boolean;
  onSelect?: (dbId: number) => void;
}

const UploadProgressItem: React.FC<UploadProgressItemProps> = ({ name, status, error, dbId, isSelected, onSelect }) => {
  const getStatusIndicator = () => {
    switch (status) {
      case 'uploading':
        return <SavingSpinner />;
      case 'error':
        return <ErrorIcon />;
      default:
        return null;
    }
  };
  
  const canSelect = status === 'completed' && dbId && onSelect;

  const handleSelect = () => {
    if (canSelect) {
      onSelect(dbId);
    }
  };

  return (
    <div 
      className={`flex items-center justify-between p-3 bg-surface-light/50 rounded-md min-h-[52px] ${canSelect ? 'cursor-pointer hover:bg-surface-light' : ''}`}
      onClick={handleSelect}
    >
      <div className="flex items-center gap-3 overflow-hidden flex-grow">
        <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
            {canSelect ? (
                <input 
                    type="checkbox"
                    checked={isSelected}
                    onChange={handleSelect}
                    onClick={e => e.stopPropagation()}
                    className="h-5 w-5 bg-surface border-border rounded text-primary focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface-light focus:ring-primary"
                    aria-label={`Select ${name}`}
                />
            ) : (
                getStatusIndicator()
            )}
        </div>
        <p className="text-sm text-text-primary truncate" title={name}>{name}</p>
      </div>
      {status === 'error' && error && (
        <p className="text-xs text-red-400 truncate ml-4 flex-shrink-0" title={error}>
          {error}
        </p>
      )}
    </div>
  );
};

export default UploadProgressItem;