import BusinessIntelligenceDashboard from '@/components/intelligence/BusinessIntelligenceDashboard';
import AlertCenter from '@/components/intelligence/AlertCenter';

export default function IntelligencePage() {
  return (
    <main className="min-h-screen bg-slate-50/50 pb-20 md:pb-0">
      <BusinessIntelligenceDashboard />
      <AlertCenter />
    </main>
  );
}