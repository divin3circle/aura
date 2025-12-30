import { SUSE } from "next/font/google";
import { Toaster } from "react-hot-toast";
import StoreProvider from "@/app/StoreProvider";
import "./globals.css";

const suse = SUSE({ subsets: ["latin"], weight: ["400", "700"] });

export const metadata = {
  title: "Aura Cosmetic Market",
  description: "Shop smarter, faster & cheaper",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${suse.className} antialiased`}>
        <StoreProvider>
          <Toaster />
          {children}
        </StoreProvider>
      </body>
    </html>
  );
}
