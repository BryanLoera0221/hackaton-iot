import type { Metadata, Viewport } from "next";
import "~/app/globals.css";
import "~/styles/industry.css";
import "~/styles/fallguard.css";
import { Providers } from "~/app/providers";

export const metadata: Metadata = {
  title: "FallGuard — panel de enfermería",
  description: "Alertas de caída y salida de cama en tiempo real",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;700&family=Barlow+Condensed:wght@600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
