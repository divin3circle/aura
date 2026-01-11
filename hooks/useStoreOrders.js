import { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";

/**
 * Custom hook to manage store orders with pagination
 * @param {string} storeId - The store ID to fetch orders for
 * @param {function} getToken - Function to get auth token from Clerk
 * @param {number} ordersPerPage - Number of orders per page (default: 20)
 * @returns {Object} { orders, pagination, currentPage, setCurrentPage }
 */
export function useStoreOrders(storeId, getToken, ordersPerPage = 20) {
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const token = await getToken();
        const ordersRes = await axios.get(
          `/api/admin/store/${storeId}/orders?page=${currentPage}&limit=${ordersPerPage}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setOrders(ordersRes.data?.orders || []);
        setPagination(ordersRes.data?.pagination || null);
      } catch (err) {
        console.error("Failed to load orders:", err);
        toast.error("Failed to load orders");
      }
    };

    if (storeId) fetchOrders();
  }, [storeId, getToken, currentPage, ordersPerPage]);

  return { orders, pagination, currentPage, setCurrentPage };
}
