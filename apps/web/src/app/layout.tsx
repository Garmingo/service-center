import type { Metadata } from "next";
import { UIHooksHost } from "@garmingo/ui-hooks";

import "../index.css";
import Header from "@/components/header";
import Providers from "@/components/providers";

export const metadata: Metadata = {
  title: "Garmingo Service Center",
  description: "Operations software for Garmingo staff.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-bg text-fg1 antialiased">
        <Providers>
          <div className="grid min-h-svh grid-rows-[auto_1fr]">
            <Header />
            {children}
          </div>
          <UIHooksHost alerts={{ position: "bottom-right" }} />
        </Providers>
      </body>
    </html>
  );
}
