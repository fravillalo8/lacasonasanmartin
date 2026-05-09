import Hero from "./components/Hero";
import About from "./components/About";
import Gallery from "./components/Gallery";
import Features from "./components/Features";
import Eventos from "./components/Eventos";
import Horarios from "./components/Horarios";
import Contacto from "./components/Contacto";
import Footer from "./components/Footer";

export default function App() {
  return (
    <main className="bg-black min-h-screen overflow-x-hidden">
      <Hero />
      <About />
      <Gallery />
      <Features />
      <Eventos />
      <Horarios />
      <Contacto />
      <Footer />
    </main>
  );
}
