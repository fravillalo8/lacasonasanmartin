import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check } from "lucide-react";
import WordsPullUpMultiStyle from "./WordsPullUpMultiStyle";

type Brand = {
  number: string;
  name: string;
  tagline: string;
  logo: string;
  logoBg: string;
  logoFit: "contain" | "cover";
  items: string[];
  href?: string;
  page?: string;
  badge?: string;
};

const BRANDS: Brand[] = [
  {
    number: "01",
    name: "Pizzería Di María",
    tagline: "Pizza artesanal al horno de leña",
    logo: "/photos/logo-dimaria.jpg",
    logoBg: "bg-black",
    logoFit: "contain",
    items: [
      "Pizzas artesanales auténticas",
      "Cervezas heladas y tragos",
      "Fútbol en vivo",
    ],
    href: "https://pizzeriadimaria.cl/",
  },
  {
    number: "02",
    name: "Emulen Pilates Center",
    tagline: "Movimiento consciente",
    logo: "/photos/ig-emulen-pilates.jpg",
    logoBg: "bg-black",
    logoFit: "cover",
    items: [
      "Reformer y mat Pilates",
      "Clases personalizadas",
      "Estudio luminoso en patrimonio",
    ],
    page: "/emulen-pilates",
  },
  {
    number: "03",
    name: "Punto Origen",
    tagline: "Cafetería de especialidad",
    logo: "/photos/punto-origen.webp",
    logoBg: "bg-[#1c120a]",
    logoFit: "cover",
    items: [
      "Café de especialidad",
      "Espresso y bebidas de autor",
      "Recién llegada a la Casona",
    ],
    href: "https://www.instagram.com/cafeteriapuntoorigen/",
    badge: "Nuevo",
  },
];

type CardProps = {
  index: number;
  children: React.ReactNode;
  className?: string;
};

function Card({ index, children, className = "" }: CardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial={{ scale: 0.95, opacity: 0 }}
      animate={inView ? { scale: 1, opacity: 1 } : {}}
      transition={{
        duration: 0.7,
        delay: index * 0.08,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={`relative overflow-hidden rounded-2xl ${className}`}
    >
      {children}
    </motion.div>
  );
}

function BrandCard({ brand, index }: { brand: Brand; index: number }) {
  return (
    <Card index={index} className="bg-[#161616] p-6 sm:p-7 flex flex-col h-full">
      {brand.badge && (
        <span
          className="absolute top-3 right-3 z-10 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider"
          style={{ backgroundColor: "#D4A574", color: "#1a120a" }}
        >
          {brand.badge}
        </span>
      )}
      <div
        className={`relative w-full aspect-[4/3] rounded-xl ${brand.logoBg} flex items-center justify-center ${brand.logo && brand.logoFit === "contain" ? "p-5" : ""} mb-5 overflow-hidden`}
      >
        {brand.logo ? (
          <img
            src={brand.logo}
            alt={`Logo de ${brand.name} — ${brand.tagline}, en Casona San Martín, Rinconada de Los Andes`}
            loading="lazy"
            className={`${brand.logoFit === "contain" ? "max-w-full max-h-full object-contain" : "w-full h-full object-cover"}`}
          />
        ) : (
          <span className="flex flex-col items-center gap-1 text-center px-4">
            <span
              className="font-serif text-2xl sm:text-3xl leading-none"
              style={{ color: "#E1E0CC" }}
            >
              {brand.name}
            </span>
            <span
              className="text-[9px] uppercase tracking-[0.3em]"
              style={{ color: "#D4A574" }}
            >
              {brand.tagline}
            </span>
          </span>
        )}
      </div>
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <h3
          className="font-serif text-lg sm:text-xl font-medium leading-tight"
          style={{ color: "#E1E0CC" }}
        >
          {brand.name}
        </h3>
        <span className="text-xs text-gray-500 shrink-0">{brand.number}</span>
      </div>
      <p
        className="text-xs sm:text-sm italic mb-4"
        style={{ color: "#D4A574" }}
      >
        {brand.tagline}
      </p>
      <ul className="flex-1 space-y-2.5">
        {brand.items.map((it) => (
          <li key={it} className="flex items-start gap-2">
            <Check
              className="w-4 h-4 mt-[2px] shrink-0"
              style={{ color: "#D4A574" }}
            />
            <span className="text-gray-400 text-xs sm:text-sm leading-relaxed">
              {it}
            </span>
          </li>
        ))}
      </ul>
      {brand.page ? (
        <Link
          to={brand.page}
          aria-label={`Ver página de ${brand.name}`}
          className="mt-5 inline-flex items-center gap-2 text-xs sm:text-sm group"
          style={{ color: "#D4A574" }}
        >
          Ver página
          <ArrowRight
            className="w-4 h-4 transition-transform group-hover:translate-x-1"
            style={{ transform: "rotate(-45deg)" }}
          />
        </Link>
      ) : (
        <a
          href={brand.href ?? "#"}
          target={brand.href ? "_blank" : undefined}
          rel={brand.href ? "noopener noreferrer" : undefined}
          aria-label={`Conoce más sobre ${brand.name}`}
          className="mt-5 inline-flex items-center gap-2 text-xs sm:text-sm group"
          style={{ color: "#D4A574" }}
        >
          Conoce más
          <ArrowRight
            className="w-4 h-4 transition-transform group-hover:translate-x-1"
            style={{ transform: "rotate(-45deg)" }}
          />
        </a>
      )}
    </Card>
  );
}

export default function Features() {
  return (
    <section
      id="emprendedores"
      className="relative bg-black py-14 sm:py-20 px-4 sm:px-6"
    >
      <div className="bg-noise pointer-events-none absolute inset-0 opacity-[0.15]" />
      <div className="relative mx-auto max-w-7xl">
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16 font-serif text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-normal leading-[1.1]">
          <WordsPullUpMultiStyle
            segments={[
              {
                text: "Tres marcas. Un mismo patio colonial.",
                className: "text-cream",
              },
              {
                text: "Cada una con su historia. La próxima puede ser la tuya.",
                className: "italic text-[#E1E0CC]/70",
              },
            ]}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5 max-w-5xl mx-auto">
          {BRANDS.map((brand, i) => (
            <BrandCard key={brand.number} brand={brand} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
