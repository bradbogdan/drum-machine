import "./globals.css";

export const metadata = {
  title: "Neon Drum Machine",
  description: "Client-side drum machine with Web Audio synthesis",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
