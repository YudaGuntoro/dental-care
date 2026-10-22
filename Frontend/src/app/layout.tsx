import type { Metadata } from 'next';
import './globals.css';
import "flatpickr/dist/flatpickr.css";
import { SidebarProvider } from '@/context/SidebarContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { ToastProvider } from '@/context/ToastContext';

// All application pages render per request; static files keep their own cache policy.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: {
    default: "Dental Care Clinic Management",
    template: "%s | Dental Care",
  },
  description: "Patient, appointment, treatment, and payment management for Dental Care.",
  icons: {
    apple: "/dental-care-logo.png?v=dental-care-logo",
    icon: "/dental-care-logo.png?v=dental-care-logo",
    shortcut: "/dental-care-logo.png?v=dental-care-logo",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="font-outfit dark:bg-gray-900">
        <ThemeProvider>
          <ToastProvider>
            <SidebarProvider>{children}</SidebarProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
