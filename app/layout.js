import { Inter } from "next/font/google";
import "./globals.css";
import MainLayout from "@/components/Layout/MainLayout";

const inter = Inter({
  variable: "--font-family",
  subsets: ["latin"],
});

export const metadata = {
  title: "Subly | Digital Subscription Tracker",
  description: "Track all your digital subscriptions, get alerts, and save money with Subly.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <MainLayout>
          {children}
        </MainLayout>
      </body>
    </html>
  );
}
