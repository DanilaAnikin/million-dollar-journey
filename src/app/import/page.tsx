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
  AlertTriangle,
  FileSpreadsheet,
  TrendingUp,
  TrendingDown,
  Calendar,
  Coins,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { FileUpload, PreviewTable, FieldMapping } from '@/components/import';
import { useLanguage } from '@/lib/contexts/LanguageContext';
import { getAccountsForTransactions } from '@/app/actions/transactions';
import { createTransaction } from '@/app/actions/transactions';
import { checkForDuplicates } from '@/app/actions/import';
import {
  parseTrading212CSV,
  parseXTBCSV,
  parseGenericCSV,
  detectColumnMappings,
} from '@/lib/services/parsers';
import type { ParserResult, ParsedTransaction, ColumnMapping } from '@/lib/services/parsers/types';
import type { Account, Currency, TransactionType } from '@/types/database';
import { cn } from '@/lib/utils';

type Step = 1 | 2 | 3 | 4 | 5;
type ParserType = 'generic' | 'trading212' | 'xtb';

interface ParsedData {
  headers: string[];
  rows: string[][];
  allData: Record<string, string>[];
}

const STEPS = [
  { step: 1, icon: Upload, label: 'Upload' },
  { step: 2, icon: TableProperties, label: 'Map' },
  { step: 3, icon: Settings2, label: 'Configure' },
  { step: 4, icon: FileSpreadsheet, label: 'Preview' },
  { step: 5, icon: CheckCircle2, label: 'Import' },
] as const;

