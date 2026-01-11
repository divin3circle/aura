export default function RevenueCard({
  revenue,
  metrics,
  revenueDetails,
  storeNetRevenue,
}) {
  return (
    <div className="bg-white border border-slate-300 rounded-3xl p-6">
      <h2 className="text-lg text-slate-800 font-medium">Revenue</h2>
      <div className="mt-3">
        <p className="text-3xl text-slate-800">€{revenue.toFixed(2)}</p>
        <p className="text-slate-400 text-sm">
          From {metrics?.orders?.total || 0} orders
        </p>
        {revenueDetails && (
          <div className="mt-4 space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Net Revenue:</span>
              <span className="text-slate-800">
                €{storeNetRevenue.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Pending Revenue:</span>
              <span className="text-slate-800">
                €{revenueDetails.pendingRevenue.toFixed(2)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
