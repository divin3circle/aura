export default function PerformanceCard({
  avgOrderValue,
  metrics,
  uniqueCustomers,
}) {
  return (
    <div className="bg-white border border-slate-300 rounded-3xl p-6">
      <h2 className="text-lg text-slate-800 font-medium">Performance</h2>
      <div className="mt-3 space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-400">Avg Order Value:</span>
          <span className="text-slate-800">€{avgOrderValue.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Total Products:</span>
          <span className="text-slate-800">
            {metrics?.products?.total || 0}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Unique Customers:</span>
          <span className="text-slate-800">{uniqueCustomers}</span>
        </div>
      </div>
    </div>
  );
}
