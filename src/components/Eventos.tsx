import {
  motion,
  useInView,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";
import { useRef } from "react";

type Event = {
  src: string;
  title: string;
  blurb: string;
};

const EVENTS: Event[] = [
  {
    src: "/photos/evento-alfred-newman.jpg",
    title: "Alfred Newman · Bossa Nova",
    blurb: "Música brasileña en vivo",
  },
  {
    src: "/photos/evento-concierto-sonoro.jpg",
    title: "Concierto Sonoro",
    blurb: "Cuencos tibetanos y gongs",
  },
  {
    src: "/photos/evento-funk-soul.jpg",
    title: "Funk y Soul",
    blurb: "Sábados a las 20:00",
  },
  {
    src: "/photos/evento-coro-profesores.jpg",
    title: "Coro de Profesores",
    blurb: "Luis Navarrete Vera, San Felipe",
  },
  {
    src: "/photos/evento-dia-madre.jpg",
    title: "Día de la Madre",
    blurb: "Selección especial de actividades",
  },
  {
    src: "/photos/evento-feria-navidena.jpg",
    title: "Feria Navideña",
    blurb: "Música, juegos y emprendedores",
  },
  {
    src: "/photos/evento-pascuero.jpg",
    title: "El Viejito Pascuero",
    blurb: "Llega a Casona San Martín en diciembre",
  },
];

function EventCard({ event, index }: { event: Event; index: number }) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px", amount: 0.2 });

  // 3D tilt
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 200, damping: 22 });
  const sy = useSpring(y, { stiffness: 200, damping: 22 });
  const rotateX = useTransform(sy, [-0.5, 0.5], [7, -7]);
  const rotateY = useTransform(sx, [-0.5, 0.5], [-7, 7]);
  const brightness = useTransform(sx, [-0.5, 0.5], [0.95, 1.05]);

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const rect = ref.current!.getBoundingClientRect();
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
  };
  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.article
      ref={ref}
      className="snap-start shrink-0 w-[260px] sm:w-[300px] md:w-[340px] cursor-pointer"
      initial={{ y: 40, opacity: 0 }}
      animate={inView ? { y: 0, opacity: 1 } : {}}
      transition={{
        duration: 0.7,
        delay: index * 0.08,
        ease: [0.22, 1, 0.36, 1],
      }}
      style={{
        rotateX,
        rotateY,
        transformPerspective: 700,
        transformStyle: "preserve-3d",
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-[#161616] group">
        <motion.img
          src={event.src}
          alt={event.title}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
          style={{ filter: useTransform(brightness, (v) => `brightness(${v})`) }}
          whileHover={{ scale: 1.06 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/0 to-transparent" />
        {/* Gold shimmer on hover */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(135deg, rgba(212,165,116,0.12) 0%, transparent 50%)",
          }}
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        />
      </div>
      <div className="px-1 mt-4" style={{ transform: "translateZ(20px)" }}>
        <h3
          className="font-serif text-base sm:text-lg leading-tight"
          style={{ color: "#E1E0CC" }}
        >
          {event.title}
        </h3>
        <p
          className="mt-1 text-xs sm:text-sm italic"
          style={{ color: "#D4A574" }}
        >
          {event.blurb}
        </p>
      </div>
    </motion.article>
  );
}

export default function Eventos() {
  const headerRef = useRef<HTMLDivElement>(null);
  const headerInView = useInView(headerRef, { once: true, margin: "-60px" });

  return (
    <section
      id="eventos"
      className="relative bg-black py-24 sm:py-32 overflow-hidden"
    >
      <div
        ref={headerRef}
        className="px-4 sm:px-6 mx-auto max-w-7xl mb-10 sm:mb-14"
      >
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <motion.p
              className="text-[10px] sm:text-xs uppercase tracking-[0.25em] mb-3"
              style={{ color: "#D4A574" }}
              initial={{ opacity: 0, y: 10 }}
              animate={headerInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5 }}
            >
              Agenda
            </motion.p>
            <div className="overflow-hidden">
              <motion.h2
                className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-normal leading-[1.05]"
                style={{ color: "#E1E0CC" }}
                initial={{ y: 40, opacity: 0 }}
                animate={headerInView ? { y: 0, opacity: 1 } : {}}
                transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              >
                Vive Casona San Martín en{" "}
                <span className="italic">cada estación</span>.
              </motion.h2>
            </div>
          </div>
          <motion.p
            className="text-gray-500 text-sm sm:text-base max-w-md"
            initial={{ opacity: 0, y: 10 }}
            animate={headerInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.25 }}
          >
            Música en vivo, ferias, talleres y celebraciones. Todo el año hay
            algo nuevo bajo nuestros corredores.
          </motion.p>
        </div>
      </div>

      <div className="overflow-x-auto snap-x snap-mandatory pb-8 [scrollbar-width:thin]">
        <div className="flex gap-4 sm:gap-6 px-4 sm:px-6 lg:px-12 w-max">
          {EVENTS.map((event, i) => (
            <EventCard key={event.src} event={event} index={i} />
          ))}
          <div className="shrink-0 w-2" aria-hidden />
        </div>
      </div>
    </section>
  );
}
