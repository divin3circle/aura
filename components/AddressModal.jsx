"use client";
import { addAddress } from "@/lib/features/address/addressSlice";
import { KENYA_COUNTIES } from "@/lib/counties";
import { useAuth } from "@clerk/nextjs";
import axios from "axios";
import { Loader2Icon, XIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "react-hot-toast";
import { useDispatch } from "react-redux";

const AddressModal = ({ setShowAddressModal }) => {
  const { getToken } = useAuth();
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);

  const [address, setAddress] = useState({
    name: "",
    email: "",
    street: "",
    city: "",
    state: "",
    zip: "",
    country: "Kenya",
    phone: "",
  });

  const handleAddressChange = (e) => {
    setAddress({
      ...address,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      const token = await getToken();
      const { data } = await axios.post(
        "/api/address",
        { address },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      dispatch(addAddress(data.address));

      toast.success("Address added successfully");
      setLoading(false);
      setShowAddressModal(false);
    } catch (error) {
      toast.error(error.response?.data || "Failed to add address");
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={(e) =>
        toast.promise(handleSubmit(e), { loading: "Adding Address..." })
      }
      className="fixed inset-0 z-50 bg-white/60 backdrop-blur h-screen flex items-center justify-center"
    >
      <div className="flex flex-col gap-5 text-slate-700 w-full max-w-sm mx-6">
        <h2 className="text-3xl ">
          Add New <span className="font-semibold">Address</span>
        </h2>
        <input
          name="name"
          onChange={handleAddressChange}
          value={address.name}
          className="p-2 px-4 outline-none border border-slate-200 rounded w-full"
          type="text"
          placeholder="Enter your full name"
          required
        />
        <input
          name="email"
          onChange={handleAddressChange}
          value={address.email}
          className="p-2 px-4 outline-none border border-slate-200 rounded w-full"
          type="email"
          placeholder="Email address"
          required
        />
        <input
          name="street"
          onChange={handleAddressChange}
          value={address.street}
          className="p-2 px-4 outline-none border border-slate-200 rounded w-full"
          type="text"
          placeholder="Estate / Street / House no."
          required
        />
        <div className="flex gap-4">
          <input
            name="city"
            onChange={handleAddressChange}
            value={address.city}
            className="p-2 px-4 outline-none border border-slate-200 rounded w-full"
            type="text"
            placeholder="Town / City"
            required
          />
          <select
            name="state"
            onChange={handleAddressChange}
            value={address.state}
            className="p-2 px-4 outline-none border border-slate-200 rounded w-full bg-white text-slate-500"
            required
          >
            <option value="" disabled>
              County
            </option>
            {KENYA_COUNTIES.map((county) => (
              <option key={county} value={county} className="text-slate-700">
                {county}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-4">
          <input
            name="zip"
            onChange={handleAddressChange}
            value={address.zip}
            className="p-2 px-4 outline-none border border-slate-200 rounded w-full"
            type="text"
            inputMode="numeric"
            placeholder="Postal code (e.g. 00100)"
            required
          />
          <input
            name="country"
            onChange={handleAddressChange}
            value={address.country}
            className="p-2 px-4 outline-none border border-slate-200 rounded w-full"
            type="text"
            placeholder="Country"
            required
          />
        </div>
        <input
          name="phone"
          onChange={handleAddressChange}
          value={address.phone}
          className="p-2 px-4 outline-none border border-slate-200 rounded w-full"
          type="tel"
          placeholder="Phone / M-Pesa no. (e.g. 0712 345 678)"
          required
        />
        <button
          disabled={
            !address.name ||
            !address.email ||
            !address.street ||
            !address.city ||
            !address.state ||
            !address.zip ||
            !address.country ||
            !address.phone ||
            loading
          }
          className="bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-white text-sm font-medium py-2.5 rounded-md hover:bg-slate-900 active:scale-95 transition-all"
        >
          {loading ? (
            <Loader2Icon className="animate-spin text-pink-500" />
          ) : (
            "Add Address"
          )}
        </button>
      </div>
      <XIcon
        size={30}
        className="absolute top-5 right-5 text-slate-500 hover:text-slate-700 cursor-pointer"
        onClick={() => setShowAddressModal(false)}
      />
    </form>
  );
};

export default AddressModal;
