import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useStoreOrders } from "@/hooks/useStoreOrders";

export default function RecentOrdersTable({
  storeId,
  getToken,
  ordersPerPage = 20,
}) {
  const { orders, pagination, currentPage, setCurrentPage } = useStoreOrders(
    storeId,
    getToken,
    ordersPerPage
  );

  return (
    <div className="mt-8 bg-white border border-slate-300 rounded-3xl p-6">
      <h2 className="text-lg text-slate-800 font-medium mb-4">Recent Orders</h2>
      {orders.length ? (
        <Table>
          <TableCaption>Recent orders for this store.</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="w-40">Order ID</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((o) => (
              <TableRow key={o.id}>
                <TableCell className="text-slate-800">
                  #{o.id.substring(0, 8)}...
                </TableCell>
                <TableCell className="text-slate-600">
                  {o?.user?.name || "—"}
                </TableCell>
                <TableCell>
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      o.status === "DELIVERED"
                        ? "bg-green-100 text-green-800"
                        : o.status === "SHIPPED"
                        ? "bg-purple-100 text-purple-800"
                        : o.status === "PROCESSING"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {o.status.replace("_", " ")}
                  </span>
                </TableCell>
                <TableCell>
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      o.isPaid
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {o.isPaid ? "Paid" : "Unpaid"}
                  </span>
                </TableCell>
                <TableCell className="text-slate-600">
                  {new Date(o.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-slate-800 text-right font-medium">
                  €{Number(o.total || 0).toFixed(2)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <p className="mt-3 text-slate-400 text-sm">No orders yet.</p>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-4">
          <div className="text-sm text-slate-600">
            Showing {(currentPage - 1) * ordersPerPage + 1} to{" "}
            {Math.min(currentPage * ordersPerPage, pagination.totalOrders)} of{" "}
            {pagination.totalOrders} orders
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              Previous
            </button>
            <div className="flex items-center gap-2 px-3">
              <span className="text-sm text-slate-600">
                Page {currentPage} of {pagination.totalPages}
              </span>
            </div>
            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={!pagination.hasMore}
              className="px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
