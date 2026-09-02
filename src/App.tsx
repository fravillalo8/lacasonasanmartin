import { Routes, Route, Navigate } from "react-router-dom";
import Hero from "./components/Hero";
import ScrollProgress from "./components/ScrollProgress";
import About from "./components/About";
import Gallery from "./components/Gallery";
import Features from "./components/Features";
import Eventos from "./components/Eventos";
import Horarios from "./components/Horarios";
import CotizarLocal from "./components/CotizarLocal";
import Contacto from "./components/Contacto";
import Footer from "./components/Footer";
import ChatBot from "./components/ChatBot";
import EmulenPilates from "./pages/EmulenPilates";
import InventarioApp from "./pages/inventario/InventarioApp";
import Carta from "./pages/Carta";

function Home() {
  return (
    <main className="bg-black min-h-screen overflow-x-hidden">
      <ScrollProgress />
      <Hero />
      <About />
      <Gallery />
      <Features />
      <Eventos />
      <Horarios />
      <CotizarLocal />
      <Contacto />
      <Footer />
      <ChatBot />
    </main>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/emulen-pilates" element={<EmulenPilates />} />
      <Route path="/mesa-central/*" element={<InventarioApp />} />
      <Route path="/mesadecontrol/*" element={<Navigate to="/mesa-central" replace />} />
      <Route path="/mesacentral/*" element={<Navigate to="/mesa-central" replace />} />
      <Route path="/carta" element={<Carta />} />
    </Routes>
  );
}
