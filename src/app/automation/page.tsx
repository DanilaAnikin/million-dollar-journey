'use client';

import { useState } from 'react';
import { Upload, Settings, CheckCircle2, Circle, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  LogoTrading212,
  LogoXTB,
  LogoGoCardless,
  LogoEtoro,
  LogoDegiro,
  LogoIBKR,
} from '@/components/ui/BrandLogos';
import { IntegrationModal, IntegrationType } from '@/components/automation';

interface IntegrationService {
  id: string;
  name: string;
  description: string;
  logo?: React.ComponentType<{ className?: string; size?: number }>;
  type: 'api' | 'manual';
  connected?: boolean;
  badge?: 'official' | 'community';
}

const API_INTEGRATIONS: IntegrationService[] = [
  {
    id: 'gocardless',
    name: 'GoCardless',
    description: 'Connect your bank accounts for automatic transaction sync',
    logo: LogoGoCardless,
    type: 'api',
    connected: false,
    badge: 'official',
  },
  {
    id: 'trading212',
    name: 'Trading 212',
    description: 'Sync your investment portfolio and trading history',
    logo: LogoTrading212,
    type: 'api',
    connected: false,
    badge: 'official',
  },
  {
    id: 'xtb',
    name: 'XTB',
    description: 'Connect your XTB trading account for portfolio tracking',
    logo: LogoXTB,
    type: 'api',
    connected: false,
    badge: 'community',
  },
];

const MANUAL_INTEGRATIONS: IntegrationService[] = [
  {
    id: 'etoro',
    name: 'eToro',
    description: 'No free API available. Upload your statement manually.',
    logo: LogoEtoro,
    type: 'manual',
    badge: 'community',
  },
  {
    id: 'degiro',
    name: 'Degiro',
    description: 'No free API available. Upload your statement manually.',
    logo: LogoDegiro,
    type: 'manual',
    badge: 'community',
  },
  {
    id: 'interactive-brokers',
    name: 'Interactive Brokers',
    description: 'No free API available. Upload your statement manually.',
    logo: LogoIBKR,
    type: 'manual',
    badge: 'community',
  },
];

export default function AutomationPage() {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<IntegrationType | null>(null);

  const handleConnect = (serviceId: string) => {
    // Only open modal for supported integrations
    if (serviceId === 'trading212' || serviceId === 'xtb' || serviceId === 'gocardless') {
      setSelectedIntegration(serviceId as IntegrationType);
      setModalOpen(true);
    }
  };

  const handleModalClose = (open: boolean) => {
    setModalOpen(open);
    if (!open) {
      setSelectedIntegration(null);
    }
  };

  const handleUpload = () => {
    router.push('/import');
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Automation Center</h1>
        <p className="text-muted-foreground mt-1">
          Connect your accounts for automatic syncing or upload statements manually
        </p>
      </div>

      {/* Security Banner */}
      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4">
        <div className="flex items-start gap-3">
          <div className="icon-container-sm bg-emerald-500/10 mt-0.5">
            <ShieldCheck className="h-5 w-5 text-emerald-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
              End-to-End Encryption: Your credentials are encrypted using AES-256 and never shared with third parties.
            </p>
          </div>
        </div>
      </div>

      {/* API-Based Integrations Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="icon-container-sm bg-primary/10">
            <Settings className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-lg font-semibold">Auto-Sync Integrations</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Connect these services once and keep your data synchronized automatically
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {API_INTEGRATIONS.map((service) => {
            const Logo = service.logo;
            const isConnected = service.connected;

            return (
              <Card key={service.id} className="rounded-2xl">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center">
                        {Logo && <Logo size={40} className="rounded-lg" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <CardTitle className="text-base">{service.name}</CardTitle>
                          {service.badge === 'official' && (
                            <span className="text-xs bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded-full">
                              Official Partner
                            </span>
                          )}
                          {service.badge === 'community' && (
                            <span className="text-xs bg-purple-500/10 text-purple-500 px-2 py-0.5 rounded-full">
                              Community
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {isConnected ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <Circle className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span
                        className={`text-xs font-medium ${
                          isConnected ? 'text-emerald-500' : 'text-muted-foreground'
                        }`}
                      >
                        {isConnected ? 'Connected' : 'Not Connected'}
                      </span>
                    </div>
                  </div>
                  <CardDescription className="text-sm mt-2">
                    {service.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <Button
                    onClick={() => handleConnect(service.id)}
                    variant={isConnected ? 'outline' : 'default'}
                    className="w-full rounded-2xl h-11"
                  >
                    {isConnected ? (
                      <>
                        <Settings className="h-4 w-4 mr-2" />
                        Configure
                      </>
                    ) : (
                      'Connect'
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Manual Import Section */}
      <div className="space-y-4 pt-6">
        <div className="flex items-center gap-2">
          <div className="icon-container-sm bg-blue-500/10">
            <Upload className="h-5 w-5 text-blue-500" />
          </div>
          <h2 className="text-lg font-semibold">Manual Import</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          These services don&apos;t offer free API access. Upload your statements manually.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {MANUAL_INTEGRATIONS.map((service) => {
            const Logo = service.logo;

            return (
              <Card key={service.id} className="rounded-2xl bg-muted/30">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center">
                      {Logo && <Logo size={40} className="rounded-lg" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-base">{service.name}</CardTitle>
                        {service.badge === 'community' && (
                          <span className="text-xs bg-purple-500/10 text-purple-500 px-2 py-0.5 rounded-full">
                            Community
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <CardDescription className="text-sm mt-2">
                    {service.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <Button
                    onClick={handleUpload}
                    variant="outline"
                    className="w-full rounded-2xl h-11"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload CSV
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Info Card */}
      <Card className="rounded-2xl bg-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="icon-container-sm bg-primary/10 mt-0.5">
              <Settings className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">Coming Soon</p>
              <p className="text-sm text-muted-foreground mt-1">
                API integrations are currently under development. Manual import is available now.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Integration Modal */}
      <IntegrationModal
        open={modalOpen}
        onOpenChange={handleModalClose}
        integrationType={selectedIntegration}
      />
    </div>
  );
}
