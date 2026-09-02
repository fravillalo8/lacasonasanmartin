import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Link } from "react-router-dom";
import InstagramIcon from "./icons/InstagramIcon";

type Schedule = {
  brand: string;
  tagline: string;
  logo: string;
  logoBg: string;
  logoFit?: "contain" | "cover";
  rows: { label: string; slots: string[] }[];
  note?: string;
  phone?: string;
  phoneDisplay?: string;
  ig?: string;
  igHandle?: string;
  web?: string;
  page?: string;
};

const SCHEDULES: Schedule[] = [
  {
    brand: "Pizzería Di María",
    tagline: "Pizza artesanal al horno de leña",
    logo: "/photos/logo-dimaria.jpg",
    logoBg: "bg-black",
    logoFit: "contain",
    rows: [
      {
        label: "Lunes a Miércoles",
        slots: ["12:30 — 15:30", "18:30 — 22:00"],
      },
      {
        label: "Jueves a Sábado",
        slots: ["12:30 — 15:30", "18:30 — 23:00"],
      },
    ],
    note: "Domingos: consulta nuestras redes",
    web: "https://pizzeriadimaria.cl/",
  },
  {
    brand: "Emulen Pilates Center",
    tagline: "Clases reformer y mat",
    logo: "/photos/ig-emulen-pilates.jpg",
    page: "/emulen-pilates",
    logoBg: "bg-black",
    logoFit: "cover",
    rows: [
      {
        label: "Lunes",
        slots: ["08:30", "10:00", "18:30", "19:45"],
      },
      {
        label: "Martes",
        slots: ["07:15", "08:30", "10:00", "17:15", "18:30", "19:45"],
      },
    ],
    note: "Miércoles a sábado: agenda completa en Instagram",
    ig: "https://www.instagram.com/emulen.pilates/",
    igHandle: "@emulen.pilates",
  },
  {
    brand: "Punto Origen",
    tagline: "Cafetería de especialidad",
    logo: "/photos/logo-punto-origen.webp",
    logoBg: "bg-[#f5f1e8]",
    logoFit: "contain",
    rows: [
      {
        label: "Apertura",
        slots: ["Próximamente"],
      },
    ],
    note: "Recién llegada a la Casona — pronto carta y horarios.",
    ig: "https://www.instagram.com/cafeteriapuntoorigen/",
    igHandle: "@cafeteriapuntoorigen",
  },
];

function ScheduleCard({
  schedule,
  index,
}: {
  schedule: Schedule;
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const fit = schedule.logoFit ?? "contain";
  return (
    <motion.div
      ref={ref}
      initial={{ y: 30, opacity: 0 }}
      animate={inView ? { y: 0, opacity: 1 } : {}}
      transition={{
        duration: 0.7,
        delay: index * 0.1,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="bg-[#161616] rounded-2xl p-6 sm:p-7 flex flex-col"
    >
      <div className="flex items-center gap-4 mb-5">
        <div
          className={`w-16 h-16 rounded-xl ${schedule.logoBg} flex items-center justify-center ${schedule.logo && fit === "contain" ? "p-2" : ""} overflow-hidden shrink-0`}
        >
          {schedule.logo ? (
            <img
              src={schedule.logo}
              alt={`Logo de ${schedule.brand} — ${schedule.tagline}`}
              loading="lazy"
              className={
                fit === "contain"
                  ? "max-w-full max-h-full object-contain"
                  : "w-full h-full object-cover"
              }
            />
          ) : (
            <span
              className="font-serif text-xl leading-none"
              style={{ color: "#D4A574" }}
            >
              {schedule.brand
                .split(" ")
                .map((w) => w[0])
                .join("")
                .slice(0, 2)}
            </span>
          )}
        </div>
        <div className="min-w-0">
          <h3
            className="font-serif text-lg sm:text-xl leading-tight"
            style={{ color: "#E1E0CC" }}
          >
            {schedule.brand}
          </h3>
          <p
            className="text-xs italic mt-0.5"
            style={{ color: "#D4A574" }}
          >
            {schedule.tagline}
          </p>
        </div>
      </div>

      <div className="space-y-4 flex-1">
        {schedule.rows.map((row) => (
          <div key={row.label}>
            <p
              className="text-[10px] uppercase tracking-[0.22em] mb-2"
              style={{ color: "#D4A574" }}
            >
              {row.label}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {row.slots.map((slot) => (
                <span
                  key={slot}
                  className="px-2.5 py-1 rounded-full bg-white/5 text-xs font-medium tabular-nums"
                  style={{ color: "#E1E0CC" }}
                >
                  {slot}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {schedule.note && (
        <p className="text-xs text-gray-500 italic mt-5">{schedule.note}</p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        {schedule.web && (
          <a
            href={schedule.web}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs group"
            style={{ color: "#D4A574" }}
          >
            <span className="group-hover:underline">pizzeriadimaria.cl</span>
          </a>
        )}
        {schedule.ig && (
          <a
            href={schedule.ig}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Instagram de ${schedule.brand}`}
            className="inline-flex items-center gap-1.5 text-xs group"
            style={{ color: "#D4A574" }}
          >
            <InstagramIcon size={12} />
            <span className="group-hover:underline">
              {schedule.igHandle ?? "Instagram"}
            </span>
          </a>
        )}
        {schedule.phone && (
          <a
            href={`tel:${schedule.phone}`}
            aria-label={`Llamar a ${schedule.brand}: ${schedule.phoneDisplay}`}
            className="inline-flex items-center gap-1.5 text-xs group"
            style={{ color: "#D4A574" }}
          >
            <span className="group-hover:underline">{schedule.phoneDisplay}</span>
          </a>
        )}
        {schedule.page && (
          <Link
            to={schedule.page}
            className="inline-flex items-center gap-1 text-xs group ml-auto"
            style={{ color: "rgba(212,165,116,0.6)" }}
          >
            <span className="group-hover:underline group-hover:text-[#D4A574] transition-colors">Ver página →</span>
          </Link>
        )}
      </div>
    </motion.div>
  );
}

export default function Horarios() {
  return (
    <section id="horarios" className="bg-black py-14 sm:py-20 px-4 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="text-center mb-12 sm:mb-16">
          <p
            className="text-[10px] sm:text-xs uppercase tracking-[0.25em] mb-4"
            style={{ color: "#D4A574" }}
          >
            Horarios
          </p>
          <h2
            className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-normal leading-[1.05]"
            style={{ color: "#E1E0CC" }}
          >
            Cuándo <span className="italic">visitarnos</span>.
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {SCHEDULES.map((s, i) => (
            <ScheduleCard key={s.brand} schedule={s} index={i} />
          ))}
        </div>

        <p className="text-center text-gray-500 text-xs sm:text-sm mt-10 sm:mt-12 max-w-xl mx-auto">
          Algunos locales ajustan sus horarios cada semana.
          Síguenos en{" "}
          <a
            href="https://www.instagram.com/casonasanmartin/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-cream"
            style={{ color: "#D4A574" }}
          >
            @casonasanmartin
          </a>{" "}
          para la agenda actualizada.
        </p>
      </div>
    </section>
  );
}
