import BusinessIntelligenceDashboard from '@/components/intelligence/BusinessIntelligenceDashboard';
import AlertCenter from '@/components/intelligence/AlertCenter';

export default function IntelligencePage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <BusinessIntelligenceDashboard />
      <AlertCenter />
    </div>
  );
}