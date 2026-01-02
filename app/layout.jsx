import { SUSE } from "next/font/google";
import { Toaster } from "react-hot-toast";
import StoreProvider from "@/app/StoreProvider";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const suse = SUSE({ subsets: ["latin"], weight: ["400", "700"] });

export const metadata = {
  title: "Aura Cosmetic Market",
  description: "Shop smarter, faster & cheaper",
};

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={`${suse.className} antialiased`}>
          <StoreProvider>
            <Toaster />
            {children}
          </StoreProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
