// Trading 212 API Integration Service

export interface Trading212Account {
  id: string;
  name: string;
  balance: number;
  currency: string;
  type: 'portfolio' | 'cash' | 'pie';
}

export interface Trading212CashResponse {
  free: number;
  total: number;
  ppl: number;
  result: number;
  invested: number;
  pieCash: number;
  blocked: number;
  currency: string;
}

export interface Trading212PortfolioResponse {
  // Define based on T212 API response
}

/**
 * Fetches accounts from Trading 212 API
 * T212 returns aggregate portfolio data, we normalize it to account array format
 * @param apiKey - The Trading 212 API key
 * @param isDemo - If true, use demo environment; otherwise use live environment
 */
export async function fetchTrading212Accounts(apiKey: string, isDemo?: boolean): Promise<Trading212Account[]> {
  // Sanitize API key by trimming whitespace
  const cleanKey = apiKey.trim();

  // T212 API base URL - use demo or live environment
  const baseUrl = isDemo ? 'https://demo.trading212.com/api/v0' : 'https://live.trading212.com/api/v0';

  // Fetch account cash info
  const cashResponse = await fetch(`${baseUrl}/equity/account/cash`, {
    headers: {
      'Authorization': cleanKey,
    },
  });

  if (!cashResponse.ok) {
    throw new Error(`Trading 212 API error: ${cashResponse.status}`);
  }

  const cashData: Trading212CashResponse = await cashResponse.json();

  // Normalize to array format (T212 has single portfolio)
  // This structure allows future expansion for multi-account brokers
  return [{
    id: 'default',
    name: 'Trading 212 Portfolio',
    balance: cashData.total || cashData.free || 0,
    currency: cashData.currency || 'EUR',
    type: 'portfolio',
  }];
}

/**
 * Validates a Trading 212 API key
 * @param apiKey - The Trading 212 API key
 * @param isDemo - If true, use demo environment; otherwise use live environment
 */
export async function validateTrading212Key(apiKey: string, isDemo?: boolean): Promise<boolean> {
  try {
    await fetchTrading212Accounts(apiKey, isDemo);
    return true;
  } catch {
    return false;
  }
}

/**
 * Fetches current portfolio value for sync
 * @param apiKey - The Trading 212 API key
 * @param isDemo - If true, use demo environment; otherwise use live environment
 */
export async function fetchTrading212Balance(apiKey: string, isDemo?: boolean): Promise<{ balance: number; currency: string }> {
  const accounts = await fetchTrading212Accounts(apiKey, isDemo);
  const main = accounts[0];
  return { balance: main.balance, currency: main.currency };
}

export interface Trading212Data {
  total: number;
  free: number;
  invested: number;
  currency: string;
}

/**
 * Fetches cash account data from Trading 212 API
 * Returns normalized data with total, free, invested, and currency
 * @param apiKey - The Trading 212 API key
 * @param isDemo - If true, use demo environment; otherwise use live environment
 */
export async function fetchTrading212Data(apiKey: string, isDemo?: boolean): Promise<Trading212Data> {
  // Sanitize API key by trimming whitespace
  const cleanKey = apiKey.trim();

  // T212 API base URL - use demo or live environment
  const baseUrl = isDemo ? 'https://demo.trading212.com/api/v0' : 'https://live.trading212.com/api/v0';

  const response = await fetch(`${baseUrl}/equity/account/cash`, {
    headers: {
      'Authorization': cleanKey,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Invalid API Key');
    }
    throw new Error(`Trading 212 API error: ${response.status} ${response.statusText}`);
  }

  const data: Trading212CashResponse = await response.json();

  return {
    total: data.total,
    free: data.free,
    invested: data.invested,
    currency: data.currency,
  };
}
