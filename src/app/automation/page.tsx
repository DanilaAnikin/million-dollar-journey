'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Papa from 'papaparse';
import { toast } from 'sonner';
import {
  Upload,
  FileSpreadsheet,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  FileText,
  Loader2,
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  LogoTrading212,
  LogoXTB,
  LogoEtoro,
  LogoDegiro,
  LogoIBKR,
} from '@/components/ui/BrandLogos';
import { FileUpload } from '@/components/import';
import { getAccountsForTransactions } from '@/app/actions/transactions';
import type { Account } from '@/types/database';

// Parser types
type ParserType = 'generic' | 'trading212' | 'xtb';

interface ParserConfig {
  id: ParserType;
  name: string;
  description: string;
  logo?: React.ComponentType<{ className?: string; size?: number }>;
  fileTypes: string[];
  instructions: string;
}

const PARSERS: ParserConfig[] = [
  {
    id: 'generic',
    name: 'Generic CSV',
    description: 'Standard CSV file with customizable column mapping',
    fileTypes: ['.csv'],
    instructions: 'Upload any CSV file. You will map columns to transaction fields manually.',
  },
  {
    id: 'trading212',
    name: 'Trading 212',
    description: 'Export from Trading 212 account history',
    logo: LogoTrading212,
    fileTypes: ['.csv'],
    instructions: 'Go to Trading 212 → History → Export. Select CSV format and download.',
  },
  {
    id: 'xtb',
    name: 'XTB',
    description: 'Cash operations statement from XTB xStation',
    logo: LogoXTB,
    fileTypes: ['.csv', '.xlsx'],
    instructions: 'Go to XTB xStation → History → Cash Operations → Export to CSV.',
  },
];

// Manual import sources (for display only)
interface ManualSource {
  id: string;
  name: string;
  logo?: React.ComponentType<{ className?: string; size?: number }>;
  description: string;
}

const MANUAL_SOURCES: ManualSource[] = [
  {
    id: 'etoro',
    name: 'eToro',
    logo: LogoEtoro,
    description: 'Use Generic CSV with your account statement',
  },
  {
    id: 'degiro',
    name: 'Degiro',
    logo: LogoDegiro,
    description: 'Use Generic CSV with your account statement',
  },
  {
    id: 'ibkr',
    name: 'Interactive Brokers',
    logo: LogoIBKR,
    description: 'Use Generic CSV with your activity statement',
  },
];

