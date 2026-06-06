import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const outfit = Outfit({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Prometheus | Predictive UX Simulation & Agentic Telemetry",
  description: "Prometheus simulates user behaviors via cognitive agents (Eidolons), predicting UX frictions and conversion leakage before deploying to production.",
  openGraph: {
    title: "Prometheus | Predictive UX Simulation",
    description: "Simulate user behaviors via cognitive agents (Eidolons), predicting UX frictions and conversion leakage.",
    type: "website",
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable}`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function(apiKey){
    window.pendoLogs = [];
    
    (function(p,e,n,d,o){var v,w,x,y,z;o=p[d]=p[d]||{};o._q=o._q||[];
    
    // Wrap queue push to log calls instantly as they are queued
    const originalPush = o._q.push;
    o._q.push = function() {
      const item = arguments[0];
      if (item && typeof item[0] === 'string') {
        const eventData = {
          timestamp: new Date().toISOString(),
          method: item[0],
          args: Array.from(item).slice(1)
        };
        window.pendoLogs.push(eventData);
        window.dispatchEvent(new CustomEvent('pendo-sdk-call', { detail: eventData }));
      }
      return originalPush.apply(this, arguments);
    };

    v=['initialize','identify','updateOptions','pageLoad','track', 'trackAgent'];for(w=0,x=v.length;w<x;++w)(function(m){
    o[m]=o[m]||function(){o._q[m===v[0]?'unshift':'push']([m].concat([].slice.call(arguments,0)));};})(v[w]);
    
    y=e.createElement(n);y.async=!0;y.src='https://cdn.pendo.io/agent/static/'+apiKey+'/pendo.js';
    
    // Wrap the live methods once pendo.js finishes loading
    y.onload = function() {
      if (p[d]) {
        const originalTrack = p[d].track;
        p[d].track = function() {
          const eventData = {
            timestamp: new Date().toISOString(),
            method: 'track',
            args: Array.from(arguments)
          };
          window.pendoLogs.push(eventData);
          window.dispatchEvent(new CustomEvent('pendo-sdk-call', { detail: eventData }));
          return originalTrack.apply(this, arguments);
        };
        
        const originalInit = p[d].initialize;
        p[d].initialize = function() {
          const eventData = {
            timestamp: new Date().toISOString(),
            method: 'initialize',
            args: Array.from(arguments)
          };
          window.pendoLogs.push(eventData);
          window.dispatchEvent(new CustomEvent('pendo-sdk-call', { detail: eventData }));
          return originalInit.apply(this, arguments);
        };
      }
    };
    
    z=e.getElementsByTagName(n)[0];z.parentNode.insertBefore(y,z);})(window,document,'script','pendo');
})('86657d61-c85f-49e8-8f63-cc68015948ba');
            `,
          }}
        />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
