export const site = {
  name: "Short Stay Newport",
  legalName: "Rental2Day Ltd",
  tagline: "A calm, private studio apartment in Newport, South Wales",
  email: "rental2dayltd@gmail.com",
  phone: "07472 469217",
  whatsappHref:
    "https://wa.me/447472469217?text=Hi%2C%20I%27m%20interested%20in%20booking%20The%20Newport%20Studio",
  nightlyRate: 100,
  cleaningFee: 0,
  deposit: 200,
  maxGuests: 2,
  minNights: 1,
  maxNights: 28,
  checkIn: "4:00 PM",
  checkOut: "10:00 AM",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  address: {
    locality: "Newport",
    region: "Wales",
    country: "GB",
  },
};

export type Photo = { src: string; alt: string; w: number; h: number };

export const photos: Photo[] = [
  { src: "/photos/studio-overview.jpg", alt: "Full view of the studio — twin beds, sofa and workspace", w: 1560, h: 1080 },
  { src: "/photos/twin-beds.jpg", alt: "Two comfortable single beds with fresh white linen", w: 1540, h: 1080 },
  { src: "/photos/beds-entrance.jpg", alt: "Beds beside the private entrance", w: 1464, h: 1080 },
  { src: "/photos/tv-lounge.jpg", alt: "50-inch smart TV and lounge area", w: 1504, h: 1080 },
  { src: "/photos/sofa.jpg", alt: "Comfortable sofa with cushions", w: 1464, h: 1080 },
  { src: "/photos/beds-sofa.jpg", alt: "Twin beds and sofa seating area", w: 1260, h: 1080 },
  { src: "/photos/kitchen.jpg", alt: "Kitchenette with fridge freezer and dining table", w: 836, h: 1080 },
  { src: "/photos/kitchen-dining.jpg", alt: "Kitchen area with washing machine and dining table", w: 690, h: 1080 },
  { src: "/photos/dining-area.jpg", alt: "Dining table for two", w: 836, h: 1080 },
  { src: "/photos/dining-table.jpg", alt: "Dining table set for two guests", w: 1460, h: 1080 },
  { src: "/photos/tea-coffee-station.jpg", alt: "Complimentary tea and coffee station with kettle, toaster and microwave", w: 1425, h: 1080 },
  { src: "/photos/tumble-dryer.jpg", alt: "Tumble dryer", w: 780, h: 1080 },
  { src: "/photos/bathroom.jpg", alt: "Private bathroom with bathtub and overhead shower", w: 640, h: 1080 },
  { src: "/photos/bathtub-shower.jpg", alt: "Bathtub with shower", w: 832, h: 1080 },
  { src: "/photos/towel-rail.jpg", alt: "Heated towel rail", w: 1115, h: 1080 },
  { src: "/photos/beds-artwork.jpg", alt: "Bedroom artwork and soft furnishings", w: 1450, h: 1080 },
  { src: "/photos/bedside-lamp.jpg", alt: "Bedside table with lamp", w: 1400, h: 1080 },
  { src: "/photos/shelf-decor.jpg", alt: "Bookshelf with plants and decor", w: 1170, h: 1080 },
  { src: "/photos/private-entrance.jpg", alt: "Private entrance to the studio", w: 665, h: 1080 },
];
