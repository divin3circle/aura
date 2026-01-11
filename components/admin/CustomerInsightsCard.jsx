import { useStoreOrders } from "@/hooks/useStoreOrders";
import { useStoreRatings } from "@/hooks/useStoreRatings";

export default function CustomerInsightsCard({
  storeId,
  getToken,
  ordersPerPage,
}) {
  const { orders } = useStoreOrders(storeId, getToken, ordersPerPage);
  const { ratings } = useStoreRatings(storeId, getToken);

  const uniqueCustomers = (() => {
    const customerIds = new Set(orders.map((o) => o.userId));
    return customerIds.size;
  })();

  const repeatCustomerRate = (() => {
    if (uniqueCustomers === 0) return 0;
    const customerOrderCounts = {};
    orders.forEach((o) => {
      customerOrderCounts[o.userId] = (customerOrderCounts[o.userId] || 0) + 1;
    });
    const repeatCustomers = Object.values(customerOrderCounts).filter(
      (count) => count > 1
    ).length;
    return ((repeatCustomers / uniqueCustomers) * 100).toFixed(0);
  })();

  return (
    <div className="bg-white border border-slate-300 rounded-3xl p-6">
      <h2 className="text-lg text-slate-800 font-medium">Customer Insights</h2>
      <div className="mt-3 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-400">Total Customers:</span>
          <span className="text-slate-800">{uniqueCustomers}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Avg Rating:</span>
          <span className="text-slate-800">
            {ratings?.avgRating ? `${ratings.avgRating} ⭐` : "—"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Repeat Rate:</span>
          <span className="text-slate-800">{repeatCustomerRate}%</span>
        </div>
      </div>
    </div>
  );
}
