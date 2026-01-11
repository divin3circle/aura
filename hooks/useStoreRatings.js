import { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";

/**
 * Custom hook to fetch store ratings data
 * @param {string} storeId - The store ID to fetch ratings for
 * @param {function} getToken - Function to get auth token from Clerk
 * @returns {Object} { ratings }
 */
export function useStoreRatings(storeId, getToken) {
  const [ratings, setRatings] = useState(null);

  useEffect(() => {
    const fetchRatings = async () => {
      try {
        const token = await getToken();
        const ratingsRes = await axios.get(
          `/api/admin/store/${storeId}/ratings`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setRatings(ratingsRes.data || null);
      } catch (err) {
        console.error("Failed to load ratings:", err);
        toast.error("Failed to load ratings");
      }
    };

    if (storeId) fetchRatings();
  }, [storeId, getToken]);

  return { ratings };
}
