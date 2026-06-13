import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Image from "next/image";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HarnHub",
  description: "The ultimate shared expense routing engine.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                if (typeof window !== 'undefined') {
                  // Catch unhandled promise rejections
                  window.addEventListener('unhandledrejection', function(event) {
                    var msg = (event.reason && event.reason.message) || String(event.reason || '');
                    if (msg.indexOf('Load failed') !== -1 || msg.indexOf('Failed to fetch') !== -1) {
                      event.preventDefault();
                      console.warn('Suppressed unhandled rejection:', event.reason);
                    }
                  });

                  // Catch global runtime errors
                  window.addEventListener('error', function(event) {
                    var msg = event.message || (event.error && event.error.message) || String(event.error || '');
                    if (msg.indexOf('Load failed') !== -1 || msg.indexOf('Failed to fetch') !== -1) {
                      event.preventDefault();
                      console.warn('Suppressed runtime error:', event.error);
                    }
                  });

                  // Intercept console.error to prevent Next.js Dev Overlay from displaying network load errors
                  var orgConsoleError = console.error;
                  console.error = function() {
                    var args = Array.prototype.slice.call(arguments);
                    var msg = args.map(function(arg) {
                      return (arg && arg.message) || String(arg || '');
                    }).join(' ');
                    if (msg.indexOf('Load failed') !== -1 || msg.indexOf('Failed to fetch') !== -1) {
                      console.warn.apply(console, ['Suppressed console.error:'].concat(args));
                      return;
                    }
                    orgConsoleError.apply(console, args);
                  };
                }
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col relative bg-zinc-50">
        <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
          <Image
            src="/bg-ark.png"
            alt="Global Background"
            fill
            priority
            unoptimized
            className="object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px]"></div>
        </div>
        <div className="relative z-10 flex flex-col min-h-full flex-grow">
          {children}
        </div>
      </body>
    </html>
  );
}
