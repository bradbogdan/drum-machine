import "./globals.css";
import AuthButton from "@/components/AuthButton";

export const metadata = {
  title: "Neon Beat Synth",
  description: "Client-side drum machine and melody synth with Web Audio synthesis",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AuthButton />
        {children}
      </body>
    </html>
  );
}
