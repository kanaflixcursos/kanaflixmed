import type { Metadata } from "next";
import "@fontsource-variable/google-sans-flex/full.css";
import "./globals.css";
import { ClinicalShell } from "@/components/clinical-shell";

export const metadata: Metadata = {
  title: "Central Clínica | Gestão e cuidado",
  icons: { icon: "/icon.svg", shortcut: "/icon.svg" },
  description: "A rotina da clínica, do agendamento ao recebimento, em um só lugar.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full"><ClinicalShell>{children}</ClinicalShell></body>
    </html>
  );
}
