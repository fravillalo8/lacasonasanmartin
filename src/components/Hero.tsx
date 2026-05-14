import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useScroll,
} from "framer-motion";
import { useEffect, useRef } from "react";
import { ArrowRight, ChevronDown } from "lucide-react";

const NAV_ITEMS = [
  { label: "Nuestra Historia", href: "#historia" },
  { label: "Eventos", href: "#eventos" },
  { label: "Locales en la Casona", href: "#emprendedores" },
  { label: "Arriendo de Local", href: "#cotizar" },
  { label: "Contacto", href: "#contacto" },
];

function MaskedWord({
  word,
  delay,
  className = "",
}: {
  word: string;
  delay: number;
  className?: string;
}) {
  return (
    <span
      className={`inline-block overflow-hidden ${className}`}
      style={{ lineHeight: "inherit" }}
    >
      <motion.span
        className="inline-block"
        initial={{ y: "105%", rotateX: -15 }}
        animate={{ y: "0%", rotateX: 0 }}
        transition={{ duration: 1, delay, ease: [0.16, 1, 0.3, 1] }}
      >
        {word}
      </motion.span>
    </span>
  );
}

export default function Hero() {
  const sectionRef = useRef<HTMLElement>(null);

  // Mouse parallax
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const springX = useSpring(rawX, { stiffness: 25, damping: 18 });
  const springY = useSpring(rawY, { stiffness: 25, damping: 18 });
  const imgX = useTransform(springX, [-1, 1], ["-2.5%", "2.5%"]);
  const imgY = useTransform(springY, [-1, 1], ["-2.5%", "2.5%"]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      rawX.set((e.clientX / window.innerWidth - 0.5) * 2);
      rawY.set((e.clientY / window.innerHeight - 0.5) * 2);
    };
    window.addEventListener("mousemove", handler);
    return () => window.removeEventListener("mousemove", handler);
  }, [rawX, rawY]);

  // Hide scroll indicator on scroll
  const { scrollY } = useScroll();
  const indicatorOpacity = useTransform(scrollY, [0, 120], [1, 0]);

  return (
    <>
      {/* Cinematic opening overlay */}
      <motion.div
        className="fixed inset-0 z-[90] bg-black pointer-events-none"
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 1.4, ease: [0.4, 0, 0.2, 1], delay: 0.1 }}
      />

      <section ref={sectionRef} className="h-screen w-full p-4 md:p-6">
        <div className="relative h-full w-full overflow-hidden rounded-2xl md:rounded-[2rem]">

          {/* Parallax image wrapper */}
          <motion.div
            className="absolute inset-[-5%]"
            style={{ x: imgX, y: imgY }}
          >
            <motion.img
              src="/photos/hero.jpg"
              alt="Corredor de Casona San Martín hacia el jardín"
              className="h-full w-full object-cover"
              initial={{ scale: 1.08 }}
              animate={{ scale: 1.18 }}
              transition={{ duration: 22, ease: "easeOut" }}
            />
          </motion.div>

          <div className="noise-overlay pointer-events-none absolute inset-0 opacity-[0.4] mix-blend-overlay" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/60 via-black/10 to-black/90" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/45 via-transparent to-transparent" />

          {/* Ambient glow bottom */}
          <motion.div
            className="pointer-events-none absolute bottom-0 left-0 right-0 h-1/3"
            style={{
              background:
                "radial-gradient(ellipse at 30% 100%, rgba(212,165,116,0.08) 0%, transparent 70%)",
            }}
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Nav — staggered entrance */}
          <nav aria-label="Navegación principal" className="absolute left-1/2 top-0 z-20 -translate-x-1/2 bg-black rounded-b-2xl md:rounded-b-3xl px-4 py-2 md:px-8">
            <ul className="flex gap-3 sm:gap-6 md:gap-10 lg:gap-12">
              {NAV_ITEMS.map((item, i) => (
                <motion.li
                  key={item.href}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.5,
                    delay: 1.3 + i * 0.07,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                >
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
                </motion.li>
              ))}
            </ul>
          </nav>

          {/* Logo badge */}
          <motion.div
            className="hidden md:flex absolute top-6 left-6 z-20 items-center gap-3 bg-black/55 backdrop-blur-md rounded-full p-2 lg:pr-5"
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.9, delay: 1.2, ease: [0.16, 1, 0.3, 1] }}
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

          {/* Content */}
          <div className="absolute bottom-0 left-0 right-0 z-10 px-6 md:px-10 pb-6 md:pb-10">
            <div className="grid grid-cols-12 items-end gap-6">
              <div className="col-span-12 lg:col-span-8">

                {/* Animated line above title */}
                <div className="overflow-hidden mb-4 hidden sm:block">
                  <motion.div
                    className="h-[1px] w-24"
                    style={{ background: "#D4A574", originX: 0 }}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{
                      duration: 0.8,
                      delay: 0.9,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                  />
                </div>

                {/* Title — word-by-word masked reveal */}
                <h1
                  className="font-serif font-medium leading-[0.85] tracking-[-0.04em] text-[22vw] sm:text-[20vw] md:text-[18vw] lg:text-[16vw] xl:text-[15vw] flex flex-wrap gap-x-[0.2em]"
                  style={{ color: "#E1E0CC", perspective: "1000px" }}
                >
                  <MaskedWord word="Casona" delay={0.55} />
                  <MaskedWord word="San" delay={0.68} />
                  <MaskedWord word="Martín" delay={0.78} />
                </h1>

                {/* Subtitle with underline draw */}
                <div className="mt-3 overflow-hidden">
                  <motion.p
                    className="font-serif italic text-base sm:text-lg md:text-xl"
                    style={{ color: "#D4A574" }}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{
                      duration: 0.8,
                      delay: 1.05,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                  >
                    Rinconada de Los Andes
                  </motion.p>
                </div>
              </div>

              <div className="col-span-12 lg:col-span-4 flex flex-col gap-5 lg:pb-6">
                <motion.p
                  className="text-cream/85 text-xs sm:text-sm md:text-base"
                  style={{ lineHeight: 1.4 }}
                  initial={{ y: 24, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{
                    duration: 0.8,
                    delay: 1.15,
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
                  initial={{ y: 24, opacity: 0, scale: 0.97 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  transition={{
                    duration: 0.8,
                    delay: 1.3,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
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

          {/* Scroll indicator */}
          <motion.div
            className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2"
            style={{ opacity: indicatorOpacity }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2.2, duration: 0.8 }}
          >
            <span
              className="text-[9px] uppercase tracking-[0.25em]"
              style={{ color: "rgba(212,165,116,0.6)" }}
            >
              Scroll
            </span>
            <motion.div
              animate={{ y: [0, 7, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            >
              <ChevronDown
                className="w-4 h-4"
                style={{ color: "rgba(212,165,116,0.6)" }}
              />
            </motion.div>
          </motion.div>
        </div>
      </section>
    </>
  );
}
