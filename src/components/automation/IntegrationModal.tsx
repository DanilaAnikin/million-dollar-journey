'use client';

import { useState, useEffect } from 'react';
import { Eye, EyeOff, Loader2, AlertCircle, Lock, ArrowLeft, CheckCircle2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { validateAndFetchAccounts, createIntegrationWithMappings } from '@/app/actions/integrations';
import { getAccounts } from '@/app/actions/accounts';
import type { Account, AccountCategory, Currency } from '@/types/database';

export type IntegrationType = 'trading212' | 'xtb' | 'gocardless';

export interface IntegrationFormData {
  provider: string;
  name: string;
  apiKey: string;
}

interface IntegrationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  integrationType: IntegrationType | null;
  onSubmit?: (data: IntegrationFormData) => Promise<void>;
}

interface ExternalAccount {
  id: string;
  name: string;
  balance: number;
  currency: string;
}

interface AccountMapping {
  externalAccountId: string;
  selectedAccountId: string | 'new' | '';
  newAccountName: string;
  newAccountCategory: string | null;
}

const INTEGRATION_CONFIG = {
  trading212: {
    title: 'Connect Trading 212',
    description: 'Enter your Trading 212 API key to automatically sync your investment data.',
    provider: 'trading212',
    requiresApiKey: true,
    placeholderName: 'My Trading 212 Account',
  },
  xtb: {
    title: 'Connect XTB',
    description: 'Enter your XTB login credentials to automatically sync your trading data.',
    provider: 'xtb',
    requiresApiKey: true,
    placeholderName: 'My XTB Account',
  },
  gocardless: {
    title: 'Connect Bank via GoCardless',
    description: 'Connect your bank account using GoCardless for automatic transaction sync.',
    provider: 'gocardless',
    requiresApiKey: false,
    placeholderName: 'My Bank Account',
  },
} as const;

