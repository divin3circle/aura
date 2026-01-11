import { useStoreData } from "@/hooks/useStoreData";
import { useStoreOrders } from "@/hooks/useStoreOrders";

export default function StoreHealthCard({ storeId, getToken, ordersPerPage }) {
  const { store } = useStoreData(storeId, getToken);
  const { orders } = useStoreOrders(storeId, getToken, ordersPerPage);

  const paidOrders = orders.filter((o) => o.isPaid).length;

  return (
    <div className="bg-white border border-slate-300 rounded-3xl p-6">
      <h2 className="text-lg text-slate-800 font-medium">Store Health</h2>
      <div className="mt-3 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-400">Created:</span>
          <span className="text-slate-800">
            {store?.createdAt
              ? new Date(store.createdAt).toLocaleDateString()
              : "—"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Last Order:</span>
          <span className="text-slate-800">
            {orders[0]?.createdAt
              ? new Date(orders[0].createdAt).toLocaleDateString()
              : "No orders"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Payment Rate:</span>
          <span className="text-slate-800">
            {orders.length > 0
              ? `${((paidOrders / orders.length) * 100).toFixed(0)}%`
              : "—"}
          </span>
        </div>
      </div>
    </div>
  );
}
