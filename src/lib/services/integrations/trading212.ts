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
 */
export async function fetchTrading212Accounts(apiKey: string): Promise<Trading212Account[]> {
  // T212 API base URL
  const baseUrl = 'https://live.trading212.com/api/v0';

  // Fetch account cash info
  const cashResponse = await fetch(`${baseUrl}/equity/account/cash`, {
    headers: {
      'Authorization': apiKey,
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
 */
export async function validateTrading212Key(apiKey: string): Promise<boolean> {
  try {
    await fetchTrading212Accounts(apiKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Fetches current portfolio value for sync
 */
export async function fetchTrading212Balance(apiKey: string): Promise<{ balance: number; currency: string }> {
  const accounts = await fetchTrading212Accounts(apiKey);
  const main = accounts[0];
  return { balance: main.balance, currency: main.currency };
}
