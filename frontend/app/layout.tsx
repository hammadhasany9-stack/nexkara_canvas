import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nexkara Canvas",
  description: "Every prototype, reviewed in one trusted space.",
};

// Applied before paint to avoid a light/dark flash.
const themeScript = `(function(){try{if(localStorage.getItem('lp-theme')==='dark'){document.documentElement.classList.add('dark');}}catch(e){}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
