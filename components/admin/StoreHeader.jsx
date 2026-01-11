export default function StoreHeader({ store, onBack }) {
  return (
    <div className="flex items-center justify-between">
      <h1 className="text-2xl">
        Store <span className="text-slate-800 font-medium">Details</span>
      </h1>
      <button className="text-slate-600 underline" onClick={onBack}>
        Back to Stores
      </button>
    </div>
  );
}
