export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Just pass through - AppShell handles hiding the navigation
  return <>{children}</>;
}
