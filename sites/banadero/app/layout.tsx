import React from "react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { headers } from "next/headers";
import { Toaster } from "@barangay/ui";
import { getBarangayConfig } from "@barangay/shared";
import "./globals.css";

// Using system fonts to avoid Google Fonts dependency
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
    openGraph: {
      title,
      description,
      type: 'website',
      images: [{ url: '/logo.webp', width: 512, height: 512, alt: config?.name || 'Barangay Logo' }],
      siteName: config?.name || 'Barangay Website',
    },
    twitter: {
      card: 'summary',
      title,
      description,
      images: ['/logo.webp'],
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

  // Inject primary color as CSS variable (validate hex to prevent CSS injection)
  const rawColor = config?.primary_color || '#0007C6';
  const primaryColor = /^#[0-9a-fA-F]{3,8}$/.test(rawColor) ? rawColor : '#0007C6';

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
      <body className="font-sans" style={{...fontVariables, backgroundColor: '#F9FAFB'}} suppressHydrationWarning>
        <div id="modal-root"></div>
        {/* Server-rendered header shell — outside #page-wrapper so it's full-width from first paint.
            The client <Header> component portals into #header-root and replaces this. */}
        <div id="header-root">
          <header style={{position: 'fixed', top: 0, left: 0, width: '100%', zIndex: 50, backgroundColor: primaryColor, borderBottom: '1px solid rgba(229,231,235,0.5)', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)'}}>
            <div style={{width: '100%', margin: '0 auto', paddingTop: '1rem', paddingBottom: '1rem', paddingLeft: '5%', paddingRight: '5%'}}>
              <div style={{display: 'flex', alignItems: 'center', gap: 'clamp(0.5rem, 2vw, 1rem)'}}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.webp" alt="Barangay Logo" width={56} height={56} style={{width: 'clamp(2.5rem, 4vw, 3.5rem)', height: 'clamp(2.5rem, 4vw, 3.5rem)', objectFit: 'cover', flexShrink: 0}} />
                <div style={{minWidth: 0, flex: 1}}>
                  <h1 style={{fontWeight: 900, fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 'clamp(1.125rem, 2.4vw, 1.25rem)', color: 'white', lineHeight: 1, letterSpacing: '0.05em', marginBottom: 'clamp(0.125rem, 0.3vh, 0.25rem)', margin: 0, marginBlockEnd: 'clamp(0.125rem, 0.3vh, 0.25rem)'}}>
                    {config ? `${config.name}, ${config.city}` : 'Bañadero, Legazpi City'}
                  </h1>
                  <p style={{fontSize: 'clamp(0.875rem, 1.6vw, 0.75rem)', color: 'rgb(229,231,235)', fontWeight: 500, lineHeight: 1.25, margin: 0}}>
                    {config?.tagline || 'Serving Our Community'}
                  </p>
                </div>
              </div>
            </div>
          </header>
        </div>
        <div id="page-wrapper">
          <Suspense fallback={null}>{children}</Suspense>
        </div>
        <Toaster />
      </body>
    </html>
  );
}