export function IntegrationModal({
  open,
  onOpenChange,
  integrationType,
  onSubmit,
}: IntegrationModalProps) {
  // Step 1 state
  const [name, setName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isDemo, setIsDemo] = useState(false);

  // XTB-specific state
  const [xtbLogin, setXtbLogin] = useState('');

  // Wizard state
  const [step, setStep] = useState<1 | 2>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 2 state
  const [externalAccounts, setExternalAccounts] = useState<ExternalAccount[]>([]);
  const [userAccounts, setUserAccounts] = useState<Account[]>([]);
  const [userCategories, setUserCategories] = useState<AccountCategory[]>([]);
  const [mappings, setMappings] = useState<Record<string, AccountMapping>>({});

  const config = integrationType ? INTEGRATION_CONFIG[integrationType] : null;

  // Hydration fix: only render modal content after client-side mount
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Fetch user's existing accounts when modal opens
  useEffect(() => {
    if (open) {
      fetchUserAccounts();
    }
  }, [open]);

  const fetchUserAccounts = async () => {
    try {
      const { accounts, categories } = await getAccounts();
      setUserAccounts(accounts);
      setUserCategories(categories);
    } catch (err) {
      console.error('Failed to fetch user accounts:', err);
    }
  };

  const handleClose = () => {
    // Reset all state
    setStep(1);
    setName('');
    setApiKey('');
    setShowApiKey(false);
    setIsDemo(false);
    setXtbLogin('');
    setError(null);
    setExternalAccounts([]);
    setMappings({});
    onOpenChange(false);
  };

  const handleVerifyAndFetch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!config) return;

    // Validation
    if (integrationType === 'xtb') {
      // XTB requires login ID and password
      if (!xtbLogin.trim()) {
        setError('XTB Login ID is required');
        return;
      }
      if (!apiKey.trim()) {
        setError('Password is required');
        return;
      }
    } else if (config.requiresApiKey && !apiKey.trim()) {
      setError('API key is required');
      return;
    }

    setIsLoading(true);
    setError(null);

    // For XTB, we encode credentials for the sync manager:
    // - Password goes in api_key field
    // - Login and isDemo go in metadata field (as JSON)
    const apiKeyToSend = apiKey.trim();
    const metadataToSend = integrationType === 'xtb'
      ? JSON.stringify({ login: xtbLogin.trim(), isDemo })
      : undefined;

    try {
      const result = await validateAndFetchAccounts(config.provider, apiKeyToSend, isDemo, metadataToSend);

      if (!result.success || !result.accounts) {
        setError(result.error || 'Failed to fetch accounts');
        return;
      }

      // Success - move to step 2
      setExternalAccounts(result.accounts);

      // Initialize mappings
      const initialMappings: Record<string, AccountMapping> = {};
      result.accounts.forEach(account => {
        initialMappings[account.id] = {
          externalAccountId: account.id,
          selectedAccountId: '',
          newAccountName: account.name,
          newAccountCategory: null,
        };
      });
      setMappings(initialMappings);

      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to validate API key');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMappingChange = (externalAccountId: string, value: string) => {
    setMappings(prev => ({
      ...prev,
      [externalAccountId]: {
        ...prev[externalAccountId],
        selectedAccountId: value,
      },
    }));
  };

  const handleNewAccountNameChange = (externalAccountId: string, value: string) => {
    setMappings(prev => ({
      ...prev,
      [externalAccountId]: {
        ...prev[externalAccountId],
        newAccountName: value,
      },
    }));
  };

  const handleNewAccountCategoryChange = (externalAccountId: string, value: string) => {
    setMappings(prev => ({
      ...prev,
      [externalAccountId]: {
        ...prev[externalAccountId],
        newAccountCategory: value,
      },
    }));
  };

  const handleSaveMappings = async () => {
    if (!config) return;

    setIsLoading(true);
    setError(null);

    try {
      // Validate all mappings have a selection
      const incompleteMappings = Object.values(mappings).filter(
        m => !m.selectedAccountId
      );

      if (incompleteMappings.length > 0) {
        setError('Please map all external accounts');
        setIsLoading(false);
        return;
      }

      // Build mappings array for server action
      const mappingsArray = externalAccounts.map(extAccount => {
        const mapping = mappings[extAccount.id];

        if (mapping.selectedAccountId === 'new') {
          // Find investment category
          const investmentCategory = userCategories.find(c =>
            c.name.toLowerCase().includes('investment') && c.type === 'asset'
          );

          return {
            externalAccountId: extAccount.id,
            externalAccountName: extAccount.name,
            internalAccountId: null,
            newAccountDetails: {
              name: mapping.newAccountName || extAccount.name,
              categoryId: mapping.newAccountCategory || investmentCategory?.id || null,
              currency: extAccount.currency as Currency,
            },
          };
        } else {
          return {
            externalAccountId: extAccount.id,
            externalAccountName: extAccount.name,
            internalAccountId: mapping.selectedAccountId,
          };
        }
      });

      // Create integration with mappings
      // For XTB: store password in apiKey, and login/isDemo in metadata
      const metadata = integrationType === 'xtb'
        ? JSON.stringify({ login: xtbLogin.trim(), isDemo })
        : undefined;

      const result = await createIntegrationWithMappings({
        provider: config.provider,
        name: name.trim() || config.placeholderName,
        apiKey: apiKey.trim(),
        isDemo,
        metadata,
        mappings: mappingsArray,
      });

      if (!result.success) {
        setError(result.error || 'Failed to create integration');
        return;
      }

      // Success - close modal
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save mappings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setStep(1);
    setError(null);
  };

  // Don't render until mounted (prevents hydration mismatch) or if no config
  if (!mounted || !config) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {step === 2 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="h-8 w-8 p-0"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div>
              <DialogTitle>
                {step === 1 ? config.title : 'Map External Accounts'}
              </DialogTitle>
              <DialogDescription>
                {step === 1
                  ? config.description
                  : 'Connect external accounts to your internal accounts'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {config.requiresApiKey ? (
          <>
            {/* STEP 1: API Key Entry */}
            {step === 1 && (
              <form onSubmit={handleVerifyAndFetch} className="space-y-4">
                {error && (
                  <Alert variant="destructive" className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 mt-0.5" />
                    <div className="flex-1 text-sm">{error}</div>
                  </Alert>
                )}

                {/* Display Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">Display Name (Optional)</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={config.placeholderName}
                  />
                  <p className="text-xs text-muted-foreground">
                    Give this connection a friendly name
                  </p>
                </div>

                {/* XTB-specific fields */}
                {integrationType === 'xtb' ? (
                  <>
                    {/* XTB Login ID */}
                    <div className="space-y-2">
                      <Label htmlFor="xtbLogin">XTB Login ID *</Label>
                      <Input
                        id="xtbLogin"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={xtbLogin}
                        onChange={(e) => setXtbLogin(e.target.value)}
                        placeholder="e.g., 1234567"
                      />
                      <p className="text-xs text-muted-foreground">
                        Your XTB account login ID (numeric)
                      </p>
                    </div>

                    {/* XTB Password */}
                    <div className="space-y-2">
                      <Label htmlFor="apiKey">Password *</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="apiKey"
                          type={showApiKey ? 'text' : 'password'}
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          placeholder="Enter your password"
                          className="pl-10 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowApiKey(!showApiKey)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          aria-label={showApiKey ? 'Hide password' : 'Show password'}
                        >
                          {showApiKey ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Your credentials are stored securely and only used for read-only access.
                      </p>
                    </div>

                    {/* Demo Mode Checkbox - XTB */}
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="isDemo"
                        checked={isDemo}
                        onCheckedChange={(checked) => setIsDemo(checked === true)}
                      />
                      <Label
                        htmlFor="isDemo"
                        className="text-sm font-normal cursor-pointer"
                      >
                        Use Demo Account
                      </Label>
                    </div>
                  </>
                ) : (
                  <>
                    {/* API Key for other integrations */}
                    <div className="space-y-2">
                      <Label htmlFor="apiKey">API Key *</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="apiKey"
                          type={showApiKey ? 'text' : 'password'}
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          placeholder="Enter your API key"
                          className="pl-10 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowApiKey(!showApiKey)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          aria-label={showApiKey ? 'Hide API key' : 'Show API key'}
                        >
                          {showApiKey ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        This key is stored securely and only used for read-only access.
                      </p>
                    </div>

                    {/* Demo Mode Checkbox - Trading 212 only */}
                    {integrationType === 'trading212' && (
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="isDemo"
                          checked={isDemo}
                          onCheckedChange={(checked) => setIsDemo(checked === true)}
                        />
                        <Label
                          htmlFor="isDemo"
                          className="text-sm font-normal cursor-pointer"
                        >
                          Use Practice Account (Demo)
                        </Label>
                      </div>
                    )}
                  </>
                )}

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Verifying...
                      </>
                    ) : (
                      'Verify & Fetch Accounts'
                    )}
                  </Button>
                </DialogFooter>
              </form>
            )}

            {/* STEP 2: Account Mapping */}
            {step === 2 && (
              <div className="space-y-4">
                {error && (
                  <Alert variant="destructive" className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 mt-0.5" />
                    <div className="flex-1 text-sm">{error}</div>
                  </Alert>
                )}

                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                  {externalAccounts.map((extAccount) => {
                    const mapping = mappings[extAccount.id];
                    const isCreatingNew = mapping?.selectedAccountId === 'new';

                    return (
                      <div
                        key={extAccount.id}
                        className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3"
                      >
                        {/* External Account Info */}
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-sm">{extAccount.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {extAccount.currency} {extAccount.balance.toFixed(2)}
                            </p>
                          </div>
                          {mapping?.selectedAccountId && (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          )}
                        </div>

                        {/* Mapping Selection */}
                        <div className="space-y-2">
                          <Label className="text-xs">Map to Internal Account</Label>
                          <Select
                            value={mapping?.selectedAccountId || ''}
                            onValueChange={(value) => handleMappingChange(extAccount.id, value)}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select account to map..." />
                            </SelectTrigger>
                            <SelectContent>
                              {userAccounts.map((account) => (
                                <SelectItem key={account.id} value={account.id}>
                                  {account.name} ({account.currency})
                                </SelectItem>
                              ))}
                              <SelectItem value="new">+ Create New Account</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* New Account Details */}
                        {isCreatingNew && (
                          <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-700">
                            <div className="space-y-2">
                              <Label htmlFor={`new-name-${extAccount.id}`} className="text-xs">
                                Account Name
                              </Label>
                              <Input
                                id={`new-name-${extAccount.id}`}
                                value={mapping.newAccountName}
                                onChange={(e) =>
                                  handleNewAccountNameChange(extAccount.id, e.target.value)
                                }
                                placeholder="Account name"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label className="text-xs">Category</Label>
                              <Select
                                value={mapping.newAccountCategory || ''}
                                onValueChange={(value) =>
                                  handleNewAccountCategoryChange(extAccount.id, value)
                                }
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Select category..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {userCategories
                                    .filter((cat) => cat.type === 'asset')
                                    .map((category) => (
                                      <SelectItem key={category.id} value={category.id}>
                                        {category.icon} {category.name}
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={handleBack} disabled={isLoading}>
                    Back
                  </Button>
                  <Button onClick={handleSaveMappings} disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Saving...
                      </>
                    ) : (
                      'Save Mappings'
                    )}
                  </Button>
                </DialogFooter>
              </div>
            )}
          </>
        ) : (
          // OAuth / Coming Soon for GoCardless
          <div className="space-y-4">
            <div className="bg-muted rounded-lg p-6 text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
                <AlertCircle className="h-8 w-8 text-primary" />
              </div>
              <div className="space-y-2">
                <div className="inline-block px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-semibold">
                  COMING SOON
                </div>
                <p className="text-sm text-muted-foreground">
                  Bank connection via GoCardless requires additional OAuth setup and will be available in a future update.
                </p>
                <p className="text-sm text-muted-foreground">
                  This feature will enable automatic synchronization of your bank transactions.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Close
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
