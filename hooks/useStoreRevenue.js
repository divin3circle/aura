import { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";

/**
 * Custom hook to fetch detailed revenue data for a store
 * @param {string} storeId - The store ID to fetch revenue for
 * @param {function} getToken - Function to get auth token from Clerk
 * @returns {Object} { revenueDetails }
 */
export function useStoreRevenue(storeId, getToken) {
  const [revenueDetails, setRevenueDetails] = useState(null);

  useEffect(() => {
    const fetchRevenue = async () => {
      try {
        const token = await getToken();
        const revenueRes = await axios.get(
          `/api/admin/store/${storeId}/revenue`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setRevenueDetails(revenueRes.data || null);
      } catch (err) {
        console.error("Failed to load revenue details:", err);
        toast.error("Failed to load revenue details");
      }
    };

    if (storeId) fetchRevenue();
  }, [storeId, getToken]);

  return { revenueDetails };
}
