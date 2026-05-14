import { motion } from "framer-motion";
import { ArrowUpRight, MapPin, Phone, Clock } from "lucide-react";
import InstagramIcon from "./icons/InstagramIcon";

const ADDRESS_LINE_1 = "Carretera San Martín 421, Paradero 10";
const ADDRESS_LINE_2 = "Rinconada de los Andes · Valle de Aconcagua";
const MAPS_QUERY = encodeURIComponent(
  "Casona San Martín, Carretera San Martín 421, Rinconada de los Andes, Chile",
);
const MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${MAPS_QUERY}`;

const PHONES = [
  {
    label: "Administración Casona",
    tel: "+5692650514",
    display: "+56 9 2650 514",
  },
];

export default function Contacto() {
  return (
    <section
      id="contacto"
      className="relative bg-black py-14 sm:py-20 px-4 sm:px-6 overflow-hidden"
    >
      <div className="bg-noise pointer-events-none absolute inset-0 opacity-[0.12]" />
      <div className="relative mx-auto max-w-6xl">
        <div className="text-center mb-12 sm:mb-16">
          <motion.p
            className="text-[10px] sm:text-xs uppercase tracking-[0.25em] mb-4"
            style={{ color: "#D4A574" }}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            Contacto
          </motion.p>
          <motion.h2
            className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-normal leading-[1.05]"
            style={{ color: "#E1E0CC" }}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            Te esperamos en <span className="italic">Rinconada</span>.
          </motion.h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 lg:gap-5">
          <motion.a
            href={MAPS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative lg:col-span-3 rounded-2xl overflow-hidden bg-[#161616] aspect-[4/3] sm:aspect-[16/10] lg:aspect-auto lg:min-h-[420px]"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7 }}
          >
            <img
              src="/photos/ig-emprendedores.jpg"
              alt="Patio colonial de La Casona San Martín en Rinconada de Los Andes, Valle de Aconcagua"
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
            <div className="absolute top-5 left-5 right-5 flex items-center justify-between">
              <span
                className="text-[10px] uppercase tracking-[0.25em] font-medium px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md"
                style={{ color: "#D4A574" }}
              >
                Rinconada de los Andes
              </span>
            </div>
            <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-3">
              <div>
                <p
                  className="font-serif text-2xl sm:text-3xl md:text-4xl leading-tight mb-1"
                  style={{ color: "#E1E0CC" }}
                >
                  Carretera San Martín 421
                </p>
                <p className="text-xs sm:text-sm text-cream/70">
                  Paradero 10 · Valle de Aconcagua
                </p>
              </div>
              <span className="shrink-0 inline-flex items-center gap-2 bg-primary text-black text-xs sm:text-sm font-medium rounded-full pl-4 pr-1.5 py-1.5 transition-all group-hover:gap-3">
                Cómo llegar
                <span className="bg-black rounded-full w-8 h-8 flex items-center justify-center transition-transform group-hover:scale-110">
                  <ArrowUpRight
                    className="w-4 h-4"
                    style={{ color: "#D4A574" }}
                  />
                </span>
              </span>
            </div>
          </motion.a>

          <motion.div
            className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, delay: 0.15 }}
          >
            <a
              href={MAPS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group bg-[#161616] rounded-2xl p-5 sm:p-6 flex items-start gap-3 hover:bg-[#1a1a1a] transition-colors"
            >
              <MapPin
                className="w-5 h-5 mt-0.5 shrink-0"
                style={{ color: "#D4A574" }}
              />
              <div className="flex-1 min-w-0">
                <p
                  className="text-[10px] uppercase tracking-[0.2em] mb-1.5"
                  style={{ color: "#D4A574" }}
                >
                  Dirección
                </p>
                <p
                  className="font-serif text-sm sm:text-base leading-snug"
                  style={{ color: "#E1E0CC" }}
                >
                  {ADDRESS_LINE_1}
                </p>
                <p className="text-xs sm:text-sm text-gray-400 mt-1">
                  {ADDRESS_LINE_2}
                </p>
              </div>
              <ArrowUpRight
                className="w-4 h-4 shrink-0 mt-0.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                style={{ color: "#D4A574" }}
              />
            </a>

            <a
              href="https://www.instagram.com/casonasanmartin/"
              target="_blank"
              rel="noopener noreferrer"
              className="group bg-[#161616] rounded-2xl p-5 sm:p-6 flex items-start gap-3 hover:bg-[#1a1a1a] transition-colors"
            >
              <span
                className="mt-0.5 shrink-0"
                style={{ color: "#D4A574" }}
              >
                <InstagramIcon size={20} />
              </span>
              <div className="flex-1 min-w-0">
                <p
                  className="text-[10px] uppercase tracking-[0.2em] mb-1.5"
                  style={{ color: "#D4A574" }}
                >
                  Instagram
                </p>
                <p
                  className="font-serif text-sm sm:text-base"
                  style={{ color: "#E1E0CC" }}
                >
                  @casonasanmartin
                </p>
                <p className="text-xs sm:text-sm text-gray-400 mt-1">
                  Eventos, novedades y agenda semanal
                </p>
              </div>
              <ArrowUpRight
                className="w-4 h-4 shrink-0 mt-0.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                style={{ color: "#D4A574" }}
              />
            </a>

            <div className="bg-[#161616] rounded-2xl p-5 sm:p-6 flex items-start gap-3">
              <Phone
                className="w-5 h-5 mt-0.5 shrink-0"
                style={{ color: "#D4A574" }}
              />
              <div className="flex-1 min-w-0">
                <p
                  className="text-[10px] uppercase tracking-[0.2em] mb-2"
                  style={{ color: "#D4A574" }}
                >
                  Teléfonos
                </p>
                <ul className="space-y-2">
                  {PHONES.map((p) => (
                    <li key={p.tel}>
                      <a
                        href={`tel:${p.tel}`}
                        className="block text-sm sm:text-base font-medium hover:underline"
                        style={{ color: "#E1E0CC" }}
                      >
                        {p.display}
                      </a>
                      <span className="text-xs text-gray-500">{p.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <a
              href="#horarios"
              className="group bg-[#161616] rounded-2xl p-5 sm:p-6 flex items-start gap-3 hover:bg-[#1a1a1a] transition-colors"
            >
              <Clock
                className="w-5 h-5 mt-0.5 shrink-0"
                style={{ color: "#D4A574" }}
              />
              <div className="flex-1 min-w-0">
                <p
                  className="text-[10px] uppercase tracking-[0.2em] mb-1.5"
                  style={{ color: "#D4A574" }}
                >
                  Horarios
                </p>
                <p
                  className="font-serif text-sm sm:text-base leading-snug"
                  style={{ color: "#E1E0CC" }}
                >
                  Cada local con horario propio
                </p>
                <p className="text-xs sm:text-sm text-gray-400 mt-1">
                  Pizzería abre martes a sábado · Pilates de lunes a sábado.
                </p>
              </div>
              <ArrowUpRight
                className="w-4 h-4 shrink-0 mt-0.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                style={{ color: "#D4A574" }}
              />
            </a>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
