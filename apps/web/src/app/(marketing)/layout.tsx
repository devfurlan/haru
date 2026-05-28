import { MarketingFooter } from '@/components/marketing-footer';

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex flex-1 flex-col">{children}</div>
      <MarketingFooter />
    </div>
  );
}
