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
    (function(p,e,n,d,o){var v,w,x,y,z;o=p[d]=p[d]||{};o._q=o._q||[];
    v=['initialize','identify','updateOptions','pageLoad','track', 'trackAgent'];for(w=0,x=v.length;w<x;++w)(function(m){
    o[m]=o[m]||function(){o._q[m===v[0]?'unshift':'push']([m].concat([].slice.call(arguments,0)));};})(v[w]);
    y=e.createElement(n);y.async=!0;y.src='https://cdn.pendo.io/agent/static/'+apiKey+'/pendo.js';
    z=e.getElementsByTagName(n)[0];z.parentNode.insertBefore(y,z);})(window,document,'script','pendo');
})('86657d61-c85f-49e8-8f63-cc68015948ba');

// Interception Wrapper for Live Diagnostic Console
window.pendoLogs = [];
if (window.pendo) {
  let currentTrack = window.pendo.track;
  Object.defineProperty(window.pendo, 'track', {
    get() {
      return function() {
        const eventData = {
          timestamp: new Date().toISOString(),
          method: 'track',
          args: Array.from(arguments)
        };
        window.pendoLogs.push(eventData);
        window.dispatchEvent(new CustomEvent('pendo-sdk-call', { detail: eventData }));
        return currentTrack.apply(this, arguments);
      };
    },
    set(newVal) {
      currentTrack = newVal;
    },
    configurable: true,
    enumerable: true
  });

  let currentInit = window.pendo.initialize;
  Object.defineProperty(window.pendo, 'initialize', {
    get() {
      return function() {
        const eventData = {
          timestamp: new Date().toISOString(),
          method: 'initialize',
          args: Array.from(arguments)
        };
        window.pendoLogs.push(eventData);
        window.dispatchEvent(new CustomEvent('pendo-sdk-call', { detail: eventData }));
        return currentInit.apply(this, arguments);
      };
    },
    set(newVal) {
      currentInit = newVal;
    },
    configurable: true,
    enumerable: true
  });
}
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
