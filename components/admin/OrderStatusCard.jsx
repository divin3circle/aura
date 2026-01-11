import { useStoreData } from "@/hooks/useStoreData";

export default function OrderStatusCard({ storeId, getToken }) {
  const { metrics } = useStoreData(storeId, getToken);

  return (
    <div className="bg-white border border-slate-300 rounded-3xl p-6">
      <h2 className="text-lg text-slate-800 font-medium">Order Status</h2>
      <div className="mt-3 space-y-2 text-sm">
        <div className="flex justify-between items-center">
          <span className="text-slate-400">Order Placed:</span>
          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
            {metrics?.orders?.byStatus?.ORDER_PLACED || 0}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-400">Processing:</span>
          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">
            {metrics?.orders?.byStatus?.PROCESSING || 0}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-400">Shipped:</span>
          <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">
            {metrics?.orders?.byStatus?.SHIPPED || 0}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-400">Delivered:</span>
          <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
            {metrics?.orders?.byStatus?.DELIVERED || 0}
          </span>
        </div>
      </div>
    </div>
  );
}
