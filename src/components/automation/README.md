# Integration Components

Reusable components for connecting external integrations (Trading 212, XTB, GoCardless).

## Components

### IntegrationModal

A modal dialog for connecting integrations. Supports both API key-based integrations and OAuth flows.

**Features:**
- API key input with show/hide toggle
- Optional display name field
- Coming soon placeholder for OAuth integrations
- Error handling
- Loading states
- Secure storage indication

**Props:**
```typescript
interface IntegrationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  integrationType: 'trading212' | 'xtb' | 'gocardless' | null;
  onSubmit: (data: IntegrationFormData) => Promise<void>;
}
```

**Usage Example:**
```tsx
import { IntegrationModal, IntegrationType } from '@/components/automation';

function MyPage() {
  const [open, setOpen] = useState(false);
  const [integrationType, setIntegrationType] = useState<IntegrationType | null>(null);

  const handleSubmit = async (data: IntegrationFormData) => {
    // Save integration to database
    await saveIntegration(data);
  };

  return (
    <>
      <button onClick={() => {
        setIntegrationType('trading212');
        setOpen(true);
      }}>
        Connect Trading 212
      </button>

      <IntegrationModal
        open={open}
        onOpenChange={setOpen}
        integrationType={integrationType}
        onSubmit={handleSubmit}
      />
    </>
  );
}
```

### IntegrationCard

A card component for displaying integration options with connection status.

**Features:**
- Icon display with status-based styling
- Connection status indicator (green dot for connected, gray for not)
- Conditional button rendering (Connect vs Disconnect/Reconfigure)
- Coming soon badge support
- Disabled state support

**Props:**
```typescript
interface IntegrationCardProps {
  name: string;
  icon: LucideIcon;
  description: string;
  status: 'connected' | 'disconnected';
  onConnect: () => void;
  onDisconnect?: () => void;
  disabled?: boolean;
  comingSoon?: boolean;
}
```

**Usage Example:**
```tsx
import { IntegrationCard } from '@/components/automation';
import { Building, TrendingUp, Wallet } from 'lucide-react';

function IntegrationsPage() {
  const [integrations, setIntegrations] = useState([]);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <IntegrationCard
        name="Trading 212"
        icon={TrendingUp}
        description="Sync your investment portfolio automatically"
        status="disconnected"
        onConnect={() => handleConnect('trading212')}
      />

      <IntegrationCard
        name="XTB"
        icon={Building}
        description="Connect your XTB trading account"
        status="disconnected"
        onConnect={() => handleConnect('xtb')}
      />

      <IntegrationCard
        name="GoCardless"
        icon={Wallet}
        description="Automatic bank transaction sync"
        status="disconnected"
        onConnect={() => handleConnect('gocardless')}
        comingSoon
      />
    </div>
  );
}
```

## Integration Types

The components support the following integration types:

- **trading212**: Trading 212 API integration (API key)
- **xtb**: XTB trading platform (API key)
- **gocardless**: Bank connection via GoCardless (OAuth - Coming Soon)

## Database Schema

The integrations table structure (already exists in `src/types/database.ts`):

```typescript
interface Integration {
  id: string;
  user_id: string;
  provider: 'trading212' | 'xtb' | 'gocardless';
  name: string;
  api_key: string;
  status: 'active' | 'error' | 'expired';
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}
```

## Security Notes

- API keys are displayed as password fields with toggle visibility
- The UI indicates that API keys are stored securely and encrypted
- Consider implementing actual encryption at the database level
- OAuth flows (GoCardless) require additional backend setup
