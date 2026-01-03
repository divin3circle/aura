"use client";
import { storesDummyData } from "@/assets/assets";
import StoreInfo from "@/components/admin/StoreInfo";
import Loading from "@/components/Loading";
import { useAuth, useUser } from "@clerk/nextjs";
import axios from "axios";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

export default function AdminApprove() {
  const { user } = useUser();
  const { getToken } = useAuth();

  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchStores = async () => {
    try {
      const token = await getToken();
      const { data } = await axios.get("/api/admin/approve-store", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      console.log("Stores data:", data);
      setStores(data);
    } catch (error) {
      toast.error(`Failed to fetch stores. ${error.message}`);
      console.error("Error fetching stores:", error);
    }
    setLoading(false);
  };

  const handleApprove = async ({ storeId, status }) => {
    try {
      const token = await getToken();
      const { data } = await axios.post(
        "/api/admin/approve-store",
        {
          storeId,
          status,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      toast.success(data.message);
      await fetchStores();
    } catch (error) {
      console.error("Error approving/rejecting store:", error);
      toast.error(`Failed to ${status} store. ${error.message}`);
    }
  };

  useEffect(() => {
    if (user) {
      fetchStores();
    }
  }, [user]);

  return !loading ? (
    <div className="text-slate-500 mb-28">
      <h1 className="text-2xl">
        Approve <span className="text-slate-800 font-medium">Stores</span>
      </h1>

      {stores.length >= 1 ? (
        <div className="flex flex-col gap-4 mt-4">
          {stores.map((store) => (
            <div
              key={store.id}
              className="bg-white border rounded-2xl shadow-xs p-6 flex max-md:flex-col gap-4 md:items-end max-w-4xl"
            >
              {/* Store Info */}
              <StoreInfo store={store} />

              {/* Actions */}
              <div className="flex gap-3 pt-2 flex-wrap">
                <button
                  onClick={() =>
                    toast.promise(
                      handleApprove({ storeId: store.id, status: "approved" }),
                      { loading: "approving" }
                    )
                  }
                  className="px-4 py-2 bg-green-600 text-white rounded-2xl hover:bg-green-700 text-sm"
                >
                  Approve
                </button>
                <button
                  onClick={() =>
                    toast.promise(
                      handleApprove({ storeId: store.id, status: "rejected" }),
                      { loading: "rejecting" }
                    )
                  }
                  className="px-4 py-2 bg-slate-500 text-white rounded-2xl hover:bg-slate-600 text-sm"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center h-80">
          <h1 className="text-base text-slate-400 font-medium">
            No Application Pending
          </h1>
        </div>
      )}
    </div>
  ) : (
    <Loading />
  );
}
