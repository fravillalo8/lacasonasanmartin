import { motion, useInView, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

const PHOTOS = [
  {
    src: "/photos/corredor-1.jpg",
    alt: "Corredor patrimonial con piso ajedrez",
    span: "lg:col-span-2 lg:row-span-2",
  },
  {
    src: "/photos/ig-emprendedores.jpg",
    alt: "Casona San Martín desde el jardín con bandera chilena",
    span: "",
  },
  {
    src: "/photos/pavellon.jpg",
    alt: "Pavellón con techo de madera",
    span: "",
  },
  {
    src: "/photos/ig-eventos-collage.jpg",
    alt: "Eventos y vida en Casona San Martín",
    span: "",
  },
  {
    src: "/photos/patio.jpg",
    alt: "Patio con sillas y mesas",
    span: "",
  },
];

function Tile({
  photo,
  index,
}: {
  photo: { src: string; alt: string; span: string };
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  // Parallax: image moves slightly as you scroll past
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const imgY = useTransform(scrollYProgress, [0, 1], ["12%", "-12%"]);

  return (
    <motion.div
      ref={ref}
      className={`relative overflow-hidden rounded-2xl group ${photo.span}`}
      initial={{ opacity: 0, y: 40, clipPath: "inset(10% 0 10% 0)" }}
      animate={
        inView
          ? { opacity: 1, y: 0, clipPath: "inset(0% 0 0% 0)" }
          : {}
      }
      transition={{
        duration: 1,
        delay: index * 0.1,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      <motion.img
        src={photo.src}
        alt={photo.alt}
        loading="lazy"
        className="h-full w-full object-cover"
        style={{ y: imgY, scale: 1.25 }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
      {/* Hover shine */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(135deg, rgba(212,165,116,0.08) 0%, transparent 60%)",
        }}
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      />
    </motion.div>
  );
}

export default function Gallery() {
  const headerRef = useRef<HTMLDivElement>(null);
  const headerInView = useInView(headerRef, { once: true, margin: "-60px" });

  return (
    <section className="bg-black py-14 sm:py-20 px-4 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div ref={headerRef} className="mb-10 sm:mb-14 text-center">
          <motion.p
            className="text-[10px] sm:text-xs uppercase tracking-[0.25em] mb-4"
            style={{ color: "#D4A574" }}
            initial={{ opacity: 0, y: 10 }}
            animate={headerInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
          >
            Galería
          </motion.p>
          <div className="overflow-hidden">
            <motion.h2
              className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-normal max-w-3xl mx-auto leading-[1.05]"
              style={{ color: "#E1E0CC" }}
              initial={{ y: 40, opacity: 0 }}
              animate={headerInView ? { y: 0, opacity: 1 } : {}}
              transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            >
              Un siglo de <span className="italic">historia</span> en cada baldosa.
            </motion.h2>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 grid-rows-[200px_200px_200px] sm:grid-rows-[260px_260px_260px] lg:grid-rows-[260px_260px] gap-3">
          {PHOTOS.map((photo, i) => (
            <Tile key={photo.src} photo={photo} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
