import type {Metadata, Viewport} from "next"
import localFont from "next/font/local"
import {Fraunces, Hanken_Grotesk} from "next/font/google"
import "./globals.css"
import {Nav} from "../components/Nav"
import {Footer} from "../components/Footer"

const jetbrains = localFont({
  src: [
    {path: "../public/fonts/JetBrainsMono-Regular.woff2", weight: "400"},
    {path: "../public/fonts/JetBrainsMono-SemiBold.woff2", weight: "600"},
  ],
  variable: "--font-jetbrains",
  display: "swap",
})
const fraunces = Fraunces({subsets: ["latin"], variable: "--font-fraunces", display: "swap", style: ["normal", "italic"], axes: ["opsz"]})
const hanken = Hanken_Grotesk({subsets: ["latin"], variable: "--font-hanken", display: "swap"})

export const metadata: Metadata = {
  metadataBase: new URL("https://sightglass-kinno.vercel.app"),
  title: {default: "Sightglass: every reading, seen", template: "%s | Sightglass"},
  description: "A SPECS Lens for the engine room round. It reads each gauge as you look at it, and you sign a log where nothing was assumed.",
  openGraph: {title: "Sightglass: every reading, seen", description: "A SPECS Lens for the engine room round.", images: ["/hero.webp"]},
}

export const viewport: Viewport = {width: "device-width", initialScale: 1, themeColor: "#0F1D23"}

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={`${jetbrains.variable} ${fraunces.variable} ${hanken.variable}`}>
      <body>
        <a href="#main" className="skip">Skip to content</a>
        <Nav />
        <main id="main">{children}</main>
        <Footer />
      </body>
    </html>
  )
}
