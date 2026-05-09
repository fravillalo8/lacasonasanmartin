import { motion, useInView } from "framer-motion";
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
    blurb: "Llega a La Casona en diciembre",
  },
];

function EventCard({ event, index }: { event: Event; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px", amount: 0.2 });
  return (
    <motion.article
      ref={ref}
      initial={{ y: 30, opacity: 0 }}
      animate={inView ? { y: 0, opacity: 1 } : {}}
      transition={{
        duration: 0.6,
        delay: index * 0.08,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="snap-start shrink-0 w-[260px] sm:w-[300px] md:w-[340px]"
    >
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-[#161616] group">
        <img
          src={event.src}
          alt={event.title}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/0 to-transparent" />
      </div>
      <div className="px-1 mt-4">
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
  return (
    <section
      id="eventos"
      className="relative bg-black py-24 sm:py-32 overflow-hidden"
    >
      <div className="px-4 sm:px-6 mx-auto max-w-7xl mb-10 sm:mb-14">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p
              className="text-[10px] sm:text-xs uppercase tracking-[0.25em] mb-3"
              style={{ color: "#D4A574" }}
            >
              Agenda
            </p>
            <h2
              className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-normal leading-[1.05]"
              style={{ color: "#E1E0CC" }}
            >
              Vive La Casona en <span className="italic">cada estación</span>.
            </h2>
          </div>
          <p className="text-gray-500 text-sm sm:text-base max-w-md">
            Música en vivo, ferias, talleres y celebraciones. Todo el año hay
            algo nuevo bajo nuestros corredores.
          </p>
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
