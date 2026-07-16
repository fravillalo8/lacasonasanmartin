import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { ArrowLeft, MapPin } from "lucide-react";
import InstagramIcon from "../components/icons/InstagramIcon";
import { Link } from "react-router-dom";

const GALLERY = [
  "/photos/emulen/gallery-1.jpg",
  "/photos/emulen/gallery-2.jpg",
  "/photos/emulen/gallery-3.jpg",
  "/photos/emulen/gallery-4.jpg",
  "/photos/emulen/gallery-5.jpg",
  "/photos/emulen/gallery-6.jpg",
  "/photos/emulen/gallery-7.jpg",
  "/photos/emulen/gallery-8.jpg",
  "/photos/emulen/gallery-9.jpg",
];

const SCHEDULE = [
  { day: "Lunes", slots: ["08:30", "10:00", "18:30", "19:45"] },
  { day: "Martes", slots: ["07:15", "08:30", "10:00", "17:15", "18:30", "19:45"] },
  { day: "Miércoles – Sábado", slots: ["Agenda completa en Instagram"] },
];

function FadeUp({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial={{ y: 32, opacity: 0 }}
      animate={inView ? { y: 0, opacity: 1 } : {}}
      transition={{ duration: 0.75, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default function EmulenPilates() {
  return (
    <main className="bg-black min-h-screen overflow-x-hidden">

      {/* Hero */}
      <section className="relative h-[90vh] min-h-[560px] w-full overflow-hidden">
        <img
          src="/photos/emulen/gallery-1.jpg"
          alt="Estudio Emulen Pilates Center en La Casona San Martín"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/20 to-black/90" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-transparent" />

        {/* Top nav */}
        <div className="absolute top-0 left-0 right-0 z-20 px-6 pt-6 flex items-center gap-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] transition-colors"
            style={{ color: "rgba(225,224,204,0.65)" }}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            La Casona San Martín
          </Link>
        </div>

        {/* Logo badge */}
        <motion.div
          className="absolute top-16 left-6 z-20 flex items-center gap-3 bg-black/60 backdrop-blur-md rounded-2xl p-3 pr-5"
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.9, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          <img
            src="/photos/Logo Emulen Pilates Center.jpg"
            alt="Logo Emulen Pilates Center"
            className="w-14 h-14 rounded-xl object-contain bg-white/10 p-1"
          />
          <div>
            <p className="font-serif text-base leading-tight" style={{ color: "#E1E0CC" }}>
              Emulen Pilates Center
            </p>
            <p className="text-[10px] uppercase tracking-[0.2em] mt-0.5" style={{ color: "#D4A574" }}>
              Pilates Reformer · Wall Unit
            </p>
          </div>
        </motion.div>

        {/* Hero text */}
        <div className="absolute bottom-0 left-0 right-0 z-10 px-6 md:px-12 pb-10 md:pb-14">
          <motion.div
            className="h-[1px] w-16 mb-5"
            style={{ background: "#D4A574", originX: 0 }}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.7, delay: 0.5 }}
          />
          <motion.h1
            className="font-serif font-normal leading-[0.9] tracking-[-0.03em] text-[15vw] sm:text-[12vw] md:text-[10vw] lg:text-[8vw]"
            style={{ color: "#E1E0CC" }}
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.9, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            Emulen<br />
            <span className="italic" style={{ color: "#D4A574" }}>Pilates</span>
          </motion.h1>
          <motion.div
            className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-4"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.7 }}
          >
            <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: "rgba(225,224,204,0.7)" }}>
              <MapPin className="w-3.5 h-3.5" style={{ color: "#D4A574" }} />
              Rinconada de Los Andes · La Casona San Martín
            </span>
            <a
              href="https://www.instagram.com/emulen.pilates/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs group"
              style={{ color: "#D4A574" }}
            >
              <InstagramIcon size={14} />
              <span className="group-hover:underline">@emulen.pilates</span>
            </a>
          </motion.div>
        </div>
      </section>

      {/* About */}
      <section className="py-16 sm:py-24 px-6 md:px-12 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <FadeUp>
            <p className="text-[10px] uppercase tracking-[0.25em] mb-5" style={{ color: "#D4A574" }}>
              Nuestra práctica
            </p>
            <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-normal leading-[1.05] mb-6" style={{ color: "#E1E0CC" }}>
              Cuerpo<br />& <span className="italic">Alma</span>.
            </h2>
            <p className="text-sm sm:text-base leading-relaxed mb-4" style={{ color: "rgba(225,224,204,0.7)" }}>
              Emulen Pilates Center ofrece clases de <strong style={{ color: "#E1E0CC" }}>Pilates Reformer</strong> y{" "}
              <strong style={{ color: "#E1E0CC" }}>Wall Unit</strong> con un enfoque holístico en el movimiento consciente.
              Un espacio diseñado para reconectar cuerpo y mente en el corazón del Valle del Aconcagua.
            </p>
            <p className="text-sm sm:text-base leading-relaxed" style={{ color: "rgba(225,224,204,0.7)" }}>
              Clases presenciales en grupos reducidos para una atención personalizada. Reserva tu cupo con anticipación.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {["Pilates Reformer", "Wall Unit", "Clases presenciales", "Grupos reducidos"].map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1.5 rounded-full text-xs border"
                  style={{ borderColor: "rgba(212,165,116,0.3)", color: "#D4A574" }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </FadeUp>

          <FadeUp delay={0.15}>
            <div className="relative">
              <img
                src="/photos/emulen/gallery-2.jpg"
                alt="Clase de Pilates Reformer en Emulen Pilates Center"
                className="w-full aspect-[4/5] object-cover rounded-2xl"
              />
              <div
                className="absolute -bottom-4 -left-4 bg-[#161616] rounded-xl px-5 py-4 border"
                style={{ borderColor: "rgba(212,165,116,0.15)" }}
              >
                <p className="text-2xl font-serif" style={{ color: "#E1E0CC" }}>1.296</p>
                <p className="text-[10px] uppercase tracking-[0.2em] mt-0.5" style={{ color: "#D4A574" }}>
                  seguidores Instagram
                </p>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* Gallery */}
      <section className="py-12 sm:py-16 px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          <FadeUp className="text-center mb-10">
            <p className="text-[10px] uppercase tracking-[0.25em] mb-4" style={{ color: "#D4A574" }}>
              Galería
            </p>
            <h2 className="font-serif text-3xl sm:text-4xl font-normal" style={{ color: "#E1E0CC" }}>
              Nuestro <span className="italic">espacio</span>.
            </h2>
          </FadeUp>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
            {GALLERY.map((src, i) => (
              <FadeUp key={src} delay={i * 0.06}>
                <div className={`overflow-hidden rounded-xl ${i === 0 ? "col-span-2 sm:col-span-1 row-span-2" : ""}`}>
                  <img
                    src={src}
                    alt={`Emulen Pilates Center — foto ${i + 1}`}
                    loading="lazy"
                    className={`w-full object-cover transition-transform duration-700 hover:scale-105 ${i === 0 ? "aspect-[4/5] sm:aspect-square" : "aspect-square"}`}
                  />
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* Schedule */}
      <section className="py-16 sm:py-24 px-6 md:px-12">
        <div className="max-w-4xl mx-auto">
          <FadeUp className="text-center mb-12">
            <p className="text-[10px] uppercase tracking-[0.25em] mb-4" style={{ color: "#D4A574" }}>
              Horarios
            </p>
            <h2 className="font-serif text-3xl sm:text-4xl font-normal" style={{ color: "#E1E0CC" }}>
              Cuándo <span className="italic">practicar</span>.
            </h2>
          </FadeUp>
          <div className="space-y-3">
            {SCHEDULE.map((row, i) => (
              <FadeUp key={row.day} delay={i * 0.08}>
                <div
                  className="bg-[#161616] rounded-2xl px-6 py-5 flex flex-col sm:flex-row sm:items-center gap-4"
                  style={{ border: "1px solid rgba(255,255,255,0.05)" }}
                >
                  <span
                    className="text-[10px] uppercase tracking-[0.2em] shrink-0 w-48"
                    style={{ color: "#D4A574" }}
                  >
                    {row.day}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {row.slots.map((slot) => (
                      <span
                        key={slot}
                        className="px-3 py-1 rounded-full text-xs font-medium bg-white/5"
                        style={{ color: "#E1E0CC" }}
                      >
                        {slot}
                      </span>
                    ))}
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>
          <FadeUp delay={0.3} className="mt-6 text-center">
            <p className="text-xs italic text-gray-500">
              Agenda completa y reservas en{" "}
              <a
                href="https://www.instagram.com/emulen.pilates/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
                style={{ color: "#D4A574" }}
              >
                @emulen.pilates
              </a>
            </p>
          </FadeUp>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-24 px-6 md:px-12">
        <FadeUp>
          <div
            className="max-w-4xl mx-auto rounded-3xl p-10 sm:p-14 text-center"
            style={{
              background: "linear-gradient(135deg, #161616 0%, #1c1a14 100%)",
              border: "1px solid rgba(212,165,116,0.15)",
            }}
          >
            <p className="text-[10px] uppercase tracking-[0.25em] mb-4" style={{ color: "#D4A574" }}>
              Reserva tu clase
            </p>
            <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-normal mb-4" style={{ color: "#E1E0CC" }}>
              ¿Lista para <span className="italic">empezar</span>?
            </h2>
            <p className="text-sm text-gray-400 mb-8 max-w-md mx-auto">
              Escríbenos o reserva directamente desde Instagram. Grupos reducidos para una experiencia personalizada.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <a
                href="https://www.instagram.com/emulen.pilates/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 rounded-full px-7 py-3 text-sm font-medium text-black transition-opacity hover:opacity-90"
                style={{ background: "#D4A574" }}
              >
                <InstagramIcon size={16} />
                Reservar en Instagram
              </a>
              <Link
                to="/"
                className="inline-flex items-center gap-2 rounded-full px-7 py-3 text-sm border transition-colors"
                style={{ borderColor: "rgba(212,165,116,0.3)", color: "#D4A574" }}
              >
                <ArrowLeft className="w-4 h-4" />
                Volver a La Casona
              </Link>
            </div>
          </div>
        </FadeUp>
      </section>

      {/* Footer mini */}
      <footer className="border-t px-6 py-8" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3 group">
            <img
              src="/photos/logo-casona.jpg"
              alt="La Casona San Martín"
              className="w-10 h-10 rounded-full object-cover"
            />
            <div>
              <p className="font-serif text-sm" style={{ color: "#E1E0CC" }}>La Casona San Martín</p>
              <p className="text-[9px] uppercase tracking-[0.2em]" style={{ color: "#D4A574" }}>Rinconada de los Andes</p>
            </div>
          </Link>
          <p className="text-xs text-gray-500">
            Carretera San Martín 421, Paradero 10, Rinconada de los Andes
          </p>
        </div>
      </footer>
    </main>
  );
}
