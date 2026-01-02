'use client';

import { Calculator, Target, TrendingUp, Calendar, DollarSign, ArrowRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { formatCurrency } from '@/lib/services/currency';
import { useLanguage } from '@/lib/contexts/LanguageContext';
import type { CalculationResult } from '@/lib/services/calculator';
import type { Currency } from '@/types/database';

interface MathExplanationDialogProps {
  calculation: CalculationResult;
  currency: Currency;
  children: React.ReactNode;
}

export function MathExplanationDialog({
  calculation,
  currency,
  children
}: MathExplanationDialogProps) {
  const { t } = useLanguage();

  const items = [
    {
      icon: Target,
      label: t('calculator.targetAmount'),
      value: formatCurrency(calculation.targetAmount, 'USD'),
      color: 'text-primary',
    },
    {
      icon: DollarSign,
      label: t('calculator.currentNetWorth'),
      value: formatCurrency(calculation.currentNetWorthUSD, 'USD'),
      color: 'text-blue-500',
    },
    {
      icon: TrendingUp,
      label: t('calculator.projectedValue'),
      value: formatCurrency(calculation.futureValueOfCurrentHoldings, 'USD'),
      sublabel: t('calculator.projectedValueSublabel'),
      color: 'text-green-500',
    },
    {
      icon: ArrowRight,
      label: t('calculator.gapToTarget'),
      value: formatCurrency(calculation.gapToTarget, 'USD'),
      sublabel: t('calculator.gapToTargetSublabel'),
      color: calculation.gapToTarget > 0 ? 'text-orange-500' : 'text-green-500',
    },
    {
      icon: Calendar,
      label: t('calculator.timeRemaining'),
      value: `${Math.floor(calculation.yearsRemaining)} ${t('calculator.years')}, ${calculation.monthsRemaining % 12} ${t('calculator.months')}`,
      sublabel: `${calculation.monthsRemaining} ${t('calculator.totalMonths')}`,
      color: 'text-purple-500',
    },
  ];

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            {t('calculator.howCalculated')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Explanation items */}
          {items.map((item, index) => (
            <div key={index} className="flex items-start gap-3">
              <div className={`p-2 rounded-lg bg-muted ${item.color}`}>
                <item.icon className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{item.label}</p>
                <p className={`text-lg font-bold ${item.color}`}>{item.value}</p>
                {item.sublabel && (
                  <p className="text-xs text-muted-foreground">{item.sublabel}</p>
                )}
              </div>
            </div>
          ))}

          {/* Divider */}
          <div className="border-t pt-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <DollarSign className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{t('calculator.monthlyContributionNeeded')}</p>
                <p className="text-2xl font-bold text-primary">
                  {formatCurrency(calculation.monthlyContributionNeeded, 'USD')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t('calculator.assumingAnnualReturn')}
                </p>
              </div>
            </div>
          </div>

          {/* Formula explanation */}
          <div className="bg-muted/50 rounded-lg p-4 text-xs text-muted-foreground">
            <p className="font-medium mb-2">{t('calculator.theFormula')}</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>{t('calculator.formulaStep1')}</li>
              <li>{t('calculator.formulaStep2')}</li>
              <li>{t('calculator.formulaStep3')}</li>
            </ol>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