export default function ImportPage() {
  const { t } = useLanguage();
  const router = useRouter();

  // Parser type from automation page
  const [parserType, setParserType] = useState<ParserType>('generic');

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

  // Parser result for preview
  const [parserResult, setParserResult] = useState<ParserResult | null>(null);
  const [duplicates, setDuplicates] = useState<Array<{
    row: number;
    date: string;
    amount: string | number;
    description?: string;
    existingId: string;
  }>>([]);
  const [skipDuplicates, setSkipDuplicates] = useState(true);

  // Load accounts and check for parser type from session
  useEffect(() => {
    async function loadAccounts() {
      const data = await getAccountsForTransactions();
      setAccounts(data as Account[]);
    }
    loadAccounts();

    // Check for parser type from automation page
    const savedParser = sessionStorage.getItem('importParser');
    if (savedParser) {
      setParserType(savedParser as ParserType);
      sessionStorage.removeItem('importParser');
    }
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

        // Auto-detect column mappings
        const detected = detectColumnMappings(headers);
        const initialMapping: Record<string, FieldMapping> = {};
        headers.forEach((h) => {
          if (detected.date === h) {
            initialMapping[h] = 'date';
          } else if (detected.amount === h) {
            initialMapping[h] = 'amount';
          } else if (detected.description === h) {
            initialMapping[h] = 'description';
          } else if (detected.currency === h) {
            initialMapping[h] = 'currency';
          } else if (detected.type === h) {
            initialMapping[h] = 'type';
          } else {
            initialMapping[h] = 'skip';
          }
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
    setParserResult(null);
    setDuplicates([]);
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

  // Process data with parser
  const processWithParser = useCallback(async () => {
    if (!parsedData) return;

    let result: ParserResult;

    const selectedAccount = accounts.find(a => a.id === selectedAccountId);
    const accountCurrency = selectedAccount?.currency || 'USD';

    if (parserType === 'trading212') {
      result = parseTrading212CSV(parsedData.allData, {
        accountCurrency,
      });
    } else if (parserType === 'xtb') {
      result = parseXTBCSV(parsedData.allData, {
        defaultCurrency: accountCurrency,
      });
    } else {
      // Build column mapping for generic parser
      const mapping: ColumnMapping = {
        date: '',
        amount: '',
      };

      for (const [col, field] of Object.entries(columnMapping)) {
        if (field === 'date') mapping.date = col;
        if (field === 'amount') mapping.amount = col;
        if (field === 'description') mapping.description = col;
        if (field === 'currency') mapping.currency = col;
        if (field === 'type') mapping.type = col;
      }

      result = parseGenericCSV(parsedData.allData, mapping, {
        defaultCurrency: accountCurrency,
        defaultType,
        inferTypeFromSign: true,
      });
    }

    setParserResult(result);

    // Check for duplicates
    if (selectedAccountId && result.transactions.length > 0) {
      const importRows = result.transactions.map(tx => ({
        date: tx.date,
        amount: tx.amount,
        description: tx.description,
        currency: tx.currency,
        type: tx.type,
        hash: tx.hash,
      }));

      const { duplicates: foundDuplicates } = await checkForDuplicates(importRows, selectedAccountId);
      setDuplicates(foundDuplicates);
    }
  }, [parsedData, parserType, columnMapping, selectedAccountId, accounts, defaultType]);

  // Check if step can proceed
  const canProceed = useCallback(() => {
    switch (currentStep) {
      case 1:
        return selectedFile !== null && parsedData !== null;
      case 2:
        if (parserType !== 'generic') return true;
        const dateIsMapped = Object.values(columnMapping).includes('date');
        const amountIsMapped = Object.values(columnMapping).includes('amount');
        return dateIsMapped && amountIsMapped;
      case 3:
        return selectedAccountId !== '';
      case 4:
        return parserResult !== null && parserResult.transactions.length > 0;
      case 5:
        return true;
      default:
        return false;
    }
  }, [currentStep, selectedFile, parsedData, columnMapping, selectedAccountId, parserResult, parserType]);

  // Navigation
  const goNext = useCallback(async () => {
    if (currentStep < 5 && canProceed()) {
      // When moving to preview step, process data
      if (currentStep === 3) {
        await processWithParser();
      }
      setCurrentStep((prev) => (prev + 1) as Step);
    }
  }, [currentStep, canProceed, processWithParser]);

  const goBack = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as Step);
    }
  }, [currentStep]);

  // Import transactions
  const handleImport = useCallback(async () => {
    if (!parserResult || !selectedAccountId) return;

    setIsImporting(true);
    setImportedCount(0);

    const selectedAccount = accounts.find((a) => a.id === selectedAccountId);
    const accountCurrency = selectedAccount?.currency || 'USD';

    let successCount = 0;
    let errorCount = 0;

    // Filter out duplicates if skipping
    let transactionsToImport = parserResult.transactions;
    if (skipDuplicates && duplicates.length > 0) {
      const duplicateHashes = new Set(duplicates.map(d =>
        `${d.date}-${d.amount}-${d.description || ''}`
      ));
      transactionsToImport = transactionsToImport.filter(tx =>
        !duplicateHashes.has(`${tx.date}-${tx.amount}-${tx.description}`)
      );
    }

    for (const tx of transactionsToImport) {
      try {
        const result = await createTransaction({
          accountId: selectedAccountId,
          type: tx.type,
          amount: tx.amount,
          currency: (tx.currency as Currency) || accountCurrency,
          description: tx.description,
          date: tx.date,
          category: defaultCategory || undefined,
        });

        if (result.error) {
          errorCount++;
        } else {
          successCount++;
          setImportedCount(successCount);
        }
      } catch (error) {
        console.error('Error importing transaction:', error);
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
  }, [parserResult, selectedAccountId, accounts, defaultCategory, t, skipDuplicates, duplicates]);

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
    setParserResult(null);
    setDuplicates([]);
  }, []);

  // Format currency
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(amount);
  };

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

            {parserType !== 'generic' && (
              <Alert>
                <FileSpreadsheet className="h-4 w-4" />
                <AlertTitle>
                  {parserType === 'trading212' ? 'Trading 212' : 'XTB'} Parser Selected
                </AlertTitle>
                <AlertDescription>
                  Columns will be automatically mapped based on the {parserType === 'trading212' ? 'Trading 212' : 'XTB'} export format.
                </AlertDescription>
              </Alert>
            )}
          </div>
        );

      case 2:
        if (!parsedData) return null;
        return (
          <div className="space-y-4">
            {parserType !== 'generic' ? (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>Auto-mapping enabled</AlertTitle>
                <AlertDescription>
                  The {parserType === 'trading212' ? 'Trading 212' : 'XTB'} parser will automatically map columns.
                  You can continue to the next step.
                </AlertDescription>
              </Alert>
            ) : (
              <PreviewTable
                headers={parsedData.headers}
                rows={parsedData.rows}
                columnMapping={columnMapping}
                onMappingChange={handleMappingChange}
              />
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            {/* Account Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Target Account *
              </label>
              <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select an account..." />
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

            {/* Default Transaction Type (only for generic parser) */}
            {parserType === 'generic' && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Default Transaction Type
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
            )}

            {/* Default Category (optional) */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Default Category (optional)
              </label>
              <Select value={defaultCategory || 'none'} onValueChange={(v) => setDefaultCategory(v === 'none' ? '' : v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="No category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No category</SelectItem>
                  <SelectItem value="groceries">Groceries</SelectItem>
                  <SelectItem value="utilities">Utilities</SelectItem>
                  <SelectItem value="transport">Transport</SelectItem>
                  <SelectItem value="entertainment">Entertainment</SelectItem>
                  <SelectItem value="investment">Investment</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Summary */}
            {parsedData && (
              <Card className="rounded-2xl bg-muted/50">
                <CardContent className="pt-6">
                  <p className="text-sm font-medium">
                    {parsedData.allData.length} rows will be processed
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            {parserResult && (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="rounded-xl">
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <FileSpreadsheet className="h-4 w-4" />
                        <span>Total Rows</span>
                      </div>
                      <p className="text-2xl font-bold mt-1">{parserResult.summary.totalRows}</p>
                    </CardContent>
                  </Card>
                  <Card className="rounded-xl">
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-center gap-2 text-emerald-600 text-sm">
                        <TrendingUp className="h-4 w-4" />
                        <span>Income</span>
                      </div>
                      <p className="text-2xl font-bold mt-1 text-emerald-600">
                        {formatCurrency(parserResult.summary.totalIncome, parserResult.summary.currencies[0] || 'USD')}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="rounded-xl">
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-center gap-2 text-red-600 text-sm">
                        <TrendingDown className="h-4 w-4" />
                        <span>Expenses</span>
                      </div>
                      <p className="text-2xl font-bold mt-1 text-red-600">
                        {formatCurrency(parserResult.summary.totalExpenses, parserResult.summary.currencies[0] || 'USD')}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="rounded-xl">
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <Coins className="h-4 w-4" />
                        <span>Net Change</span>
                      </div>
                      <p className={cn(
                        "text-2xl font-bold mt-1",
                        parserResult.summary.netChange >= 0 ? "text-emerald-600" : "text-red-600"
                      )}>
                        {parserResult.summary.netChange >= 0 ? '+' : ''}
                        {formatCurrency(parserResult.summary.netChange, parserResult.summary.currencies[0] || 'USD')}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Date Range */}
                {parserResult.summary.dateRange.earliest && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>
                      Date range: {parserResult.summary.dateRange.earliest} to {parserResult.summary.dateRange.latest}
                    </span>
                  </div>
                )}

                {/* Duplicates Warning */}
                {duplicates.length > 0 && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Potential duplicates found</AlertTitle>
                    <AlertDescription className="mt-2">
                      <p>{duplicates.length} transactions appear to already exist in this account.</p>
                      <div className="flex items-center gap-2 mt-3">
                        <input
                          type="checkbox"
                          id="skipDuplicates"
                          checked={skipDuplicates}
                          onChange={(e) => setSkipDuplicates(e.target.checked)}
                          className="rounded"
                        />
                        <label htmlFor="skipDuplicates" className="text-sm">
                          Skip duplicate transactions ({duplicates.length} will be skipped)
                        </label>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Parsing Errors */}
                {parserResult.errors.length > 0 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Some rows could not be parsed</AlertTitle>
                    <AlertDescription>
                      <p className="mb-2">{parserResult.errors.length} rows had errors and will be skipped.</p>
                      <div className="max-h-32 overflow-y-auto text-xs bg-muted rounded p-2">
                        {parserResult.errors.slice(0, 5).map((err, i) => (
                          <div key={i}>Row {err.row}: {err.message}</div>
                        ))}
                        {parserResult.errors.length > 5 && (
                          <div className="text-muted-foreground mt-1">
                            ...and {parserResult.errors.length - 5} more
                          </div>
                        )}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Transaction Preview Table */}
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Transaction Preview (first 10)</h3>
                  <div className="border rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left p-3 font-medium">Date</th>
                          <th className="text-left p-3 font-medium">Description</th>
                          <th className="text-right p-3 font-medium">Amount</th>
                          <th className="text-left p-3 font-medium">Type</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parserResult.transactions.slice(0, 10).map((tx, i) => (
                          <tr key={i} className="border-t">
                            <td className="p-3">{tx.date}</td>
                            <td className="p-3 max-w-[200px] truncate">{tx.description}</td>
                            <td className={cn(
                              "p-3 text-right font-medium",
                              tx.type === 'income' ? "text-emerald-600" : "text-red-600"
                            )}>
                              {tx.type === 'income' ? '+' : '-'}
                              {formatCurrency(tx.amount, tx.currency)}
                            </td>
                            <td className="p-3">
                              <span className={cn(
                                "px-2 py-1 rounded-full text-xs",
                                tx.type === 'income'
                                  ? "bg-emerald-500/10 text-emerald-600"
                                  : "bg-red-500/10 text-red-600"
                              )}>
                                {tx.type}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {parserResult.transactions.length > 10 && (
                      <div className="p-3 text-center text-sm text-muted-foreground bg-muted/30">
                        ...and {parserResult.transactions.length - 10} more transactions
                      </div>
                    )}
                  </div>
                </div>

                {/* Final count */}
                <Card className="rounded-2xl bg-primary/5 border-primary/20">
                  <CardContent className="pt-6">
                    <p className="text-sm font-medium">
                      Ready to import{' '}
                      <span className="text-primary">
                        {skipDuplicates
                          ? parserResult.transactions.length - duplicates.length
                          : parserResult.transactions.length}
                      </span>{' '}
                      transactions
                    </p>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            {!importComplete ? (
              <div className="text-center py-8">
                {isImporting ? (
                  <div className="space-y-4">
                    <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
                    <p className="text-lg font-medium">Importing transactions...</p>
                    <p className="text-muted-foreground">
                      {importedCount} / {parserResult?.transactions.length || 0}
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
                        {skipDuplicates
                          ? (parserResult?.transactions.length || 0) - duplicates.length
                          : parserResult?.transactions.length || 0}{' '}
                        transactions will be imported
                      </p>
                    </div>
                    <Button
                      onClick={handleImport}
                      className="btn-premium rounded-2xl h-12 px-8"
                    >
                      Start Import
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
                  <p className="text-lg font-medium">Import Complete</p>
                  <p className="text-muted-foreground mt-1">
                    Successfully imported {importedCount} transactions
                  </p>
                </div>
                <div className="flex gap-3 justify-center">
                  <Button
                    variant="outline"
                    onClick={handleStartOver}
                    className="rounded-2xl h-12"
                  >
                    Import More
                  </Button>
                  <Button
                    onClick={() => router.push('/transactions')}
                    className="btn-premium rounded-2xl h-12"
                  >
                    View Transactions
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
        <h1 className="text-2xl font-bold">Import Transactions</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Import from {parserType === 'generic' ? 'CSV file' : parserType === 'trading212' ? 'Trading 212' : 'XTB'}
        </p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center justify-between mb-8">
        {STEPS.map(({ step, icon: Icon, label }, index) => {
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
                  {label}
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
      {currentStep !== 5 || !importComplete ? (
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={goBack}
            disabled={currentStep === 1}
            className="rounded-2xl h-12"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          {currentStep < 5 && (
            <Button
              onClick={goNext}
              disabled={!canProceed()}
              className="btn-premium rounded-2xl h-12"
            >
              {currentStep === 4 ? 'Continue to Import' : 'Next'}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      ) : null}
    </div>
  );
}
