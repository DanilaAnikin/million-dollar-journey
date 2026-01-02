'use client';

import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useLanguage } from '@/lib/contexts/LanguageContext';
import { getCategories } from '@/app/actions/settings';
import type { Account, AccountCategory, Currency } from '@/types/database';

const accountSchema = z.object({
  name: z.string().min(1),
  categoryId: z.string().optional(),
  currency: z.enum(['CZK', 'USD', 'EUR']),
  balance: z.coerce.number().min(0),
  isInvestment: z.boolean(),
  interestRatePa: z.coerce.number().min(0).max(100),
  institution: z.string().optional(),
});

type AccountFormData = z.infer<typeof accountSchema>;

interface AccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account?: Account | null;
  onSubmit: (data: AccountFormData) => Promise<void>;
}

export function AccountDialog({
  open,
  onOpenChange,
  account,
  onSubmit,
}: AccountDialogProps) {
  const { t } = useLanguage();
  const isEditing = !!account;

  const [categories, setCategories] = useState<AccountCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);

  // Fetch categories when dialog opens
  useEffect(() => {
    if (open) {
      fetchCategories();
    }
  }, [open]);

  async function fetchCategories() {
    setLoadingCategories(true);

    try {
      const cats = await getCategories();
      setCategories(cats);
    } catch (error) {
      console.error('AccountDialog: Error fetching categories:', error);
    } finally {
      setLoadingCategories(false);
    }
  }

  const {
    register,
    handleSubmit,
    watch,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AccountFormData>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      name: '',
      categoryId: '',
      currency: 'CZK',
      balance: 0,
      isInvestment: false,
      interestRatePa: 8,
      institution: '',
    },
  });

  const isInvestment = watch('isInvestment');


  useEffect(() => {
    if (account) {
      reset({
        name: account.name,
        categoryId: account.category_id || '',
        currency: account.currency as Currency,
        balance: account.balance,
        isInvestment: account.is_investment,
        interestRatePa: account.interest_rate_pa,
        institution: account.institution || '',
      });
    } else {
      reset({
        name: '',
        categoryId: '',
        currency: 'CZK',
        balance: 0,
        isInvestment: false,
        interestRatePa: 8,
        institution: '',
      });
    }
  }, [account, reset]);

  const handleFormSubmit = async (data: AccountFormData) => {
    try {
      await onSubmit(data);
      onOpenChange(false);
    } catch (error) {
      console.error('AccountDialog: Error submitting form:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t('accounts.editAccount') : t('accounts.addAccount')}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {/* Account Name */}
          <div className="space-y-2">
            <Label htmlFor="name">{t('accounts.accountName')}</Label>
            <Input
              id="name"
              {...register('name')}
              placeholder={t('accounts.placeholderAccountName')}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">{t('accounts.category')}</Label>
            <Controller
              control={control}
              name="categoryId"
              render={({ field }) => (
                <Select
                  value={field.value || 'none'}
                  onValueChange={(value) => field.onChange(value === 'none' ? '' : value)}
                  disabled={loadingCategories}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={loadingCategories ? t('common.loading') : t('accounts.selectCategory')} />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingCategories ? (
                      <SelectItem value="loading" disabled>
                        {t('common.loading')}
                      </SelectItem>
                    ) : categories.length === 0 ? (
                      <SelectItem value="none" disabled>
                        {t('accounts.noCategories')}
                      </SelectItem>
                    ) : (
                      <>
                        <SelectItem value="none">
                          {t('accounts.noCategory')}
                        </SelectItem>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </>
                    )}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Currency */}
          <div className="space-y-2">
            <Label htmlFor="currency">{t('accounts.currency')}</Label>
            <Controller
              control={control}
              name="currency"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CZK">CZK (Kc)</SelectItem>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (E)</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Balance */}
          <div className="space-y-2">
            <Label htmlFor="balance">{t('accounts.currentBalance')}</Label>
            <Input
              id="balance"
              type="number"
              step="0.01"
              {...register('balance', { valueAsNumber: true })}
            />
            {errors.balance && (
              <p className="text-sm text-destructive">{errors.balance.message}</p>
            )}
          </div>

          {/* Is Investment Checkbox */}
          <Controller
            control={control}
            name="isInvestment"
            render={({ field }) => (
              <div className="flex items-start space-x-3 space-y-0 rounded-md border p-4">
                <Checkbox
                  id="isInvestment"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
                <div className="space-y-1 leading-none">
                  <Label htmlFor="isInvestment" className="cursor-pointer">
                    {t('accounts.isInvestment')}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {t('accounts.investmentHint')}
                  </p>
                </div>
              </div>
            )}
          />

          {/* Interest Rate (only if investment) */}
          {isInvestment && (
            <div className="space-y-2">
              <Label htmlFor="interestRate">{t('accounts.interestRate')}</Label>
              <Input
                id="interestRate"
                type="number"
                step="0.1"
                {...register('interestRatePa', { valueAsNumber: true })}
              />
            </div>
          )}

          {/* Institution */}
          <div className="space-y-2">
            <Label htmlFor="institution">{t('accounts.institution')}</Label>
            <Input
              id="institution"
              {...register('institution')}
              placeholder={t('accounts.placeholderInstitution')}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t('common.loading') : t('common.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
