import { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";

/**
 * Custom hook to fetch store details and metrics
 * @param {string} storeId - The store ID to fetch details for
 * @param {function} getToken - Function to get auth token from Clerk
 * @returns {Object} { store, metrics, loading }
 */
export function useStoreData(storeId, getToken) {
  const [store, setStore] = useState(null);
  const [metrics, setMetrics] = useState({ revenue: 0, orders: { total: 0 } });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStoreData = async () => {
      try {
        const token = await getToken();
        const storeRes = await axios.get(`/api/admin/store/${storeId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setStore(storeRes.data?.store || null);
        setMetrics(
          storeRes.data?.metrics || { revenue: 0, orders: { total: 0 } }
        );
      } catch (err) {
        console.error("Failed to load store details:", err);
        toast.error("Failed to load store details");
      } finally {
        setLoading(false);
      }
    };

    if (storeId) fetchStoreData();
  }, [storeId, getToken]);

  return { store, metrics, loading };
}
