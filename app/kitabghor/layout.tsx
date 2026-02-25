import Footer from "@/components/ecommarce/footer";
import Header from "@/components/ecommarce/header";

const KitabGhorLayout = async ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="min-h-full">
      <div className="min-h-screen flex flex-col">
        <Header />
        {children}
        <Footer />
      </div>
    </div>
  );
};

export default KitabGhorLayout;
