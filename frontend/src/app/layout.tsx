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
        {/* CRITICAL HACKATHON COMPLIANCE: NOVUS.AI INSTRUMENTATION BRIDGES */}
        <script
          id="novus-analytics-script"
          dangerouslySetInnerHTML={{
            __html: `
              (function(n,o,v,u,s){
                n[s]=n[s]||function(){(n[s].q=n[s].q||[]).push(arguments)},n[s].l=1*new Date();
                var a=o.createElement(v),m=o.getElementsByTagName(v)[0];
                a.async=1;a.src=u;m.parentNode.insertBefore(a,m)
              })(window,document,'script','https://novus.pendo.io/analytics.js','novus');
              
              // Registering project with WPD26 target workspace ID
              novus('init', 'wpd26-prometheus-simulation-bridge');
              novus('track', 'pageview');
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
