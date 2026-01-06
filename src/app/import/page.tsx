'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Papa from 'papaparse';
import { toast } from 'sonner';
import {
  Upload,
  TableProperties,
  Settings2,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FileUpload, PreviewTable, FieldMapping } from '@/components/import';
import { useLanguage } from '@/lib/contexts/LanguageContext';
import { getAccountsForTransactions } from '@/app/actions/transactions';
import { createTransaction } from '@/app/actions/transactions';
import type { Account, Currency, TransactionType } from '@/types/database';
import { cn } from '@/lib/utils';

type Step = 1 | 2 | 3 | 4;

interface ParsedData {
  headers: string[];
  rows: string[][];
  allData: Record<string, string>[];
}

const STEPS = [
  { step: 1, icon: Upload, labelKey: 'import.step1' },
  { step: 2, icon: TableProperties, labelKey: 'import.step2' },
  { step: 3, icon: Settings2, labelKey: 'import.step3' },
  { step: 4, icon: CheckCircle2, labelKey: 'import.step4' },
] as const;

export default function ImportPage() {
  const { t } = useLanguage();
  const router = useRouter();

  // State
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [columnMapping, setColumnMapping] = useState<Record<string, FieldMapping>>({});
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [defaultType, setDefaultType] = useState<'income' | 'expense'>('expense');
  const [defaultCategory, setDefaultCategory] = useState<string>('');
  const [isImporting, setIsImporting] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const [importComplete, setImportComplete] = useState(false);

  // Load accounts on mount
  useEffect(() => {
    async function loadAccounts() {
      const data = await getAccountsForTransactions();
      setAccounts(data as Account[]);
    }
    loadAccounts();
  }, []);

  // Handle file selection
  const handleFileSelect = useCallback((file: File) => {
    setSelectedFile(file);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta.fields || [];
        const allData = results.data as Record<string, string>[];
        const previewRows = allData.slice(0, 5).map((row) =>
          headers.map((h) => row[h] || '')
        );

        setParsedData({
          headers,
          rows: previewRows,
          allData,
        });

        // Initialize mapping with 'skip' for all columns
        const initialMapping: Record<string, FieldMapping> = {};
        headers.forEach((h) => {
          initialMapping[h] = 'skip';
        });
        setColumnMapping(initialMapping);
      },
      error: (error) => {
        console.error('Parse error:', error);
        toast.error(t('import.parseError'));
      },
    });
  }, [t]);

  // Handle file clear
  const handleFileClear = useCallback(() => {
    setSelectedFile(null);
    setParsedData(null);
    setColumnMapping({});
  }, []);

  // Handle mapping change
  const handleMappingChange = useCallback(
    (csvColumn: string, dbField: FieldMapping) => {
      setColumnMapping((prev) => ({
        ...prev,
        [csvColumn]: dbField,
      }));
    },
    []
  );

  // Check if step can proceed
  const canProceed = useCallback(() => {
    switch (currentStep) {
      case 1:
        return selectedFile !== null && parsedData !== null;
      case 2:
        const dateIsMapped = Object.values(columnMapping).includes('date');
        const amountIsMapped = Object.values(columnMapping).includes('amount');
        return dateIsMapped && amountIsMapped;
      case 3:
        return selectedAccountId !== '';
      case 4:
        return true;
      default:
        return false;
    }
  }, [currentStep, selectedFile, parsedData, columnMapping, selectedAccountId]);

  // Navigation
  const goNext = useCallback(() => {
    if (currentStep < 4 && canProceed()) {
      setCurrentStep((prev) => (prev + 1) as Step);
    }
  }, [currentStep, canProceed]);

  const goBack = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as Step);
    }
  }, [currentStep]);

  // Import transactions
  const handleImport = useCallback(async () => {
    if (!parsedData || !selectedAccountId) return;

    setIsImporting(true);
    setImportedCount(0);

    // Find which columns map to which fields
    const dateColumn = Object.entries(columnMapping).find(([, v]) => v === 'date')?.[0];
    const amountColumn = Object.entries(columnMapping).find(([, v]) => v === 'amount')?.[0];
    const descriptionColumn = Object.entries(columnMapping).find(([, v]) => v === 'description')?.[0];
    const currencyColumn = Object.entries(columnMapping).find(([, v]) => v === 'currency')?.[0];
    const typeColumn = Object.entries(columnMapping).find(([, v]) => v === 'type')?.[0];

    if (!dateColumn || !amountColumn) {
      toast.error(t('import.requiredFields'));
      setIsImporting(false);
      return;
    }

    const selectedAccount = accounts.find((a) => a.id === selectedAccountId);
    const accountCurrency = selectedAccount?.currency || 'USD';

    let successCount = 0;
    let errorCount = 0;

    for (const row of parsedData.allData) {
      try {
        // Parse date
        const dateStr = row[dateColumn];
        if (!dateStr) continue;

        // Try to parse date - handle various formats
        let parsedDate: Date;
        if (dateStr.includes('/')) {
          // MM/DD/YYYY or DD/MM/YYYY
          const parts = dateStr.split('/');
          if (parts.length === 3) {
            // Assume MM/DD/YYYY
            parsedDate = new Date(`${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`);
          } else {
            parsedDate = new Date(dateStr);
          }
        } else if (dateStr.includes('.')) {
          // DD.MM.YYYY (European format)
          const parts = dateStr.split('.');
          if (parts.length === 3) {
            parsedDate = new Date(`${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`);
          } else {
            parsedDate = new Date(dateStr);
          }
        } else {
          parsedDate = new Date(dateStr);
        }

        if (isNaN(parsedDate.getTime())) continue;

        // Parse amount
        let amountStr = row[amountColumn];
        if (!amountStr) continue;

        // Clean amount string - handle various formats
        amountStr = amountStr.replace(/[^\d.,-]/g, '');
        // Handle European format (1.234,56 -> 1234.56)
        if (amountStr.includes(',') && amountStr.includes('.')) {
          if (amountStr.lastIndexOf(',') > amountStr.lastIndexOf('.')) {
            // European: 1.234,56
            amountStr = amountStr.replace(/\./g, '').replace(',', '.');
          } else {
            // US: 1,234.56
            amountStr = amountStr.replace(/,/g, '');
          }
        } else if (amountStr.includes(',') && !amountStr.includes('.')) {
          // Could be European decimal or US thousands
          const parts = amountStr.split(',');
          if (parts.length === 2 && parts[1].length <= 2) {
            // European decimal: 1234,56
            amountStr = amountStr.replace(',', '.');
          } else {
            // US thousands: 1,234
            amountStr = amountStr.replace(/,/g, '');
          }
        }

        const amount = Math.abs(parseFloat(amountStr));
        if (isNaN(amount)) continue;

        // Determine transaction type
        let type: TransactionType = defaultType;
        if (typeColumn && row[typeColumn]) {
          const typeValue = row[typeColumn].toLowerCase();
          if (typeValue.includes('income') || typeValue.includes('prijem') || typeValue.includes('+')) {
            type = 'income';
          } else if (typeValue.includes('expense') || typeValue.includes('vydaj') || typeValue.includes('-')) {
            type = 'expense';
          }
        } else {
          // Infer from original amount sign if no type column
          const originalAmount = row[amountColumn];
          if (originalAmount.startsWith('-') || originalAmount.includes('-')) {
            type = 'expense';
          } else if (originalAmount.startsWith('+')) {
            type = 'income';
          }
        }

        // Get description
        const description = descriptionColumn ? row[descriptionColumn] : undefined;

        // Get currency
        let currency: Currency = accountCurrency;
        if (currencyColumn && row[currencyColumn]) {
          const currencyValue = row[currencyColumn].toUpperCase().trim();
          if (['USD', 'EUR', 'GBP', 'CZK', 'JPY', 'CHF', 'CAD', 'AUD'].includes(currencyValue)) {
            currency = currencyValue as Currency;
          }
        }

        // Create transaction
        const result = await createTransaction({
          accountId: selectedAccountId,
          type,
          amount,
          currency,
          description,
          date: parsedDate.toISOString().split('T')[0],
          category: defaultCategory || undefined,
        });

        if (result.error) {
          errorCount++;
        } else {
          successCount++;
          setImportedCount(successCount);
        }
      } catch (error) {
        console.error('Error importing row:', error);
        errorCount++;
      }
    }

    setIsImporting(false);
    setImportComplete(true);

    if (successCount > 0) {
      toast.success(t('import.success').replace('{count}', String(successCount)));
    }
    if (errorCount > 0) {
      toast.error(`${errorCount} transactions failed to import`);
    }
  }, [parsedData, selectedAccountId, columnMapping, accounts, defaultType, defaultCategory, t]);

  // Reset for new import
  const handleStartOver = useCallback(() => {
    setCurrentStep(1);
    setSelectedFile(null);
    setParsedData(null);
    setColumnMapping({});
    setSelectedAccountId('');
    setDefaultType('expense');
    setDefaultCategory('');
    setImportedCount(0);
    setImportComplete(false);
  }, []);

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <FileUpload
              onFileSelect={handleFileSelect}
              selectedFile={selectedFile}
              onClear={handleFileClear}
            />
          </div>
        );

      case 2:
        if (!parsedData) return null;
        return (
          <PreviewTable
            headers={parsedData.headers}
            rows={parsedData.rows}
            columnMapping={columnMapping}
            onMappingChange={handleMappingChange}
          />
        );

      case 3:
        return (
          <div className="space-y-6">
            {/* Account Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                {t('import.selectAccount')} *
              </label>
              <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t('transactions.selectAccount')} />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name} ({account.currency})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Default Transaction Type */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                {t('import.defaultType')}
              </label>
              <Select value={defaultType} onValueChange={(v) => setDefaultType(v as 'income' | 'expense')}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">{t('transactions.income')}</SelectItem>
                  <SelectItem value="expense">{t('transactions.expense')}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Used when transaction type cannot be determined from the data
              </p>
            </div>

            {/* Default Category (optional) */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                {t('import.defaultCategory')}
              </label>
              <Select value={defaultCategory || 'none'} onValueChange={(v) => setDefaultCategory(v === 'none' ? '' : v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t('import.noCategory')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('import.noCategory')}</SelectItem>
                  <SelectItem value="groceries">Groceries</SelectItem>
                  <SelectItem value="utilities">Utilities</SelectItem>
                  <SelectItem value="transport">Transport</SelectItem>
                  <SelectItem value="entertainment">Entertainment</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Summary */}
            {parsedData && (
              <Card className="rounded-2xl bg-muted/50">
                <CardContent className="pt-6">
                  <p className="text-sm font-medium">
                    {t('import.rowsToImport').replace('{count}', String(parsedData.allData.length))}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            {!importComplete ? (
              <div className="text-center py-8">
                {isImporting ? (
                  <div className="space-y-4">
                    <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
                    <p className="text-lg font-medium">{t('import.importing')}</p>
                    <p className="text-muted-foreground">
                      {importedCount} / {parsedData?.allData.length || 0}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                      <Upload className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <p className="text-lg font-medium">Ready to Import</p>
                      <p className="text-muted-foreground mt-1">
                        {t('import.rowsToImport').replace('{count}', String(parsedData?.allData.length || 0))}
                      </p>
                    </div>
                    <Button
                      onClick={handleImport}
                      className="btn-premium rounded-2xl h-12 px-8"
                    >
                      {t('import.importButton')}
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 space-y-6">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto">
                  <Check className="h-8 w-8 text-emerald-500" />
                </div>
                <div>
                  <p className="text-lg font-medium">{t('import.importComplete')}</p>
                  <p className="text-muted-foreground mt-1">
                    {t('import.success').replace('{count}', String(importedCount))}
                  </p>
                </div>
                <div className="flex gap-3 justify-center">
                  <Button
                    variant="outline"
                    onClick={handleStartOver}
                    className="rounded-2xl h-12"
                  >
                    {t('import.startOver')}
                  </Button>
                  <Button
                    onClick={() => router.push('/transactions')}
                    className="btn-premium rounded-2xl h-12"
                  >
                    {t('import.goToTransactions')}
                  </Button>
                </div>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="pt-2 pb-4">
        <h1 className="text-2xl font-bold">{t('import.title')}</h1>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center justify-between mb-8">
        {STEPS.map(({ step, icon: Icon, labelKey }, index) => {
          const isActive = currentStep === step;
          const isCompleted = currentStep > step;
          const isLast = index === STEPS.length - 1;

          return (
            <div key={step} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center transition-colors',
                    isActive && 'bg-primary text-primary-foreground',
                    isCompleted && 'bg-emerald-500 text-white',
                    !isActive && !isCompleted && 'bg-muted text-muted-foreground'
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </div>
                <span
                  className={cn(
                    'text-xs mt-2 font-medium',
                    isActive && 'text-primary',
                    isCompleted && 'text-emerald-500',
                    !isActive && !isCompleted && 'text-muted-foreground'
                  )}
                >
                  {t(labelKey as any)}
                </span>
              </div>
              {!isLast && (
                <div
                  className={cn(
                    'flex-1 h-0.5 mx-2',
                    isCompleted ? 'bg-emerald-500' : 'bg-border'
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <Card className="rounded-2xl">
        <CardContent className="pt-6">{renderStepContent()}</CardContent>
      </Card>

      {/* Navigation Buttons */}
      {currentStep !== 4 || !importComplete ? (
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={goBack}
            disabled={currentStep === 1}
            className="rounded-2xl h-12"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('import.back')}
          </Button>
          {currentStep < 4 && (
            <Button
              onClick={goNext}
              disabled={!canProceed()}
              className="btn-premium rounded-2xl h-12"
            >
              {t('import.next')}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      ) : null}
    </div>
  );
}
