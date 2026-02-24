import React from "react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { headers } from "next/headers";
import { LoadingScreen, Toaster } from "@barangay/ui";
import { getBarangayConfig } from "@barangay/shared";
import "./globals.css";

const fontVariables: React.CSSProperties = {
  "--font-inter": "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  "--font-playfair": "Georgia, 'Times New Roman', serif",
  "--font-montserrat": "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
} as React.CSSProperties;

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const host = headersList.get('x-barangay-host') || headersList.get('host') || '';
  const config = await getBarangayConfig(host);

  const title = config
    ? `${config.name}, ${config.city} - Official Website`
    : 'Barangay Website';
  const description = config
    ? `Official website of ${config.name}, ${config.city} - ${config.tagline}`
    : 'Official Barangay Website';

  return {
    title,
    description,
    icons: {
      icon: [
        { url: '/logo.webp', type: 'image/webp' },
        { url: '/logo.png', type: 'image/png' },
      ],
      apple: '/logo.png',
      shortcut: '/logo.png',
    },
    other: {
      'preconnect': 'https://fonts.googleapis.com',
      'dns-prefetch': 'https://fonts.gstatic.com',
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const host = headersList.get('x-barangay-host') || headersList.get('host') || '';
  const config = await getBarangayConfig(host);

  const primaryColor = config?.primary_color || '#0007C6';

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" type="image/webp" href="/logo.webp" />
        <link rel="icon" type="image/png" href="/logo.png" />
        <link rel="apple-touch-icon" href="/logo.png" />
        <style dangerouslySetInnerHTML={{ __html: `:root { --barangay-primary: ${primaryColor}; }` }} />
        {/* Dynamic zoom: scales 1440px design to fit any desktop viewport */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function(){
            function setZoom(){
              var w=window.innerWidth;
              if(w<900){document.documentElement.style.zoom='';return}
              var z=0.0005*w-0.03;
              if(z>1.25)z=1.25;
              if(z<0.4)z=0.4;
              document.documentElement.style.zoom=z;
            }
            setZoom();
            window.addEventListener('resize',setZoom);
          })();
        `}} />
      </head>
      <body className="font-sans" style={{...fontVariables, backgroundColor: '#F9FAFB'}}>
        <div id="modal-root"></div>
        <div id="page-wrapper">
          <LoadingScreen />
          <Suspense fallback={null}>{children}</Suspense>
        </div>
        <Toaster />
      </body>
    </html>
  );
}
