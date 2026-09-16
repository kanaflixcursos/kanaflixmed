import type { Metadata } from "next";
import "@fontsource-variable/google-sans-flex/full.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kanaflix MED | Gestão clínica",
  description: "A rotina da clínica, do agendamento ao recebimento, em um só lugar.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
