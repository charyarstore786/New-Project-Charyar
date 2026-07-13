import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import { site } from "@/lib/site";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz"],
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} — Studio Apartment in Newport, Wales`,
    template: `%s — ${site.name}`,
  },
  description:
    "Book direct and save. A stylish self-contained studio apartment in Newport, South Wales for up to 2 guests — private entrance, free Wi-Fi, free street parking, 5 minutes from Newport station.",
  openGraph: {
    title: `${site.name} — Studio Apartment in Newport, Wales`,
    description:
      "A stylish self-contained studio apartment in Newport, South Wales for up to 2 guests. Book direct for the best rate.",
    type: "website",
    locale: "en_GB",
    images: ["/photos/studio-overview.jpg"],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "VacationRental",
  name: site.name,
  description:
    "Self-contained studio apartment in Newport, South Wales for up to 2 guests with private entrance and free parking.",
  image: `${site.url}/photos/studio-overview.jpg`,
  email: site.email,
  address: {
    "@type": "PostalAddress",
    addressLocality: site.address.locality,
    addressRegion: site.address.region,
    addressCountry: site.address.country,
  },
  containsPlace: {
    "@type": "Accommodation",
    occupancy: { "@type": "QuantitativeValue", maxValue: site.maxGuests },
    amenityFeature: [
      { "@type": "LocationFeatureSpecification", name: "Free Wi-Fi", value: true },
      { "@type": "LocationFeatureSpecification", name: "Free street parking", value: true },
      { "@type": "LocationFeatureSpecification", name: "Washing machine", value: true },
      { "@type": "LocationFeatureSpecification", name: "Private bathroom", value: true },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-GB">
      <body
        className={`${inter.variable} ${fraunces.variable} font-sans antialiased`}
        suppressHydrationWarning
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
      </body>
    </html>
  );
}
