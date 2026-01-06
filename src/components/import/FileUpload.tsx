'use client';

import { useCallback, useRef, useState } from 'react';
import { Upload, FileText, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/lib/contexts/LanguageContext';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  selectedFile?: File | null;
  onClear?: () => void;
}

export function FileUpload({
  onFileSelect,
  accept = '.csv',
  selectedFile,
  onClear,
}: FileUploadProps) {
  const { t } = useLanguage();
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file && file.name.endsWith('.csv')) {
        onFileSelect(file);
      }
    },
    [onFileSelect]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        onFileSelect(file);
      }
    },
    [onFileSelect]
  );

  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (inputRef.current) {
        inputRef.current.value = '';
      }
      onClear?.();
    },
    [onClear]
  );

  if (selectedFile) {
    return (
      <div className="bg-card rounded-2xl border border-border/50 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <FileText className="h-6 w-6 text-emerald-500" />
            </div>
            <div>
              <p className="font-medium text-sm">{selectedFile.name}</p>
              <p className="text-xs text-muted-foreground">
                {t('import.fileSelected')} - {(selectedFile.size / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>
          <button
            onClick={handleClear}
            className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
            aria-label={t('import.removeFile')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        'relative rounded-2xl border-2 border-dashed p-8 transition-all cursor-pointer',
        'hover:border-primary/50 hover:bg-primary/5',
        isDragging
          ? 'border-primary bg-primary/10'
          : 'border-border/50 bg-card'
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
      />
      <div className="flex flex-col items-center justify-center text-center space-y-4">
        <div
          className={cn(
            'w-16 h-16 rounded-2xl flex items-center justify-center transition-colors',
            isDragging ? 'bg-primary/20' : 'bg-muted'
          )}
        >
          <Upload
            className={cn(
              'h-8 w-8 transition-colors',
              isDragging ? 'text-primary' : 'text-muted-foreground'
            )}
          />
        </div>
        <div>
          <p className="font-medium text-base">{t('import.uploadFile')}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {t('import.dragDrop')}
          </p>
        </div>
        <p className="text-xs text-muted-foreground">CSV files only</p>
      </div>
    </div>
  );
}
