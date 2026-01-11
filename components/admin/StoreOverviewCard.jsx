import { useStoreData } from "@/hooks/useStoreData";

export default function StoreOverviewCard({ storeId, getToken }) {
  const { store } = useStoreData(storeId, getToken);

  return (
    <div className="bg-white border border-slate-300 rounded-3xl p-6">
      <h2 className="text-lg text-slate-800 font-medium">Overview</h2>
      <div className="mt-3 text-sm flex flex-col gap-2">
        <p>
          <span className="text-slate-400">Name:</span> {store?.name}
        </p>
        <p>
          <span className="text-slate-400">Owner:</span>{" "}
          {store?.user?.name || "—"}
        </p>
        <p>
          <span className="text-slate-400">Email:</span>{" "}
          {store?.email || store?.user?.email || "—"}
        </p>
        <p>
          <span className="text-slate-400">Status:</span>{" "}
          {store?.isActive ? "Active" : "Inactive"}
        </p>
      </div>
    </div>
  );
}
