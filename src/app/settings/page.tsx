'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Save, DollarSign, Target, Calendar, Download, Plus, Trash2, Tag } from 'lucide-react';
import { toast } from 'sonner';
import { createCategory, deleteCategory, getCategories, updateProfile, exportUserData } from '@/app/actions/settings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useLanguage } from '@/lib/contexts/LanguageContext';
import { createClient } from '@/lib/supabase/client';
import { calculateMonthlyContribution } from '@/lib/services/calculator';
import type { Profile, Account, AccountCategory } from '@/types/database';

export default function SettingsPage() {
  const { t } = useLanguage();
  const router = useRouter();

  // Function to safely extract YYYY-MM-DD for HTML date inputs
  const toInputDate = (isoString?: string | null): string => {
    if (!isoString) return '';
    try {
      // Handle various date formats and extract YYYY-MM-DD
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return ''; // Invalid date
      // Use UTC to avoid timezone shifts
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const day = String(date.getUTCDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch (e) {
      console.error('Date parsing error:', e);
      return '';
    }
  };

  const [profile, setProfile] = useState<Profile | null>(null);
  const [targetAmount, setTargetAmount] = useState(1000000);
  const [targetDate, setTargetDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [categories, setCategories] = useState<AccountCategory[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryType, setNewCategoryType] = useState<'asset' | 'liability'>('asset');
  const [addingCategory, setAddingCategory] = useState(false);

  async function loadCategories() {
    const cats = await getCategories();
    setCategories(cats);
  }

  useEffect(() => {
    loadProfile();
    loadCategories();
  }, []);

  // Sync state when profile loads from database
  useEffect(() => {
    if (profile?.target_date) {
      const formatted = toInputDate(profile.target_date);
      setTargetDate(formatted);
    }
    if (profile?.target_amount_usd !== undefined) {
      setTargetAmount(profile.target_amount_usd);
    }
  }, [profile]); // Dependency on entire profile object, not just specific properties

  async function loadProfile() {
    try {
      const supabase = createClient();

      // Use getUser() to fetch the authenticated user from the session
      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (userError) {
        console.error('Settings: Error fetching user:', userError);
        router.push('/login');
        return;
      }

      if (!userData?.user?.id) {
        console.warn('Settings: No authenticated user found, redirecting to login');
        router.push('/login');
        return;
      }

      const { data, error: queryError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userData.user.id)
        .single();

      if (data) {
        setProfile(data);
        // targetAmount and targetDate are synced via useEffect when profile changes
      } else if (queryError) {
        console.error('Settings: Error loading profile from DB:', queryError);
      } else {
        console.warn('Settings: No profile data returned from DB');
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveProfile(e?: React.MouseEvent<HTMLButtonElement>) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    setSaving(true);
    setSaved(false);

    try {
      // Ensure targetDate is properly formatted as YYYY-MM-DD string
      // Cast to 'any' to allow the instanceof check regardless of the interface type
      const rawDate = targetDate as any;
      const formattedDate = rawDate instanceof Date
        ? rawDate.toISOString().split('T')[0]
        : String(rawDate);

      // Use the server action instead of direct Supabase call
      const result = await updateProfile({
        targetAmountUsd: targetAmount,
        targetDate: formattedDate,
      });

      if (result.error) {
        toast.error(result.error);
        console.error('Error saving profile:', result.error);
      } else {
        setSaved(true);
        toast.success(t('settings.saved') || 'Settings saved successfully');

        // Refresh the page to load updated data
        router.refresh();

        setTimeout(() => setSaved(false), 3000);
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error(t('settings.saveFailed') || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  async function handleExportData() {
    try {
      // Use server action to fetch data (handles auth properly)
      const result = await exportUserData();

      if (!result.success || !result.data) {
        toast.error(result.error || t('settings.exportError') || 'Export failed');
        return;
      }

      const exportData = {
        exportDate: new Date().toISOString(),
        profile: result.data.profile,
        accounts: result.data.accounts,
        transactions: result.data.transactions,
        categories: result.data.categories,
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mdj-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(t('settings.exportSuccess') || 'Data exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error(t('common.somethingWentWrong'));
    }
  }

  async function handleAddCategory() {
    if (!newCategoryName.trim()) return;

    setAddingCategory(true);
    try {
      const result = await createCategory({
        name: newCategoryName.trim(),
        type: newCategoryType,
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(t('settings.categoryCreated'));
        setNewCategoryName('');
        await loadCategories();
      }
    } catch (error) {
      toast.error(t('settings.categoryCreateFailed'));
    } finally {
      setAddingCategory(false);
    }
  }

  async function handleDeleteCategory(categoryId: string) {
    if (!confirm(t('settings.confirmDeleteCategory'))) return;

    try {
      const result = await deleteCategory(categoryId);

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(t('settings.categoryDeleted'));
        await loadCategories();
      }
    } catch (error) {
      toast.error(t('settings.categoryDeleteFailed'));
    }
  }

  if (loading) {
    return (
      <div className="p-4 lg:p-6 flex items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="pt-2 pb-4">
        <h1 className="text-3xl font-bold tracking-tight">{t('settings.title')}</h1>
      </div>

      {/* Profile Settings Group */}
      <div className="space-y-2">
        <p className="section-header">{t('settings.profile')}</p>
        <div className="settings-group">
          <div className="p-5 space-y-5">
            {/* Section Header with Icon */}
            <div className="flex items-center gap-3">
              <div className="icon-container-sm bg-indigo-500/10">
                <Target className="h-4 w-4 text-indigo-500" />
              </div>
              <div>
                <p className="font-medium text-sm">{t('settings.configureGoal')}</p>
              </div>
            </div>

            {/* Target Amount */}
            <div className="space-y-2">
              <label htmlFor="targetAmount" className="text-sm font-medium text-muted-foreground">
                {t('settings.targetAmount')}
              </label>
              <div className="relative">
                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="targetAmount"
                  type="number"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(Number(e.target.value))}
                  className="input-premium h-12 rounded-xl pl-11"
                />
              </div>
            </div>

            {/* Target Date */}
            <div className="space-y-2">
              <label htmlFor="targetDate" className="text-sm font-medium text-muted-foreground">
                {t('settings.targetDate')}
              </label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="targetDate"
                  type="date"
                  value={targetDate}
                  onChange={(e) => {
                    setTargetDate(e.target.value);
                  }}
                  className="input-premium h-12 rounded-xl pl-11"
                />
              </div>
            </div>

            {/* Save Button */}
            <Button
              type="button"
              onClick={handleSaveProfile}
              disabled={saving}
              className="w-full btn-premium-lg rounded-2xl"
              data-testid="save-settings-button"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? t('common.loading') : saved ? t('settings.saved') : t('common.save')}
            </Button>
          </div>
        </div>
      </div>

      {/* Category Management Group */}
      <div className="space-y-2">
        <p className="section-header">{t('settings.manageCategories')}</p>
        <div className="settings-group">
          <div className="p-5 space-y-4">
            {/* Section Header with Icon */}
            <div className="flex items-center gap-3">
              <div className="icon-container-sm bg-violet-500/10">
                <Tag className="h-4 w-4 text-violet-500" />
              </div>
              <div>
                <p className="font-medium text-sm">{t('settings.categoryDescription')}</p>
              </div>
            </div>

            {/* Add New Category Form */}
            <div className="flex gap-2">
              <Input
                placeholder={t('settings.categoryNamePlaceholder')}
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="input-premium h-12 rounded-xl flex-1"
              />
              <Select
                value={newCategoryType}
                onValueChange={(value) => setNewCategoryType(value as 'asset' | 'liability')}
              >
                <SelectTrigger className="select-premium h-12 rounded-xl w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asset">{t('settings.asset')}</SelectItem>
                  <SelectItem value="liability">{t('settings.liability')}</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={handleAddCategory}
                disabled={addingCategory || !newCategoryName.trim()}
                className="h-12 w-12 rounded-xl"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Category List */}
          <div className="border-t border-border/30">
            {categories.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  {t('settings.noCategoriesYet')}
                </p>
              </div>
            ) : (
              categories.map((category) => (
                <div
                  key={category.id}
                  className="settings-item"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-2.5 h-2.5 rounded-full ${
                        category.type === 'asset' ? 'bg-green-500' : 'bg-red-500'
                      }`}
                    />
                    <div>
                      <p className="font-medium text-sm">{category.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {t(`category.${category.type}`)}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteCategory(category.id)}
                    className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Data Management Group */}
      <div className="space-y-2">
        <p className="section-header">{t('settings.dataManagement')}</p>
        <div className="settings-group">
          <div className="p-5 space-y-4">
            {/* Section Header with Icon */}
            <div className="flex items-center gap-3">
              <div className="icon-container-sm bg-emerald-500/10">
                <Download className="h-4 w-4 text-emerald-500" />
              </div>
              <div>
                <p className="font-medium text-sm">{t('settings.exportData')}</p>
              </div>
            </div>

            {/* Export Button */}
            <Button
              onClick={handleExportData}
              variant="outline"
              className="w-full h-12 rounded-xl"
            >
              <Download className="h-4 w-4 mr-2" />
              {t('settings.exportData')}
            </Button>
          </div>
        </div>
      </div>

      {/* App Info */}
      <div className="py-6 text-center space-y-1">
        <p className="text-sm font-medium text-muted-foreground">{t('common.appName')}</p>
        <p className="text-xs text-muted-foreground/70">{t('settings.version')} 1.0.0</p>
        <p className="text-xs text-muted-foreground/60 mt-2">{t('auth.targetInfo')}</p>
      </div>
    </div>
  );
}
