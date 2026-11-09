import type {Metadata, Viewport} from "next"
import localFont from "next/font/local"
import "./globals.css"
import {Nav} from "../components/Nav"

const jetbrains = localFont({
  src: [
    {path: "../public/fonts/JetBrainsMono-Regular.woff2", weight: "400"},
    {path: "../public/fonts/JetBrainsMono-SemiBold.woff2", weight: "600"},
  ],
  variable: "--font-jetbrains",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Sightglass handover door",
  description: "Receives the signed round sheet from the Sightglass Lens. The chief engineer countersigns the digest they are looking at.",
}

export const viewport: Viewport = {width: "device-width", initialScale: 1, themeColor: "#0F1D23"}

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={jetbrains.variable}>
      <body>
        <Nav />
        <main className="wrap" style={{padding: "48px 0 96px"}}>{children}</main>
      </body>
    </html>
  )
}
