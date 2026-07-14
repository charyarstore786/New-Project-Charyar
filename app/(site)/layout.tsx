import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ChatWidget from "@/components/ChatWidget";
import { getPricing } from "@/lib/pricing";

export const revalidate = 60;

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const { nightlyRate } = await getPricing();
  return (
    <>
      <Header />
      <main>{children}</main>
      <Footer />
      <ChatWidget nightlyRate={nightlyRate} />
    </>
  );
}
