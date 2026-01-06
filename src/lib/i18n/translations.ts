// Translations for Million Dollar Journey
// Supported languages: English (en), Czech (cs)

export type Language = 'en' | 'cs';

export const translations = {
  // Common
  'common.appName': {
    en: 'Million Dollar Journey',
    cs: 'Cesta k milionu',
  },
  'common.target': {
    en: 'Target',
    cs: 'Cíl',
  },
  'common.save': {
    en: 'Save',
    cs: 'Uložit',
  },
  'common.cancel': {
    en: 'Cancel',
    cs: 'Zrušit',
  },
  'common.delete': {
    en: 'Delete',
    cs: 'Smazat',
  },
  'common.edit': {
    en: 'Edit',
    cs: 'Upravit',
  },
  'common.add': {
    en: 'Add',
    cs: 'Přidat',
  },
  'common.close': {
    en: 'Close',
    cs: 'Zavřít',
  },
  'common.loading': {
    en: 'Loading...',
    cs: 'Načítání...',
  },
  'common.error': {
    en: 'Error',
    cs: 'Chyba',
  },
  'common.success': {
    en: 'Success',
    cs: 'Úspěch',
  },
  'common.viewAll': {
    en: 'View All',
    cs: 'Zobrazit vše',
  },
  'common.month': {
    en: 'month',
    cs: 'měsíc',
  },
  'common.year': {
    en: 'year',
    cs: 'rok',
  },
  'common.years': {
    en: 'years',
    cs: 'let',
  },
  'common.months': {
    en: 'months',
    cs: 'měsíců',
  },
  'common.remaining': {
    en: 'remaining',
    cs: 'zbývá',
  },
  'common.unknown': {
    en: 'Unknown',
    cs: 'Neznámý',
  },
  'common.somethingWentWrong': {
    en: 'Something went wrong',
    cs: 'Něco se pokazilo',
  },
  'common.date': {
    en: 'Date',
    cs: 'Datum',
  },
  'common.description': {
    en: 'Description',
    cs: 'Popis',
  },
  'common.saving': {
    en: 'Saving...',
    cs: 'Ukládání...',
  },
  'common.account': {
    en: 'Account',
    cs: 'Účet',
  },

  // Navigation
  'nav.dashboard': {
    en: 'Dashboard',
    cs: 'Přehled',
  },
  'nav.accounts': {
    en: 'Accounts',
    cs: 'Účty',
  },
  'nav.addTransaction': {
    en: 'Add Transaction',
    cs: 'Přidat transakci',
  },
  'nav.transactions': {
    en: 'Transactions',
    cs: 'Transakce',
  },
  'nav.goals': {
    en: 'Goals',
    cs: 'Cíle',
  },
  'nav.settings': {
    en: 'Settings',
    cs: 'Nastavení',
  },
  'nav.home': {
    en: 'Home',
    cs: 'Domů',
  },

  // Dashboard
  'dashboard.title': {
    en: 'Dashboard',
    cs: 'Přehled',
  },
  'dashboard.subtitle': {
    en: 'Your journey to financial freedom',
    cs: 'Vaše cesta k finanční svobodě',
  },
  'dashboard.totalNetWorth': {
    en: 'Total Net Worth',
    cs: 'Celkový majetek',
  },
  'dashboard.progressToGoal': {
    en: 'Progress to $1M',
    cs: 'Pokrok k $1M',
  },
  'dashboard.thisMonth': {
    en: 'this month',
    cs: 'tento měsíc',
  },
  'dashboard.monthlyContribution': {
    en: 'Monthly Contribution Needed',
    cs: 'Potřebná měsíční úspora',
  },
  'dashboard.perMonth': {
    en: '/month',
    cs: '/měsíc',
  },
  'dashboard.onTrack': {
    en: "You're on track! Keep it up!",
    cs: 'Jste na dobré cestě! Pokračujte!',
  },
  'dashboard.needMore': {
    en: 'Increase your monthly savings',
    cs: 'Zvyšte své měsíční úspory',
  },
  'dashboard.topAccounts': {
    en: 'Top Accounts',
    cs: 'Hlavní účty',
  },
  'dashboard.recentTransactions': {
    en: 'Recent Transactions',
    cs: 'Poslední transakce',
  },
  'dashboard.noAccounts': {
    en: 'No accounts yet',
    cs: 'Zatím žádné účty',
  },
  'dashboard.noTransactions': {
    en: 'No transactions yet',
    cs: 'Zatím žádné transakce',
  },
  'dashboard.addFirstAccount': {
    en: 'Add Your First Account',
    cs: 'Přidejte svůj první účet',
  },
  'dashboard.welcomeTitle': {
    en: 'Welcome to Your Journey!',
    cs: 'Vítejte na vaší cestě!',
  },
  'dashboard.welcomeSubtitle': {
    en: 'Start tracking your path to $1,000,000 by October 31, 2036. Add your first account to begin.',
    cs: 'Začněte sledovat svou cestu k $1,000,000 do 31. října 2036. Přidejte svůj první účet.',
  },
  'dashboard.target': {
    en: 'Target',
    cs: 'Cíl',
  },
  'dashboard.targetYear': {
    en: 'Target Year',
    cs: 'Cílový rok',
  },
  'dashboard.loading': {
    en: 'Loading dashboard...',
    cs: 'Načítání přehledu...',
  },
  'dashboard.loadFailed': {
    en: 'Failed to load dashboard data',
    cs: 'Nepodařilo se načíst data přehledu',
  },
  'dashboard.assetAllocation': {
    en: 'Asset Allocation',
    cs: 'Rozložení majetku',
  },
  'dashboard.total': {
    en: 'Total',
    cs: 'Celkem',
  },
  'dashboard.noData': {
    en: 'No data available',
    cs: 'Žádná data k dispozici',
  },
  'dashboard.investments': {
    en: 'Investments',
    cs: 'Investice',
  },
  'dashboard.cash': {
    en: 'Cash',
    cs: 'Hotovost',
  },
  'dashboard.netWorthHistory': {
    en: 'Net Worth History',
    cs: 'Historie majetku',
  },
  'dashboard.monthlyCommitments': {
    en: 'Monthly Commitments',
    cs: 'Měsíční závazky',
  },
  'dashboard.burnRate': {
    en: 'Burn Rate',
    cs: 'Měsíční výdaje',
  },
  'dashboard.fixedExpenses': {
    en: 'Fixed Expenses',
    cs: 'Fixní výdaje',
  },
  'dashboard.fixedIncome': {
    en: 'Fixed Income',
    cs: 'Fixní příjem',
  },
  'dashboard.netRecurring': {
    en: 'Net',
    cs: 'Čistý',
  },
  'dashboard.viewRecurring': {
    en: 'View Recurring',
    cs: 'Zobrazit pravidelné',
  },
  'dashboard.noRecurring': {
    en: 'No recurring transactions set up',
    cs: 'Žádné pravidelné transakce',
  },
  'dashboard.commitmentRatio': {
    en: 'Expenses vs Income',
    cs: 'Výdaje vs příjem',
  },
  'dashboard.aiAdvisor': {
    en: 'AI Financial Advisor',
    cs: 'AI Financni poradce',
  },
  'dashboard.aiDescription': {
    en: 'Get personalized insights about your finances',
    cs: 'Ziskejte personalizovane rady o vasich financich',
  },
  'dashboard.askAI': {
    en: 'Ask AI',
    cs: 'Zeptat se AI',
  },
  'dashboard.analyzing': {
    en: 'Analyzing your finances...',
    cs: 'Analyzuji vase finance...',
  },
  'dashboard.regenerate': {
    en: 'Regenerate',
    cs: 'Vygenerovat znovu',
  },
  'dashboard.aiError': {
    en: 'Could not generate advice',
    cs: 'Nepodarilo se vygenerovat radu',
  },
  'dashboard.tryAgain': {
    en: 'Try Again',
    cs: 'Zkusit znovu',
  },
  'dashboard.aiIdleMessage': {
    en: 'Get AI-powered insights and personalized financial advice based on your accounts, transactions, and goals.',
    cs: 'Ziskejte AI pohadane vhledy a personalizovane financni rady na zaklade vasich uctu, transakci a cilu.',
  },
  'dashboard.generatedJustNow': {
    en: 'Generated just now',
    cs: 'Vygenerovano prave ted',
  },
  'dashboard.generatedMinsAgo': {
    en: 'Generated {mins} min ago',
    cs: 'Vygenerovano pred {mins} min',
  },
  'dashboard.generatedHoursAgo': {
    en: 'Generated {hours}h ago',
    cs: 'Vygenerovano pred {hours}h',
  },
  'dashboard.generatedYesterday': {
    en: 'Generated yesterday',
    cs: 'Vygenerovano vcera',
  },

  // Welcome / Empty State
  'welcome.title': {
    en: 'Welcome to Your Journey!',
    cs: 'Vítejte na vaší cestě!',
  },
  'welcome.description': {
    en: 'Start tracking your path to $1,000,000 by October 31, 2036. Add your first account to begin.',
    cs: 'Začněte sledovat svou cestu k $1,000,000 do 31. října 2036. Přidejte svůj první účet.',
  },
  'welcome.targetYear': {
    en: 'Target Year',
    cs: 'Cílový rok',
  },
  'welcome.configureSettings': {
    en: 'Configure Settings',
    cs: 'Upravit nastavení',
  },

  // Accounts
  'accounts.title': {
    en: 'Accounts',
    cs: 'Účty',
  },
  'accounts.addAccount': {
    en: 'Add Account',
    cs: 'Přidat účet',
  },
  'accounts.editAccount': {
    en: 'Edit Account',
    cs: 'Upravit účet',
  },
  'accounts.deleteAccount': {
    en: 'Delete Account',
    cs: 'Smazat účet',
  },
  'accounts.accountName': {
    en: 'Account Name',
    cs: 'Název účtu',
  },
  'accounts.category': {
    en: 'Category',
    cs: 'Kategorie',
  },
  'accounts.currency': {
    en: 'Currency',
    cs: 'Měna',
  },
  'accounts.balance': {
    en: 'Balance',
    cs: 'Zůstatek',
  },
  'accounts.currentBalance': {
    en: 'Current Balance',
    cs: 'Aktuální zůstatek',
  },
  'accounts.isInvestment': {
    en: 'This is an investment account',
    cs: 'Toto je investiční účet',
  },
  'accounts.investmentHint': {
    en: 'Investment accounts grow at the specified interest rate',
    cs: 'Investiční účty rostou podle zadané úrokové sazby',
  },
  'accounts.interestRate': {
    en: 'Annual Interest Rate (%)',
    cs: 'Roční úroková sazba (%)',
  },
  'accounts.institution': {
    en: 'Institution',
    cs: 'Instituce',
  },
  'accounts.notes': {
    en: 'Notes',
    cs: 'Poznámky',
  },
  'accounts.totalAssets': {
    en: 'Total Assets',
    cs: 'Celková aktiva',
  },
  'accounts.totalLiabilities': {
    en: 'Total Liabilities',
    cs: 'Celkové závazky',
  },
  'accounts.noAccountsInCategory': {
    en: 'No accounts in this category',
    cs: 'Žádné účty v této kategorii',
  },
  'accounts.uncategorized': {
    en: 'Uncategorized',
    cs: 'Bez kategorie',
  },
  'accounts.confirmDelete': {
    en: 'Are you sure you want to delete this account?',
    cs: 'Opravdu chcete smazat tento účet?',
  },
  'accounts.addFirstAccount': {
    en: 'Add Your First Account',
    cs: 'Přidat první účet',
  },
  'accounts.noCategories': {
    en: 'No categories available',
    cs: 'Žádné kategorie',
  },
  'accounts.selectCategory': {
    en: 'Select category',
    cs: 'Vyberte kategorii',
  },
  'accounts.noCategory': {
    en: 'No category',
    cs: 'Bez kategorie',
  },
  'accounts.updatedSuccess': {
    en: 'Account updated!',
    cs: 'Účet byl aktualizován!',
  },
  'accounts.createdSuccess': {
    en: 'Account created!',
    cs: 'Účet byl vytvořen!',
  },
  'accounts.deletedSuccess': {
    en: 'Account deleted',
    cs: 'Účet byl smazán',
  },
  'accounts.unknownAccount': {
    en: 'Unknown account',
    cs: 'Neznámý účet',
  },
  'accounts.apy': {
    en: 'APY',
    cs: 'Roční výnos',
  },
  'accounts.noAccountsForCurrency': {
    en: 'No accounts found for this currency',
    cs: 'Nenalezeny žádné účty v této měně',
  },
  'accounts.filterByCurrency': {
    en: 'Filter by currency',
    cs: 'Filtrovat podle měny',
  },
  'accounts.namePlaceholder': {
    en: 'e.g., Interactive Brokers',
    cs: 'např. Fio banka',
  },
  'accounts.institutionPlaceholder': {
    en: 'e.g., Fio banka',
    cs: 'např. Fio banka',
  },
  'accounts.placeholderAccountName': {
    en: 'e.g., Interactive Brokers',
    cs: 'např. Fio banka',
  },
  'accounts.placeholderInstitution': {
    en: 'e.g., Fio banka',
    cs: 'např. Fio banka',
  },

  // Categories
  'category.stocks': {
    en: 'Stocks & ETFs',
    cs: 'Akcie a ETF',
  },
  'category.crypto': {
    en: 'Crypto',
    cs: 'Krypto',
  },
  'category.savings': {
    en: 'Savings Accounts',
    cs: 'Spořicí účty',
  },
  'category.cash': {
    en: 'Cash',
    cs: 'Hotovost',
  },
  'category.realEstate': {
    en: 'Real Estate',
    cs: 'Nemovitosti',
  },
  'category.retirement': {
    en: 'Retirement',
    cs: 'Důchod',
  },
  'category.loans': {
    en: 'Loans',
    cs: 'Půjčky',
  },
  'category.mortgage': {
    en: 'Mortgage',
    cs: 'Hypotéka',
  },
  'category.asset': {
    en: 'Asset',
    cs: 'Aktivum',
  },
  'category.liability': {
    en: 'Liability',
    cs: 'Závazek',
  },

  // Transactions
  'transactions.title': {
    en: 'Transactions',
    cs: 'Transakce',
  },
  'transactions.addTransaction': {
    en: 'Add Transaction',
    cs: 'Přidat transakci',
  },
  'transactions.income': {
    en: 'Income',
    cs: 'Příjem',
  },
  'transactions.expense': {
    en: 'Expense',
    cs: 'Výdaj',
  },
  'transactions.transfer': {
    en: 'Transfer',
    cs: 'Převod',
  },
  'transactions.adjustment': {
    en: 'Adjustment',
    cs: 'Úprava',
  },
  'transactions.amount': {
    en: 'Amount',
    cs: 'Částka',
  },
  'transactions.date': {
    en: 'Date',
    cs: 'Datum',
  },
  'transactions.description': {
    en: 'Description',
    cs: 'Popis',
  },
  'transactions.account': {
    en: 'Account',
    cs: 'Účet',
  },
  'transactions.fromAccount': {
    en: 'From Account',
    cs: 'Z účtu',
  },
  'transactions.toAccount': {
    en: 'To Account',
    cs: 'Na účet',
  },
  'transactions.selectAccount': {
    en: 'Select account',
    cs: 'Vyberte účet',
  },
  'transactions.newBalance': {
    en: 'New Balance',
    cs: 'Nový zůstatek',
  },
  'transactions.history': {
    en: 'Transaction History',
    cs: 'Historie transakcí',
  },
  'transactions.noTransactions': {
    en: 'No transactions found',
    cs: 'Žádné transakce nenalezeny',
  },
  'transactions.filterByType': {
    en: 'Filter by type',
    cs: 'Filtrovat podle typu',
  },
  'transactions.filterByAccount': {
    en: 'Filter by account',
    cs: 'Filtrovat podle účtu',
  },
  'transactions.all': {
    en: 'All',
    cs: 'Vše',
  },
  'transactions.added': {
    en: 'Transaction added successfully',
    cs: 'Transakce byla úspěšně přidána',
  },
  'transactions.addedSuccess': {
    en: 'Transaction added successfully!',
    cs: 'Transakce byla úspěšně přidána!',
  },
  'transactions.addFailed': {
    en: 'Failed to add transaction',
    cs: 'Nepodařilo se přidat transakci',
  },
  'transactions.noDescription': {
    en: 'No description',
    cs: 'Bez popisu',
  },
  'transactions.selectSourceAccount': {
    en: 'Select source account',
    cs: 'Vyberte zdrojový účet',
  },
  'transactions.selectDestinationAccount': {
    en: 'Select destination account',
    cs: 'Vyberte cílový účet',
  },
  'transactions.descriptionPlaceholder': {
    en: "What's this for?",
    cs: 'K čemu to je?',
  },
  'transactions.amountPlaceholder': {
    en: '0',
    cs: '0',
  },
  'transactionType.income': {
    en: 'Income',
    cs: 'Příjem',
  },
  'transactionType.expense': {
    en: 'Expense',
    cs: 'Výdaj',
  },
  'transactionType.transfer': {
    en: 'Transfer',
    cs: 'Převod',
  },
  'transactionType.adjustment': {
    en: 'Adjustment',
    cs: 'Úprava',
  },
  'transactions.transferOut': {
    en: 'Transfer out',
    cs: 'Odchozí převod',
  },
  'transactions.transferIn': {
    en: 'Transfer in',
    cs: 'Příchozí převod',
  },
  'transactions.balanceAdjustment': {
    en: 'Balance adjustment',
    cs: 'Úprava zůstatku',
  },
  'transactions.allAccounts': {
    en: 'All Accounts',
    cs: 'Všechny účty',
  },
  'transactions.noTransactionsHint': {
    en: 'Add your first transaction to start tracking',
    cs: 'Přidejte svou první transakci a začněte sledovat',
  },
  'transactions.currency': {
    en: 'Currency',
    cs: 'Měna',
  },
  'transactions.noTransactionsForCurrency': {
    en: 'No transactions found for this currency',
    cs: 'Pro tuto měnu nebyly nalezeny žádné transakce',
  },
  'transactions.note': {
    en: 'Note',
    cs: 'Poznámka',
  },
  'transactions.notePlaceholder': {
    en: "What's this for?",
    cs: 'K čemu to je?',
  },
  'transactions.saveTransaction': {
    en: 'Save Transaction',
    cs: 'Uložit transakci',
  },
  'transactions.newTransaction': {
    en: 'New Transaction',
    cs: 'Nová transakce',
  },
  'transactions.selectFromAccount': {
    en: 'From account',
    cs: 'Z účtu',
  },
  'transactions.selectToAccount': {
    en: 'To account',
    cs: 'Na účet',
  },
  'transactions.update': {
    en: 'Update',
    cs: 'Úprava',
  },
  'transactions.confirmDelete': {
    en: 'Are you sure you want to delete this transaction?',
    cs: 'Opravdu chcete smazat tuto transakci?',
  },
  'transactions.deleted': {
    en: 'Transaction deleted',
    cs: 'Transakce smazána',
  },
  'transactions.deleteError': {
    en: 'Failed to delete transaction',
    cs: 'Nepodařilo se smazat transakci',
  },

  // Settings
  'settings.title': {
    en: 'Settings',
    cs: 'Nastavení',
  },
  'settings.profile': {
    en: 'Profile',
    cs: 'Profil',
  },
  'settings.targetAmount': {
    en: 'Target Amount (USD)',
    cs: 'Cílová částka (USD)',
  },
  'settings.targetDate': {
    en: 'Target Date',
    cs: 'Cílové datum',
  },
  'settings.preferences': {
    en: 'Preferences',
    cs: 'Předvolby',
  },
  'settings.language': {
    en: 'Language',
    cs: 'Jazyk',
  },
  'settings.displayCurrency': {
    en: 'Display Currency',
    cs: 'Zobrazovaná měna',
  },
  'settings.dataManagement': {
    en: 'Data Management',
    cs: 'Správa dat',
  },
  'settings.recalculateGoal': {
    en: 'Recalculate Goal',
    cs: 'Přepočítat cíl',
  },
  'settings.recalculateHint': {
    en: 'Manually recalculate your monthly contribution based on current data',
    cs: 'Ručně přepočítat měsíční příspěvek na základě aktuálních dat',
  },
  'settings.exportData': {
    en: 'Export Data',
    cs: 'Exportovat data',
  },
  'settings.exportSuccess': {
    en: 'Data exported successfully!',
    cs: 'Data úspěšně exportována!',
  },
  'settings.exportHint': {
    en: 'Download all your data as JSON',
    cs: 'Stáhnout všechna data jako JSON',
  },
  'settings.targetAmountLabel': {
    en: 'Target Amount (USD)',
    cs: 'Cílová částka (USD)',
  },
  'settings.targetDateLabel': {
    en: 'Target Date',
    cs: 'Cílové datum',
  },
  'settings.saveSettings': {
    en: 'Save Settings',
    cs: 'Uložit nastavení',
  },
  'settings.savingSettings': {
    en: 'Saving...',
    cs: 'Ukládání...',
  },
  'settings.saved': {
    en: 'Settings saved',
    cs: 'Nastavení uloženo',
  },
  'settings.english': {
    en: 'English',
    cs: 'Angličtina',
  },
  'settings.czech': {
    en: 'Czech',
    cs: 'Čeština',
  },
  'settings.configure': {
    en: 'Configure Settings',
    cs: 'Nastavení',
  },
  'settings.configureGoal': {
    en: 'Configure your financial goal',
    cs: 'Nastavte svůj finanční cíl',
  },
  'settings.manageCategories': {
    en: 'Manage Categories',
    cs: 'Správa kategorií',
  },
  'settings.categoryDescription': {
    en: 'Create custom categories for organizing your accounts',
    cs: 'Vytvořte vlastní kategorie pro organizaci účtů',
  },
  'settings.categoryNamePlaceholder': {
    en: 'Category name',
    cs: 'Název kategorie',
  },
  'settings.asset': {
    en: 'Asset',
    cs: 'Aktivum',
  },
  'settings.liability': {
    en: 'Liability',
    cs: 'Závazek',
  },
  'settings.noCategoriesYet': {
    en: 'No categories yet. Add your first one above.',
    cs: 'Zatím žádné kategorie. Přidejte první výše.',
  },
  'settings.categoryCreated': {
    en: 'Category created!',
    cs: 'Kategorie vytvořena!',
  },
  'settings.categoryCreateFailed': {
    en: 'Failed to create category',
    cs: 'Nepodařilo se vytvořit kategorii',
  },
  'settings.confirmDeleteCategory': {
    en: 'Delete this category?',
    cs: 'Smazat tuto kategorii?',
  },
  'settings.categoryDeleted': {
    en: 'Category deleted',
    cs: 'Kategorie smazána',
  },
  'settings.categoryDeleteFailed': {
    en: 'Failed to delete category',
    cs: 'Nepodařilo se smazat kategorii',
  },
  'settings.noAccountsFound': {
    en: 'No accounts found. Add some accounts first.',
    cs: 'Žádné účty nenalezeny. Nejprve přidejte účty.',
  },
  'settings.recalculationError': {
    en: 'Error during recalculation',
    cs: 'Chyba při přepočtu',
  },
  'settings.version': {
    en: 'Version',
    cs: 'Verze',
  },
  'settings.recalculationComplete': {
    en: 'Recalculation complete!',
    cs: 'Přepočet dokončen!',
  },
  'settings.saveFailed': {
    en: 'Failed to save settings',
    cs: 'Uložení nastavení se nezdařilo',
  },
  'settings.saveSuccess': {
    en: 'Settings saved successfully',
    cs: 'Nastavení bylo uloženo',
  },
  'settings.exportError': {
    en: 'Export failed',
    cs: 'Export se nezdařil',
  },
  'settings.exportDescription': {
    en: 'Export your financial data for backup or analysis',
    cs: 'Exportujte data pro zálohu nebo analýzu',
  },
  'settings.exportTransactions': {
    en: 'Export All Transactions (CSV)',
    cs: 'Exportovat všechny transakce (CSV)',
  },
  'settings.exportAccounts': {
    en: 'Export Accounts (CSV)',
    cs: 'Exportovat účty (CSV)',
  },
  'settings.exporting': {
    en: 'Exporting...',
    cs: 'Exportuji...',
  },
  'settings.importData': {
    en: 'Import Data',
    cs: 'Importovat data',
  },
  'settings.importDescription': {
    en: 'Import transactions from CSV file',
    cs: 'Importovat transakce z CSV souboru',
  },
  'settings.currentNetWorthLabel': {
    en: 'Current Net Worth',
    cs: 'Aktuální čisté jmění',
  },
  'settings.monthlyContributionLabel': {
    en: 'Monthly Contribution Needed',
    cs: 'Potřebný měsíční příspěvek',
  },
  'settings.projectedNetWorthLabel': {
    en: 'Projected Net Worth at Target',
    cs: 'Předpokládané jmění v cílovém datu',
  },

  // Validation
  'validation.required': {
    en: 'This field is required',
    cs: 'Toto pole je povinné',
  },
  'validation.positiveNumber': {
    en: 'Must be a positive number',
    cs: 'Musí být kladné číslo',
  },
  'validation.invalidDate': {
    en: 'Invalid date',
    cs: 'Neplatné datum',
  },
  'validation.selectAccount': {
    en: 'Please select an account',
    cs: 'Prosím vyberte účet',
  },
  'validation.differentAccounts': {
    en: 'Source and destination must be different',
    cs: 'Zdroj a cíl musí být různé',
  },
  'validation.nameRequired': {
    en: 'Name is required',
    cs: 'Název je povinný',
  },
  'validation.balancePositive': {
    en: 'Balance must be positive',
    cs: 'Zůstatek musí být kladný',
  },

  // Error Messages
  'error.notAuthenticated': {
    en: 'Not authenticated',
    cs: 'Nejste přihlášeni',
  },
  'error.cannotDeleteCategoryWithAccounts': {
    en: 'Cannot delete category with existing accounts',
    cs: 'Nelze smazat kategorii s existujícími účty',
  },
  'error.transactionCreatedButBalanceFailed': {
    en: 'Transaction created but balance update failed',
    cs: 'Transakce vytvořena, ale aktualizace zůstatku selhala',
  },

  // Auth
  'auth.signOut': {
    en: 'Sign Out',
    cs: 'Odhlásit se',
  },
  'auth.mustBeLoggedIn': {
    en: 'You must be logged in',
    cs: 'Musíte být přihlášeni',
  },
  'auth.unexpectedError': {
    en: 'An unexpected error occurred',
    cs: 'Došlo k neočekávané chybě',
  },
  'auth.checkEmail': {
    en: 'Check your email for the confirmation link!',
    cs: 'Zkontrolujte email pro potvrzovací odkaz!',
  },
  'auth.trackJourney': {
    en: 'Track your journey to $1,000,000',
    cs: 'Sledujte svou cestu k 1 000 000 $',
  },
  'auth.login': {
    en: 'Login',
    cs: 'Přihlášení',
  },
  'auth.signUp': {
    en: 'Sign Up',
    cs: 'Registrace',
  },
  'auth.signIn': {
    en: 'Sign In',
    cs: 'Přihlásit se',
  },
  'auth.email': {
    en: 'Email',
    cs: 'Email',
  },
  'auth.emailPlaceholder': {
    en: 'you@example.com',
    cs: 'vas@email.cz',
  },
  'auth.password': {
    en: 'Password',
    cs: 'Heslo',
  },
  'auth.passwordPlaceholder': {
    en: '••••••••',
    cs: '••••••••',
  },
  'auth.signingIn': {
    en: 'Signing in...',
    cs: 'Přihlašování...',
  },
  'auth.creatingAccount': {
    en: 'Creating account...',
    cs: 'Vytváření účtu...',
  },
  'auth.createAccount': {
    en: 'Create Account',
    cs: 'Vytvořit účet',
  },
  'auth.passwordMinLength': {
    en: 'Password must be at least 6 characters',
    cs: 'Heslo musí mít alespoň 6 znaků',
  },
  'auth.account': {
    en: 'Account',
    cs: 'Účet',
  },
  'auth.appTitle': {
    en: 'Million Dollar',
    cs: 'Cesta k milionu',
  },
  'auth.appSubtitle': {
    en: 'Journey',
    cs: 'dolarů',
  },
  'auth.targetInfo': {
    en: 'Target: $1,000,000 by October 31, 2036',
    cs: 'Cíl: 1 000 000 $ do 31. října 2036',
  },

  // Calculator (Math Explanation)
  'calculator.targetAmount': {
    en: 'Target Amount',
    cs: 'Cílová částka',
  },
  'calculator.currentNetWorth': {
    en: 'Current Net Worth',
    cs: 'Aktuální čisté jmění',
  },
  'calculator.projectedValue': {
    en: 'Projected Value (at target date)',
    cs: 'Předpokládaná hodnota (k cílovému datu)',
  },
  'calculator.projectedValueHint': {
    en: 'Your current holdings growing at their interest rates',
    cs: 'Váš majetek rostoucí dle úrokových sazeb',
  },
  'calculator.gapToTarget': {
    en: 'Gap to Target',
    cs: 'Zbývá do cíle',
  },
  'calculator.gapToTargetHint': {
    en: 'Target minus projected value',
    cs: 'Cíl minus předpokládaná hodnota',
  },
  'calculator.timeRemaining': {
    en: 'Time Remaining',
    cs: 'Zbývající čas',
  },
  'calculator.totalMonths': {
    en: 'total months',
    cs: 'měsíců celkem',
  },
  'calculator.howCalculated': {
    en: 'How is this calculated?',
    cs: 'Jak se to počítá?',
  },
  'calculator.monthlyContribution': {
    en: 'Monthly Contribution Needed',
    cs: 'Potřebný měsíční příspěvek',
  },
  'calculator.assumedReturn': {
    en: 'Assuming 8% annual return on new contributions',
    cs: 'Předpokládaný 8% roční výnos z nových příspěvků',
  },
  'calculator.formula': {
    en: 'The Formula:',
    cs: 'Vzorec:',
  },
  'calculator.step1': {
    en: 'Calculate future value of current investments (compound growth)',
    cs: 'Vypočítat budoucí hodnotu investic (složené úročení)',
  },
  'calculator.step2': {
    en: 'Subtract from target to find the gap',
    cs: 'Odečíst od cíle pro zjištění rozdílu',
  },
  'calculator.step3': {
    en: 'Use Future Value of Annuity formula to find monthly payment',
    cs: 'Použít vzorec anuity pro výpočet měsíční platby',
  },
  'calculator.projectedValueSublabel': {
    en: 'Your current holdings growing at their interest rates',
    cs: 'Váš majetek rostoucí dle úrokových sazeb',
  },
  'calculator.gapToTargetSublabel': {
    en: 'Target minus projected value',
    cs: 'Cíl minus předpokládaná hodnota',
  },
  'calculator.years': {
    en: 'years',
    cs: 'let',
  },
  'calculator.months': {
    en: 'months',
    cs: 'měsíců',
  },
  'calculator.monthlyContributionNeeded': {
    en: 'Monthly Contribution Needed',
    cs: 'Potřebný měsíční příspěvek',
  },
  'calculator.assumingAnnualReturn': {
    en: 'Assuming 8% annual return on new contributions',
    cs: 'Předpokládaný 8% roční výnos z nových příspěvků',
  },
  'calculator.theFormula': {
    en: 'The Formula:',
    cs: 'Vzorec:',
  },
  'calculator.formulaStep1': {
    en: 'Calculate future value of current investments (compound growth)',
    cs: 'Vypočítat budoucí hodnotu investic (složené úročení)',
  },
  'calculator.formulaStep2': {
    en: 'Subtract from target to find the gap',
    cs: 'Odečíst od cíle pro zjištění rozdílu',
  },
  'calculator.formulaStep3': {
    en: 'Use Future Value of Annuity formula to find monthly payment',
    cs: 'Použít vzorec anuity pro výpočet měsíční platby',
  },

  // Currency
  'currency.CZK': {
    en: 'CZK (Kč)',
    cs: 'CZK (Kč)',
  },
  'currency.USD': {
    en: 'USD ($)',
    cs: 'USD ($)',
  },
  'currency.EUR': {
    en: 'EUR (€)',
    cs: 'EUR (€)',
  },

  // Recurring Transactions
  'recurring.title': {
    en: 'Recurring Payments',
    cs: 'Pravidelne platby',
  },
  'recurring.addNew': {
    en: 'Add Recurring',
    cs: 'Pridat pravidelnou platbu',
  },
  'recurring.monthlyFixedCosts': {
    en: 'Monthly Fixed Costs',
    cs: 'Mesicni fixni naklady',
  },
  'recurring.monthlyIncome': {
    en: 'Monthly Income',
    cs: 'Mesicni prijem',
  },
  'recurring.netMonthly': {
    en: 'Net Monthly',
    cs: 'Mesicni bilance',
  },
  'recurring.frequency': {
    en: 'Frequency',
    cs: 'Frekvence',
  },
  'recurring.nextDue': {
    en: 'Next Due',
    cs: 'Dalsi platba',
  },
  'recurring.weekly': {
    en: 'Weekly',
    cs: 'Tydenni',
  },
  'recurring.monthly': {
    en: 'Monthly',
    cs: 'Mesicni',
  },
  'recurring.yearly': {
    en: 'Yearly',
    cs: 'Rocni',
  },
  'recurring.name': {
    en: 'Name',
    cs: 'Nazev',
  },
  'recurring.namePlaceholder': {
    en: 'e.g., Netflix, Rent, Salary',
    cs: 'napr. Netflix, Najem, Mzda',
  },
  'recurring.type': {
    en: 'Type',
    cs: 'Typ',
  },
  'recurring.active': {
    en: 'Active',
    cs: 'Aktivni',
  },
  'recurring.inactive': {
    en: 'Inactive',
    cs: 'Neaktivni',
  },
  'recurring.editRecurring': {
    en: 'Edit Recurring Payment',
    cs: 'Upravit pravidelnou platbu',
  },
  'recurring.addRecurring': {
    en: 'Add Recurring Payment',
    cs: 'Pridat pravidelnou platbu',
  },
  'recurring.noRecurring': {
    en: 'No recurring payments yet',
    cs: 'Zatim zadne pravidelne platby',
  },
  'recurring.noRecurringHint': {
    en: 'Add subscriptions, rent, salary, and other recurring transactions',
    cs: 'Pridejte predplatne, najem, mzdu a dalsi pravidelne transakce',
  },
  'recurring.createdSuccess': {
    en: 'Recurring payment created!',
    cs: 'Pravidelna platba vytvorena!',
  },
  'recurring.updatedSuccess': {
    en: 'Recurring payment updated!',
    cs: 'Pravidelna platba aktualizovana!',
  },
  'recurring.deletedSuccess': {
    en: 'Recurring payment deleted',
    cs: 'Pravidelna platba smazana',
  },
  'recurring.confirmDelete': {
    en: 'Are you sure you want to delete this recurring payment?',
    cs: 'Opravdu chcete smazat tuto pravidelnou platbu?',
  },
  'recurring.selectCategory': {
    en: 'Select category (optional)',
    cs: 'Vyberte kategorii (volitelne)',
  },
  'recurring.noCategory': {
    en: 'No category',
    cs: 'Bez kategorie',
  },
  'recurring.duePayments': {
    en: 'You have {count} payment(s) due',
    cs: 'Mate {count} splatnych plateb',
  },
  'recurring.clickToExpand': {
    en: 'Click to view details',
    cs: 'Kliknete pro zobrazeni detailu',
  },
  'recurring.processAll': {
    en: 'Process All',
    cs: 'Zpracovat vse',
  },
  'recurring.processing': {
    en: 'Processing...',
    cs: 'Zpracovavam...',
  },
  'recurring.process': {
    en: 'Process',
    cs: 'Zpracovat',
  },
  'recurring.dueOn': {
    en: 'Due on',
    cs: 'Splatne',
  },
  'recurring.processedSuccess': {
    en: '{name} processed successfully!',
    cs: '{name} uspesne zpracovano!',
  },
  'recurring.allProcessedSuccess': {
    en: '{count} payment(s) processed successfully!',
    cs: '{count} plateb uspesne zpracovano!',
  },

  // Navigation additions
  'nav.recurring': {
    en: 'Recurring',
    cs: 'Pravidelne',
  },
  'nav.import': {
    en: 'Import',
    cs: 'Import',
  },

  // Import
  'import.title': {
    en: 'Import Transactions',
    cs: 'Import transakcí',
  },
  'import.uploadFile': {
    en: 'Upload CSV File',
    cs: 'Nahrát CSV soubor',
  },
  'import.dragDrop': {
    en: 'Drag & drop or click to browse',
    cs: 'Přetáhněte nebo klikněte',
  },
  'import.preview': {
    en: 'Preview & Map Columns',
    cs: 'Náhled a mapování sloupců',
  },
  'import.mapColumn': {
    en: 'Map to field',
    cs: 'Přiřadit k poli',
  },
  'import.skip': {
    en: 'Skip',
    cs: 'Přeskočit',
  },
  'import.selectAccount': {
    en: 'Select Account',
    cs: 'Vybrat účet',
  },
  'import.importButton': {
    en: 'Import Transactions',
    cs: 'Importovat transakce',
  },
  'import.success': {
    en: 'Successfully imported {count} transactions',
    cs: 'Úspěšně importováno {count} transakcí',
  },
  'import.requiredFields': {
    en: 'Date and Amount must be mapped',
    cs: 'Datum a částka musí být přiřazeny',
  },
  'import.step1': {
    en: 'Upload File',
    cs: 'Nahrát soubor',
  },
  'import.step2': {
    en: 'Map Columns',
    cs: 'Mapování sloupců',
  },
  'import.step3': {
    en: 'Configure',
    cs: 'Nastavení',
  },
  'import.step4': {
    en: 'Import',
    cs: 'Import',
  },
  'import.next': {
    en: 'Next',
    cs: 'Další',
  },
  'import.back': {
    en: 'Back',
    cs: 'Zpět',
  },
  'import.fileSelected': {
    en: 'File selected',
    cs: 'Soubor vybrán',
  },
  'import.removeFile': {
    en: 'Remove file',
    cs: 'Odebrat soubor',
  },
  'import.previewRows': {
    en: 'Showing first {count} rows',
    cs: 'Zobrazeno prvních {count} řádků',
  },
  'import.date': {
    en: 'Date',
    cs: 'Datum',
  },
  'import.amount': {
    en: 'Amount',
    cs: 'Částka',
  },
  'import.description': {
    en: 'Description',
    cs: 'Popis',
  },
  'import.currency': {
    en: 'Currency',
    cs: 'Měna',
  },
  'import.type': {
    en: 'Type (income/expense)',
    cs: 'Typ (příjem/výdaj)',
  },
  'import.defaultType': {
    en: 'Default Transaction Type',
    cs: 'Výchozí typ transakce',
  },
  'import.defaultCategory': {
    en: 'Default Category (optional)',
    cs: 'Výchozí kategorie (volitelné)',
  },
  'import.noCategory': {
    en: 'No category',
    cs: 'Bez kategorie',
  },
  'import.importing': {
    en: 'Importing...',
    cs: 'Importuji...',
  },
  'import.importComplete': {
    en: 'Import Complete',
    cs: 'Import dokončen',
  },
  'import.importFailed': {
    en: 'Import failed',
    cs: 'Import selhal',
  },
  'import.rowsToImport': {
    en: '{count} transactions will be imported',
    cs: '{count} transakcí bude importováno',
  },
  'import.invalidFile': {
    en: 'Please select a valid CSV file',
    cs: 'Prosím vyberte platný CSV soubor',
  },
  'import.parseError': {
    en: 'Error parsing CSV file',
    cs: 'Chyba při zpracování CSV souboru',
  },
  'import.selectAccountFirst': {
    en: 'Please select an account',
    cs: 'Prosím vyberte účet',
  },
  'import.startOver': {
    en: 'Import More',
    cs: 'Importovat další',
  },
  'import.goToTransactions': {
    en: 'View Transactions',
    cs: 'Zobrazit transakce',
  },
} as const;

export type TranslationKey = keyof typeof translations;

export function getTranslation(key: TranslationKey, language: Language): string {
  const translation = translations[key];
  if (!translation) {
    console.warn(`Missing translation for key: ${key}`);
    return key;
  }
  return translation[language] || translation.en;
}
