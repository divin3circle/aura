import { useMemo } from "react";

/**
 * Custom hook to calculate all derived store metrics
 * @param {Object} metrics - Store metrics from API (contains revenue, orders, products)
 * @param {Array} orders - Array of orders for the store
 * @returns {Object} Calculated metrics: { revenue, platformCommission, storeNetRevenue, avgOrderValue, paidOrders, uniqueCustomers }
 */
export function useStoreMetrics(metrics, orders) {
  const revenue = useMemo(() => Number(metrics?.revenue || 0), [metrics]);

  const platformCommission = useMemo(() => revenue * 0.17, [revenue]);

  const storeNetRevenue = useMemo(() => revenue * 0.83, [revenue]);

  const avgOrderValue = useMemo(
    () => (orders.length > 0 ? revenue / orders.length : 0),
    [revenue, orders]
  );

  const paidOrders = useMemo(
    () => orders.filter((o) => o.isPaid).length,
    [orders]
  );

  const uniqueCustomers = useMemo(() => {
    const customerIds = new Set(orders.map((o) => o.userId));
    return customerIds.size;
  }, [orders]);

  return {
    revenue,
    platformCommission,
    storeNetRevenue,
    avgOrderValue,
    paidOrders,
    uniqueCustomers,
  };
}
