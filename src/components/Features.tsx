import { motion, useInView } from "framer-motion";
import { useRef } from "react";
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
    name: "Emporio 79",
    tagline: "Productos del valle y conveniencia",
    logo: "/photos/logo-emporio79.jpg",
    logoBg: "bg-[#3a1f5d]",
    logoFit: "contain",
    items: [
      "Minimarket de conveniencia",
      "Productos locales y artesanales",
      "Vinos del valle de Aconcagua",
    ],
  },
  {
    number: "03",
    name: "Recircula Blue Point",
    tagline: "Moda circular que inspira",
    logo: "/photos/logo-recircula.jpg",
    logoBg: "bg-[#f3eee5]",
    logoFit: "contain",
    items: [
      "Tienda de moda sustentable",
      "Prendas únicas con curaduría",
      "Lunes a sábado · 10:30 – 20:00",
    ],
    href: "https://www.instagram.com/recircula_blue_point/",
  },
  {
    number: "04",
    name: "Tiempo de Cosecha",
    tagline: "Vinos y cocina del valle",
    logo: "/photos/logo-tiempodecosecha.png",
    logoBg: "bg-black",
    logoFit: "contain",
    items: [
      "Selección de vinos del valle",
      "Cocina con producto local",
      "Lunes a sábado · hasta 21:00",
    ],
    href: "https://www.tiempocosecha.cl/",
  },
  {
    number: "05",
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
    href: "https://www.instagram.com/emulen.pilates/",
  },
  {
    number: "06",
    name: "RocHelo",
    tagline: "Cafetería y heladería",
    logo: "/photos/logo-rochelo.jpg",
    logoBg: "bg-[#f5f9fa]",
    logoFit: "contain",
    items: [
      "Café de especialidad",
      "Helados artesanales",
      "Postres y dulces caseros",
    ],
    href: "https://www.instagram.com/rochelo/",
  },
  {
    number: "07",
    name: "Andes Car Wash",
    tagline: "Auto lavado profesional",
    logo: "/photos/logo-andescarwash.png",
    logoBg: "bg-[#0f1726]",
    logoFit: "contain",
    items: [
      "Lavado completo y detailing",
      "Lun a jue · 10:30 – 18:30",
      "Vie y sáb · 10:30 – 20:30",
    ],
    href: "https://www.instagram.com/andes_carwashcl/",
  },
  {
    number: "08",
    name: "Hylba de Paiva · Fitness",
    tagline: "Gimnasia localizada brasileña",
    logo: "/photos/logo-hylba.jpg",
    logoBg: "bg-[#2a2a2a]",
    logoFit: "cover",
    items: [
      "5 horarios semanales",
      "12 clases mensuales · $55.000",
      "AM lun-mié-vie · PM mar-jue",
    ],
    href: "https://www.instagram.com/hylbadepaiva.fitnesscoach45/",
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
      <div
        className={`w-full aspect-[4/3] rounded-xl ${brand.logoBg} flex items-center justify-center ${brand.logoFit === "contain" ? "p-5" : ""} mb-5 overflow-hidden`}
      >
        <img
          src={brand.logo}
          alt={brand.name}
          className={`${brand.logoFit === "contain" ? "max-w-full max-h-full object-contain" : "w-full h-full object-cover"}`}
        />
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
      <a
        href={brand.href ?? "#"}
        target={brand.href ? "_blank" : undefined}
        rel={brand.href ? "noopener noreferrer" : undefined}
        className="mt-5 inline-flex items-center gap-2 text-xs sm:text-sm group"
        style={{ color: "#D4A574" }}
      >
        Conoce más
        <ArrowRight
          className="w-4 h-4 transition-transform group-hover:translate-x-1"
          style={{ transform: "rotate(-45deg)" }}
        />
      </a>
    </Card>
  );
}

export default function Features() {
  return (
    <section
      id="emprendedores"
      className="relative bg-black py-24 sm:py-32 px-4 sm:px-6"
    >
      <div className="bg-noise pointer-events-none absolute inset-0 opacity-[0.15]" />
      <div className="relative mx-auto max-w-7xl">
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16 font-serif text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-normal leading-[1.1]">
          <WordsPullUpMultiStyle
            segments={[
              {
                text: "Ocho emprendimientos. Un mismo patio colonial.",
                className: "text-cream",
              },
              {
                text: "Cada marca con su historia. Toda La Casona como hogar.",
                className: "italic text-gray-500",
              },
            ]}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
          {BRANDS.map((brand, i) => (
            <BrandCard key={brand.number} brand={brand} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
