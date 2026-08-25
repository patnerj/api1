import { TradingScreenLoader } from '@/components/ui/trading-loader'

export default function DashboardLoading() {
  return (
    <TradingScreenLoader
      fullscreen={false}
      label="Loading Trading Terminal"
      subtitle="Fetching live account metrics, drawdown limiters, and positions..."
    />
  )
}
