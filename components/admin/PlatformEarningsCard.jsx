export default function PlatformEarningsCard({
  platformCommission,
  paidOrders,
}) {
  return (
    <div className="bg-white border border-slate-300 rounded-3xl p-6">
      <h2 className="text-lg text-slate-800 font-medium">Platform Earnings</h2>
      <div className="mt-3">
        <p className="text-3xl text-green-600">
          €{platformCommission.toFixed(2)}
        </p>
        <p className="text-slate-400 text-sm">17% commission</p>
        <div className="mt-4 space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-400">From paid orders:</span>
            <span className="text-slate-800">{paidOrders}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
