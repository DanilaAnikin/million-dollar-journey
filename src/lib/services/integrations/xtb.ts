// XTB WebSocket API Integration Service

import WebSocket from 'ws';

// XTB API Response Types
export interface XTBLoginResponse {
  status: boolean;
  streamSessionId?: string;
  errorCode?: string;
  errorDescr?: string;
}

export interface XTBMarginLevelData {
  balance: number;
  credit: number;
  currency: string;
  equity: number;
  margin: number;
  margin_free: number;
  margin_level: number;
}

export interface XTBMarginLevelResponse {
  status: boolean;
  returnData?: XTBMarginLevelData;
  errorCode?: string;
  errorDescr?: string;
}

export interface XTBData {
  equity: number;
  currency: string;
}

/**
 * Fetches account data from XTB via WebSocket API
 * Returns equity (Total Net Worth) and currency
 * @param userId - The XTB user ID
 * @param password - The XTB password
 * @param isDemo - If true, use demo environment; otherwise use live environment
 */
export async function fetchXTBData(userId: string, password: string, isDemo?: boolean): Promise<XTBData> {
  const wsUrl = isDemo ? 'wss://ws.xtb.com/demo' : 'wss://ws.xtb.com/real';
  const TIMEOUT_MS = 10000;

  return new Promise((resolve, reject) => {
    let ws: WebSocket | null = null;
    let timeoutId: NodeJS.Timeout | null = null;
    let isResolved = false;

    const cleanup = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      if (ws) {
        try {
          ws.close();
        } catch {
          // Ignore close errors
        }
        ws = null;
      }
    };

    const handleError = (error: Error) => {
      if (!isResolved) {
        isResolved = true;
        cleanup();
        reject(error);
      }
    };

    const handleSuccess = (data: XTBData) => {
      if (!isResolved) {
        isResolved = true;
        cleanup();
        resolve(data);
      }
    };

    // Set timeout to avoid hanging
    timeoutId = setTimeout(() => {
      handleError(new Error('XTB connection timeout'));
    }, TIMEOUT_MS);

    try {
      ws = new WebSocket(wsUrl);

      ws.on('error', (error) => {
        handleError(new Error(`XTB WebSocket error: ${error.message}`));
      });

      ws.on('close', () => {
        if (!isResolved) {
          handleError(new Error('XTB WebSocket closed unexpectedly'));
        }
      });

      let step: 'login' | 'getMarginLevel' | 'logout' = 'login';

      ws.on('open', () => {
        // Step 1: Send login command
        const loginCommand = {
          command: 'login',
          arguments: {
            userId: parseInt(userId, 10),
            password: password,
          },
        };
        ws!.send(JSON.stringify(loginCommand));
      });

      ws.on('message', (data) => {
        try {
          const response = JSON.parse(data.toString());

          if (step === 'login') {
            // Step 2: Handle login response
            const loginResponse = response as XTBLoginResponse;

            if (!loginResponse.status) {
              const errorMsg = loginResponse.errorDescr || loginResponse.errorCode || 'Login failed';
              handleError(new Error(`XTB authentication failed: ${errorMsg}`));
              return;
            }

            // Step 3: Send getMarginLevel command
            step = 'getMarginLevel';
            const marginCommand = {
              command: 'getMarginLevel',
              arguments: {},
            };
            ws!.send(JSON.stringify(marginCommand));

          } else if (step === 'getMarginLevel') {
            // Step 4: Handle margin level response
            const marginResponse = response as XTBMarginLevelResponse;

            if (!marginResponse.status || !marginResponse.returnData) {
              const errorMsg = marginResponse.errorDescr || marginResponse.errorCode || 'Failed to get margin level';
              handleError(new Error(`XTB API error: ${errorMsg}`));
              return;
            }

            const { equity, currency } = marginResponse.returnData;

            // Step 5: Send logout and close
            step = 'logout';
            const logoutCommand = {
              command: 'logout',
            };
            ws!.send(JSON.stringify(logoutCommand));

            // Return the data
            handleSuccess({ equity, currency });
          }
        } catch (parseError) {
          handleError(new Error('XTB API response parse error'));
        }
      });

    } catch (error) {
      handleError(error instanceof Error ? error : new Error('XTB connection failed'));
    }
  });
}

/**
 * Validates XTB credentials by attempting to login
 * @param userId - The XTB user ID
 * @param password - The XTB password
 * @param isDemo - If true, use demo environment; otherwise use live environment
 */
export async function validateXTBCredentials(userId: string, password: string, isDemo?: boolean): Promise<boolean> {
  try {
    await fetchXTBData(userId, password, isDemo);
    return true;
  } catch {
    return false;
  }
}
