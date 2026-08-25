import { TradingScreenLoader } from '@/components/ui/trading-loader'

export default function Loading() {
  return (
    <TradingScreenLoader
      label="Initializing Trading System"
      subtitle="Loading market liquidity pools, accounts, and risk telemetry..."
    />
  )
}