export default function ImportHubPage() {
  const router = useRouter();
  const [selectedParser, setSelectedParser] = useState<ParserType | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    rowCount: number;
    error?: string;
  } | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);

  // Load accounts on mount
  useEffect(() => {
    async function loadAccounts() {
      const data = await getAccountsForTransactions();
      setAccounts(data as Account[]);
    }
    loadAccounts();
  }, []);

  // Handle parser selection
  const handleParserSelect = (parserId: ParserType) => {
    setSelectedParser(parserId);
    setSelectedFile(null);
    setValidationResult(null);
  };

  // Handle file selection
  const handleFileSelect = useCallback(async (file: File) => {
    setSelectedFile(file);
    setIsValidating(true);
    setValidationResult(null);

    try {
      // Basic validation: try to parse the file
      const text = await file.text();

      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const rowCount = results.data.length;
          const hasData = rowCount > 0;
          const hasHeaders = (results.meta.fields?.length || 0) > 0;

          if (!hasData || !hasHeaders) {
            setValidationResult({
              valid: false,
              rowCount: 0,
              error: 'File appears to be empty or has no valid headers',
            });
          } else {
            setValidationResult({
              valid: true,
              rowCount,
            });
          }
          setIsValidating(false);
        },
        error: (error: Error) => {
          setValidationResult({
            valid: false,
            rowCount: 0,
            error: `Parse error: ${error.message}`,
          });
          setIsValidating(false);
        },
      });
    } catch (error) {
      setValidationResult({
        valid: false,
        rowCount: 0,
        error: 'Failed to read file',
      });
      setIsValidating(false);
    }
  }, []);

  // Handle file clear
  const handleFileClear = useCallback(() => {
    setSelectedFile(null);
    setValidationResult(null);
  }, []);

  // Navigate to import page with parser context
  const handleContinueToImport = () => {
    if (!selectedFile || !selectedParser || !validationResult?.valid) return;

    // Store file and parser info in sessionStorage for the import page
    sessionStorage.setItem('importParser', selectedParser);
    sessionStorage.setItem('importFileName', selectedFile.name);

    // Navigate to import page
    router.push('/import');
  };

  // Get current parser config
  const currentParser = PARSERS.find(p => p.id === selectedParser);

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Import Hub</h1>
        <p className="text-muted-foreground mt-1">
          Import transactions from your bank or broker statements
        </p>
      </div>

      {/* Main Import Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="icon-container-sm bg-primary/10">
            <Upload className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-lg font-semibold">Import Transactions</h2>
        </div>

        {/* Step 1: Select Parser */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm flex items-center justify-center">
                1
              </span>
              Select Format
            </CardTitle>
            <CardDescription>
              Choose the format that matches your export file
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select
              value={selectedParser || ''}
              onValueChange={(v) => handleParserSelect(v as ParserType)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select file format..." />
              </SelectTrigger>
              <SelectContent>
                {PARSERS.map((parser) => {
                  const Logo = parser.logo;
                  return (
                    <SelectItem key={parser.id} value={parser.id}>
                      <div className="flex items-center gap-2">
                        {Logo && <Logo size={20} />}
                        <span>{parser.name}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            {currentParser && (
              <div className="mt-3 p-3 bg-muted/50 rounded-xl">
                <p className="text-sm text-muted-foreground">
                  {currentParser.description}
                </p>
                <Button
                  variant="link"
                  className="h-auto p-0 text-sm mt-1"
                  onClick={() => setShowInstructions(true)}
                >
                  How to export from {currentParser.name}?
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 2: Upload File */}
        {selectedParser && (
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm flex items-center justify-center">
                  2
                </span>
                Upload File
              </CardTitle>
              <CardDescription>
                Accepts {currentParser?.fileTypes.join(', ')} files
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FileUpload
                onFileSelect={handleFileSelect}
                selectedFile={selectedFile}
                onClear={handleFileClear}
                accept={currentParser?.fileTypes.join(',')}
              />

              {/* Validation status */}
              {isValidating && (
                <div className="mt-4 flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Validating file...</span>
                </div>
              )}

              {validationResult && !isValidating && (
                <div className={`mt-4 p-3 rounded-xl flex items-start gap-2 ${
                  validationResult.valid
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                    : 'bg-red-500/10 text-red-700 dark:text-red-400'
                }`}>
                  {validationResult.valid ? (
                    <>
                      <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">File validated successfully</p>
                        <p className="text-sm opacity-80">
                          Found {validationResult.rowCount} rows ready for import
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Validation failed</p>
                        <p className="text-sm opacity-80">{validationResult.error}</p>
                      </div>
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Continue Button */}
        {validationResult?.valid && (
          <Button
            onClick={handleContinueToImport}
            className="w-full btn-premium rounded-2xl h-12"
          >
            Continue to Column Mapping
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>

      {/* Other Sources Section */}
      <div className="space-y-4 pt-4 border-t">
        <div className="flex items-center gap-2">
          <div className="icon-container-sm bg-blue-500/10">
            <FileSpreadsheet className="h-5 w-5 text-blue-500" />
          </div>
          <h2 className="text-lg font-semibold">Other Brokers</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          For these platforms, export your statement and use Generic CSV import
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {MANUAL_SOURCES.map((source) => {
            const Logo = source.logo;
            return (
              <Card key={source.id} className="rounded-2xl bg-muted/30">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-3">
                    {Logo && <Logo size={32} className="rounded-lg" />}
                    <div>
                      <p className="font-medium text-sm">{source.name}</p>
                      <p className="text-xs text-muted-foreground">{source.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Quick Actions */}
      <Card className="rounded-2xl bg-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="icon-container-sm bg-primary/10 mt-0.5">
              <FileText className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">Need to import manually?</p>
              <p className="text-sm text-muted-foreground mt-1">
                For complete control over column mapping, use the{' '}
                <Button
                  variant="link"
                  className="h-auto p-0 text-sm"
                  onClick={() => handleParserSelect('generic')}
                >
                  Generic CSV
                </Button>
                {' '}option above.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Instructions Dialog */}
      <Dialog open={showInstructions} onOpenChange={setShowInstructions}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {currentParser?.logo && <currentParser.logo size={24} />}
              How to Export from {currentParser?.name}
            </DialogTitle>
            <DialogDescription asChild>
              <div className="pt-4 text-left">
                <p className="text-sm">{currentParser?.instructions}</p>

                {currentParser?.id === 'trading212' && (
                  <ol className="mt-4 space-y-2 text-sm list-decimal list-inside">
                    <li>Open Trading 212 app or website</li>
                    <li>Go to <strong>Menu → History</strong></li>
                    <li>Click the <strong>Export</strong> button (top right)</li>
                    <li>Select date range and CSV format</li>
                    <li>Download and upload the file here</li>
                  </ol>
                )}

                {currentParser?.id === 'xtb' && (
                  <ol className="mt-4 space-y-2 text-sm list-decimal list-inside">
                    <li>Open XTB xStation platform</li>
                    <li>Go to <strong>History → Cash Operations</strong></li>
                    <li>Set your date range filter</li>
                    <li>Click <strong>Export</strong> and select CSV</li>
                    <li>Download and upload the file here</li>
                  </ol>
                )}

                {currentParser?.id === 'generic' && (
                  <div className="mt-4 text-sm">
                    <p className="font-medium mb-2">Required columns:</p>
                    <ul className="space-y-1 list-disc list-inside text-muted-foreground">
                      <li><strong>Date</strong> - Transaction date</li>
                      <li><strong>Amount</strong> - Transaction amount</li>
                    </ul>
                    <p className="font-medium mt-3 mb-2">Optional columns:</p>
                    <ul className="space-y-1 list-disc list-inside text-muted-foreground">
                      <li><strong>Description</strong> - Transaction note</li>
                      <li><strong>Currency</strong> - e.g. USD, EUR</li>
                      <li><strong>Type</strong> - income or expense</li>
                    </ul>
                  </div>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button onClick={() => setShowInstructions(false)} className="rounded-2xl">
              Got it
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
