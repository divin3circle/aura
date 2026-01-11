"use client";
import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import StoreHeader from "@/components/admin/StoreHeader";
import StoreOverviewCard from "@/components/admin/StoreOverviewCard";
import RevenueCard from "@/components/admin/RevenueCard";
import PlatformEarningsCard from "@/components/admin/PlatformEarningsCard";
import PerformanceCard from "@/components/admin/PerformanceCard";
import OrderStatusCard from "@/components/admin/OrderStatusCard";
import StoreHealthCard from "@/components/admin/StoreHealthCard";
import CustomerInsightsCard from "@/components/admin/CustomerInsightsCard";
import ActionsSection from "@/components/admin/ActionsSection";
import RecentOrdersTable from "@/components/admin/RecentOrdersTable";
import { useStoreData } from "@/hooks/useStoreData";
import { useStoreOrders } from "@/hooks/useStoreOrders";
import { useStoreRevenue } from "@/hooks/useStoreRevenue";
import { useStoreMetrics } from "@/hooks/useStoreMetrics";
import Loading from "@/components/Loading";

export default function AdminStoreDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { getToken } = useAuth();

  const storeId = useMemo(() => params?.storeId, [params]);
  const ordersPerPage = 20;

  const { store, metrics, loading } = useStoreData(storeId, getToken);
  const { orders } = useStoreOrders(storeId, getToken, ordersPerPage);
  const { revenueDetails } = useStoreRevenue(storeId, getToken);

  const {
    revenue,
    platformCommission,
    storeNetRevenue,
    avgOrderValue,
    paidOrders,
    uniqueCustomers,
  } = useStoreMetrics(metrics, orders);

  if (loading) {
    return <Loading />;
  }

  if (!store) {
    return (
      <div className="text-slate-500 mb-28">
        <p className="mb-4">Store not found.</p>
        <button
          className="text-slate-600 underline"
          onClick={() => router.push("/admin/stores")}
        >
          Back to Stores
        </button>
      </div>
    );
  }

  return (
    <div className="text-slate-500 mb-28">
      <StoreHeader onBack={() => router.push("/admin/stores")} />

      <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <StoreOverviewCard storeId={storeId} getToken={getToken} />
        <RevenueCard
          revenue={revenue}
          metrics={metrics}
          revenueDetails={revenueDetails}
          storeNetRevenue={storeNetRevenue}
        />
        <PlatformEarningsCard
          platformCommission={platformCommission}
          paidOrders={paidOrders}
        />
        <PerformanceCard
          avgOrderValue={avgOrderValue}
          metrics={metrics}
          uniqueCustomers={uniqueCustomers}
        />
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-3">
        <OrderStatusCard storeId={storeId} getToken={getToken} />
        <StoreHealthCard
          storeId={storeId}
          getToken={getToken}
          ordersPerPage={ordersPerPage}
        />
        <CustomerInsightsCard
          storeId={storeId}
          getToken={getToken}
          ordersPerPage={ordersPerPage}
        />
      </div>

      <div className="mt-6">
        <ActionsSection storeFrontUrl={`/shop/${store?.username}`} />
      </div>

      <RecentOrdersTable
        storeId={storeId}
        getToken={getToken}
        ordersPerPage={ordersPerPage}
      />
    </div>
  );
}
