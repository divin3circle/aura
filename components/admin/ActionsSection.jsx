import toast from "react-hot-toast";

export default function ActionsSection({ storeFrontUrl }) {
  const handleRequestPayoutDetails = async () => {
    toast.success("Requested payout details (stub)");
    // TODO: Implement email or notification to store owner
  };

  const handleMessageOwner = () => {
    toast("Opening chat (stub)");
    // TODO: Navigate to admin-store chat page when available
  };

  const handleStripePayout = async () => {
    toast("Stripe payout not set up yet");
    // TODO: Integrate Stripe Connect payouts to store's account
  };

  return (
    <div className="bg-white border border-slate-300 rounded-3xl p-6">
      <h2 className="text-lg text-slate-800 font-medium">Actions</h2>
      <div className="mt-3 flex gap-3 flex-wrap">
        <button
          onClick={handleRequestPayoutDetails}
          className="px-4 py-2 bg-slate-800 text-white rounded-2xl hover:bg-slate-900 text-sm"
        >
          Request payout details
        </button>
        <button
          onClick={handleMessageOwner}
          className="px-4 py-2 bg-white border border-slate-400 rounded-2xl hover:bg-slate-50 text-sm"
        >
          Message owner
        </button>
        <button
          onClick={handleStripePayout}
          className="px-4 py-2 bg-pink-400 text-white rounded-2xl hover:bg-pink-700 disabled:opacity-50 text-sm"
          title="Connect payouts to enable"
        >
          Pay store (Stripe)
        </button>
        <a
          href={storeFrontUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 text-sm"
        >
          View Store Front
        </a>
      </div>
    </div>
  );
}
