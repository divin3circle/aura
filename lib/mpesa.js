import axios from "axios";

// Safaricom Daraja (M-Pesa) STK Push helper.
// Sandbox by default; set MPESA_ENV=production to hit the live API.
const BASE =
  process.env.MPESA_ENV === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";

// Normalize a Kenyan number to the 2547XXXXXXXX / 2541XXXXXXXX format Daraja expects.
export const normalizePhone = (phone) => {
  let p = String(phone || "").replace(/\D/g, "");
  if (p.startsWith("254")) return p;
  if (p.startsWith("0")) return "254" + p.slice(1);
  if (p.startsWith("7") || p.startsWith("1")) return "254" + p;
  return p;
};

// YYYYMMDDHHmmss in server local time (Daraja's expected timestamp format).
const stkTimestamp = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return (
    d.getFullYear() +
    p(d.getMonth() + 1) +
    p(d.getDate()) +
    p(d.getHours()) +
    p(d.getMinutes()) +
    p(d.getSeconds())
  );
};

// OAuth access token (Basic auth with consumer key/secret).
export const getAccessToken = async () => {
  const auth = Buffer.from(
    `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
  ).toString("base64");
  const { data } = await axios.get(
    `${BASE}/oauth/v1/generate?grant_type=client_credentials`,
    { headers: { Authorization: `Basic ${auth}` } }
  );
  return data.access_token;
};

// Trigger an STK push to the customer's phone. Returns Daraja's response
// (incl. CheckoutRequestID, which we store to correlate the callback).
export const initiateStkPush = async ({
  phone,
  amount,
  accountRef,
  description,
  callbackUrl,
}) => {
  const token = await getAccessToken();
  const shortcode = process.env.MPESA_SHORTCODE;
  const timestamp = stkTimestamp();
  const password = Buffer.from(
    `${shortcode}${process.env.MPESA_PASSKEY}${timestamp}`
  ).toString("base64");

  const { data } = await axios.post(
    `${BASE}/mpesa/stkpush/v1/processrequest`,
    {
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: Math.round(Number(amount)), // M-Pesa amounts are whole KES
      PartyA: normalizePhone(phone),
      PartyB: shortcode,
      PhoneNumber: normalizePhone(phone),
      CallBackURL: callbackUrl,
      AccountReference: String(accountRef).slice(0, 12), // Daraja caps this
      TransactionDesc: String(description || "Aura order").slice(0, 13),
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return data; // { MerchantRequestID, CheckoutRequestID, ResponseCode, ResponseDescription, CustomerMessage }
};
