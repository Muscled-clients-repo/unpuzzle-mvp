import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { StoreProvider } from "@/components/providers/StoreProvider"
import { AuthProvider } from "@/components/providers/AuthProvider"
import { Providers } from "./providers"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Unpuzzle - AI-Powered Learning Platform",
  description: "Accelerate your learning with contextual AI assistance and adaptive content delivery",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <AuthProvider>
          <StoreProvider>
            <Providers>
              <ThemeProvider
                attribute="class"
                defaultTheme="system"
                enableSystem
                disableTransitionOnChange
              >
                {children}
              </ThemeProvider>
            </Providers>
          </StoreProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
