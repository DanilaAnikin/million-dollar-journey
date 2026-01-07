'use client';

import { useLanguage } from '@/lib/contexts/LanguageContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export type FieldMapping = 'skip' | 'date' | 'amount' | 'description' | 'currency' | 'type';

interface PreviewTableProps {
  headers: string[];
  rows: string[][];
  columnMapping: Record<string, FieldMapping>;
  onMappingChange: (csvColumn: string, dbField: FieldMapping) => void;
}

const FIELD_OPTIONS: { value: FieldMapping; labelKey: string; required?: boolean }[] = [
  { value: 'skip', labelKey: 'import.skip' },
  { value: 'date', labelKey: 'import.date', required: true },
  { value: 'amount', labelKey: 'import.amount', required: true },
  { value: 'description', labelKey: 'import.description' },
  { value: 'currency', labelKey: 'import.currency' },
  { value: 'type', labelKey: 'import.type' },
];

export function PreviewTable({
  headers,
  rows,
  columnMapping,
  onMappingChange,
}: PreviewTableProps) {
  const { t } = useLanguage();

  // Check if required fields are mapped
  const dateIsMapped = Object.values(columnMapping).includes('date');
  const amountIsMapped = Object.values(columnMapping).includes('amount');
  const isValid = dateIsMapped && amountIsMapped;

  // Get current mappings to disable already-used fields
  const usedMappings = new Set(
    Object.values(columnMapping).filter((v) => v !== 'skip')
  );

  return (
    <div className="space-y-4">
      {/* Validation message */}
      {!isValid && (
        <div className="bg-amber-500/10 text-amber-600 dark:text-amber-400 px-4 py-3 rounded-xl text-sm">
          {t('import.requiredFields')}
        </div>
      )}

      {/* Preview info */}
      <p className="text-sm text-muted-foreground">
        {t('import.previewRows').replace('{count}', String(rows.length))}
      </p>

      {/* Scrollable table container */}
      <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              {/* Mapping row */}
              <tr className="border-b border-border/50 bg-muted/50">
                {headers.map((header, index) => {
                  const currentMapping = columnMapping[header] || 'skip';
                  const isMappedToRequired =
                    currentMapping === 'date' || currentMapping === 'amount';

                  return (
                    <th
                      key={index}
                      className={cn(
                        'p-3 text-left font-normal min-w-[150px]',
                        isMappedToRequired && 'bg-primary/5'
                      )}
                    >
                      <Select
                        value={currentMapping}
                        onValueChange={(value) =>
                          onMappingChange(header, value as FieldMapping)
                        }
                      >
                        <SelectTrigger
                          size="sm"
                          className={cn(
                            'h-9 text-xs',
                            isMappedToRequired &&
                              'border-primary/50 bg-primary/10'
                          )}
                        >
                          <SelectValue placeholder={t('import.mapColumn')} />
                        </SelectTrigger>
                        <SelectContent>
                          {FIELD_OPTIONS.map((option) => {
                            // Disable if already used (except skip and current value)
                            const isDisabled =
                              option.value !== 'skip' &&
                              option.value !== currentMapping &&
                              usedMappings.has(option.value);

                            return (
                              <SelectItem
                                key={option.value}
                                value={option.value}
                                disabled={isDisabled}
                              >
                                <span className="flex items-center gap-2">
                                  {t(option.labelKey as Parameters<typeof t>[0])}
                                  {option.required && (
                                    <span className="text-destructive">*</span>
                                  )}
                                </span>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </th>
                  );
                })}
              </tr>
              {/* Header row */}
              <tr className="border-b border-border/50">
                {headers.map((header, index) => {
                  const currentMapping = columnMapping[header] || 'skip';
                  const isMappedToRequired =
                    currentMapping === 'date' || currentMapping === 'amount';

                  return (
                    <th
                      key={index}
                      className={cn(
                        'p-3 text-left font-medium text-muted-foreground',
                        isMappedToRequired && 'bg-primary/5 text-primary'
                      )}
                    >
                      {header}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className="border-b border-border/30 last:border-0"
                >
                  {row.map((cell, cellIndex) => {
                    const header = headers[cellIndex];
                    const currentMapping = columnMapping[header] || 'skip';
                    const isMappedToRequired =
                      currentMapping === 'date' || currentMapping === 'amount';

                    return (
                      <td
                        key={cellIndex}
                        className={cn(
                          'p-3 truncate max-w-[200px]',
                          isMappedToRequired && 'bg-primary/5'
                        )}
                        title={cell}
                      >
                        {cell || <span className="text-muted-foreground">-</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
