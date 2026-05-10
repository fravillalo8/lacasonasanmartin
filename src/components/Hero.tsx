import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import WordsPullUp from "./WordsPullUp";

const NAV_ITEMS = [
  { label: "Nuestra Historia", href: "#historia" },
  { label: "Eventos", href: "#eventos" },
  { label: "Locales en la Casona", href: "#emprendedores" },
  { label: "Arriendo de Local", href: "#cotizar" },
  { label: "Contacto", href: "#contacto" },
];

export default function Hero() {
  return (
    <section className="h-screen w-full p-4 md:p-6">
      <div className="relative h-full w-full overflow-hidden rounded-2xl md:rounded-[2rem]">
        <motion.img
          src="/photos/hero.jpg"
          alt="Corredor de La Casona San Martín hacia el jardín"
          className="absolute inset-0 h-full w-full object-cover"
          initial={{ scale: 1.05 }}
          animate={{ scale: 1.15 }}
          transition={{ duration: 18, ease: "easeOut" }}
        />
        <div className="noise-overlay pointer-events-none absolute inset-0 opacity-[0.4] mix-blend-overlay" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/55 via-black/15 to-black/85" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-transparent" />

        <nav className="absolute left-1/2 top-0 z-20 -translate-x-1/2 bg-black rounded-b-2xl md:rounded-b-3xl px-4 py-2 md:px-8">
          <ul className="flex gap-3 sm:gap-6 md:gap-10 lg:gap-12">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  className="text-[10px] sm:text-xs md:text-sm transition-colors whitespace-nowrap"
                  style={{ color: "rgba(225, 224, 204, 0.8)" }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = "#E1E0CC")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = "rgba(225, 224, 204, 0.8)")
                  }
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <motion.div
          className="hidden md:flex absolute top-6 left-6 z-20 items-center gap-3 bg-black/55 backdrop-blur-md rounded-full p-2 lg:pr-5"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <img
            src="/photos/logo-casona.jpg"
            alt="Casona San Martín"
            className="w-12 h-12 lg:w-14 lg:h-14 rounded-full object-cover ring-1 ring-primary/40"
          />
          <span
            className="hidden lg:inline-flex flex-col"
            style={{ color: "#E1E0CC" }}
          >
            <span className="font-serif text-base leading-tight">
              Casona San Martín
            </span>
            <span
              className="text-[10px] uppercase tracking-[0.2em]"
              style={{ color: "#D4A574" }}
            >
              Rinconada de los Andes
            </span>
          </span>
        </motion.div>

        <div className="absolute bottom-0 left-0 right-0 z-10 px-6 md:px-10 pb-6 md:pb-10">
          <div className="grid grid-cols-12 items-end gap-6">
            <div className="col-span-12 lg:col-span-8">
              <h1
                className="font-serif font-medium leading-[0.85] tracking-[-0.04em] text-[22vw] sm:text-[20vw] md:text-[18vw] lg:text-[16vw] xl:text-[15vw]"
                style={{ color: "#E1E0CC" }}
              >
                <WordsPullUp text="Casona San Martín" />
              </h1>
              <motion.p
                className="mt-3 font-serif italic text-base sm:text-lg md:text-xl"
                style={{ color: "#D4A574" }}
                initial={{ y: 12, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{
                  duration: 0.8,
                  delay: 0.4,
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                Rinconada de Los Andes
              </motion.p>
            </div>
            <div className="col-span-12 lg:col-span-4 flex flex-col gap-5 lg:pb-6">
              <motion.p
                className="text-cream/85 text-xs sm:text-sm md:text-base"
                style={{ lineHeight: 1.4 }}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{
                  duration: 0.8,
                  delay: 0.5,
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                Patrimonio histórico en el corazón de Rinconada, Valle de
                Aconcagua. Pizzería, café, moda sustentable y eventos
                culturales — todo en un mismo lugar con carácter e historia.
              </motion.p>
              <motion.a
                href="#contacto"
                className="group inline-flex items-center justify-between gap-2 hover:gap-3 transition-all bg-primary text-black font-medium text-sm sm:text-base rounded-full pl-5 sm:pl-6 pr-1.5 py-1.5 self-start"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{
                  duration: 0.8,
                  delay: 0.7,
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                <span>Reserva tu espacio</span>
                <span className="bg-black rounded-full w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center transition-transform group-hover:scale-110">
                  <ArrowRight
                    className="w-4 h-4 sm:w-5 sm:h-5"
                    style={{ color: "#D4A574" }}
                  />
                </span>
              </motion.a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
