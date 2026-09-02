import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, UtensilsCrossed, ShoppingBag, Dumbbell, Palette, Briefcase, HelpCircle, SquareParking, Landmark, TrendingUp, Users } from "lucide-react";

type Beneficio = { title: string; desc: string; Icon: React.ElementType; highlight?: boolean };

const BENEFICIOS: Beneficio[] = [
  { title: "Gran estacionamiento", desc: "Tus clientes llegan y estacionan fácil dentro del predio — algo escaso en la zona.", Icon: SquareParking, highlight: true },
  { title: "Patrimonio único", desc: "Un inmueble colonial reconocido en todo el Valle del Aconcagua.", Icon: Landmark },
  { title: "Alto tránsito", desc: "Sobre la Carretera San Martín, con flujo constante de visitantes.", Icon: TrendingUp },
  { title: "Comunidad", desc: "Emprendimientos que se potencian y clientes fieles que ya vienen.", Icon: Users },
];

type Tipo = {
  id: string;
  label: string;
  desc: string;
  Icon: React.ElementType;
};

const TIPOS: Tipo[] = [
  { id: "gastronomia", label: "Gastronomía", desc: "Café, restorán, bar, heladería…", Icon: UtensilsCrossed },
  { id: "retail", label: "Retail / Tienda", desc: "Moda, diseño, artesanía, librería…", Icon: ShoppingBag },
  { id: "bienestar", label: "Bienestar & Fitness", desc: "Yoga, pilates, masajes, salud…", Icon: Dumbbell },
  { id: "arte", label: "Arte & Cultura", desc: "Galería, taller, estudio creativo…", Icon: Palette },
  { id: "servicios", label: "Servicios", desc: "Estética, peluquería, consultoría…", Icon: Briefcase },
  { id: "otro", label: "Otro", desc: "Cuéntanos tu idea", Icon: HelpCircle },
];

const ADMIN_WA = "5692650514";

export default function CotizarLocal() {
  const [tipo, setTipo] = useState("");
  const [concepto, setConcepto] = useState("");
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [consent, setConsent] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [sent, setSent] = useState(false);

  const isValid =
    tipo && concepto.trim().length > 10 && nombre.trim() && telefono.trim() && consent;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    const tipoLabel = TIPOS.find((t) => t.id === tipo)?.label ?? tipo;
    const msg =
      `Hola, quiero cotizar un local en Casona San Martín.\n\n` +
      `*Tipo de negocio:* ${tipoLabel}\n` +
      `*Qué quiero montar:* ${concepto.trim()}\n` +
      `*Nombre:* ${nombre.trim()}\n` +
      `*Teléfono:* ${telefono.trim()}` +
      (marketing ? `\n*Acepta recibir novedades:* Sí` : ``);
    window.open(`https://wa.me/${ADMIN_WA}?text=${encodeURIComponent(msg)}`, "_blank");
    setSent(true);
  };

  return (
    <section
      id="cotizar"
      className="relative bg-black py-14 sm:py-20 px-4 sm:px-6"
    >
      <div className="bg-noise pointer-events-none absolute inset-0 opacity-[0.12]" />
      <div className="relative mx-auto max-w-5xl">

        {/* Header */}
        <div className="text-center mb-12 sm:mb-16">
          <motion.p
            className="text-[10px] sm:text-xs uppercase tracking-[0.25em] mb-4"
            style={{ color: "#D4A574" }}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            Arriendo de Local
          </motion.p>
          <motion.h2
            className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-normal leading-[1.05]"
            style={{ color: "#E1E0CC" }}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            ¿Quieres instalar tu{" "}
            <span className="italic">negocio aquí</span>?
          </motion.h2>
          <motion.p
            className="mt-4 text-sm sm:text-base text-gray-400 max-w-xl mx-auto"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.15 }}
          >
            Cuéntanos tu proyecto y te cotizamos en menos de 24 horas.
          </motion.p>
        </div>

        {/* Por qué la Casona — argumentos de arriendo */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-12 sm:mb-16">
          {BENEFICIOS.map((b, i) => (
            <motion.div
              key={b.title}
              className={`rounded-2xl border p-4 sm:p-5 ${
                b.highlight
                  ? "border-[#D4A574]/45 bg-[#D4A574]/[0.07]"
                  : "border-white/8 bg-[#111111]"
              }`}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
            >
              <b.Icon className="w-5 h-5 mb-3" style={{ color: "#D4A574" }} />
              <p
                className="font-serif text-sm sm:text-base leading-tight mb-1"
                style={{ color: "#E1E0CC" }}
              >
                {b.title}
              </p>
              <p className="text-[11px] sm:text-xs leading-snug text-gray-400">
                {b.desc}
              </p>
            </motion.div>
          ))}
        </div>

        <motion.form
          onSubmit={handleSubmit}
          className="bg-[#111111] rounded-3xl p-6 sm:p-10 space-y-10"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7 }}
        >

          {/* Paso 1: Tipo de negocio */}
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] mb-5" style={{ color: "#D4A574" }}>
              01 · Tipo de negocio
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {TIPOS.map((t) => {
                const active = tipo === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTipo(t.id)}
                    className={`group relative text-left rounded-2xl p-4 sm:p-5 border transition-all duration-200 ${
                      active
                        ? "border-[#D4A574] bg-[#D4A574]/10"
                        : "border-white/8 bg-[#161616] hover:border-white/20 hover:bg-[#1a1a1a]"
                    }`}
                  >
                    <t.Icon
                      className="w-5 h-5 mb-3"
                      style={{ color: active ? "#D4A574" : "#555" }}
                    />
                    <p
                      className="font-serif text-sm sm:text-base leading-tight mb-1"
                      style={{ color: active ? "#E1E0CC" : "#888" }}
                    >
                      {t.label}
                    </p>
                    <p
                      className="text-[11px] leading-tight"
                      style={{ color: active ? "#D4A574" : "#555" }}
                    >
                      {t.desc}
                    </p>
                    {active && (
                      <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-[#D4A574]" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Paso 2: Concepto */}
          <div>
            <label
              htmlFor="concepto"
              className="block text-[10px] uppercase tracking-[0.22em] mb-3"
              style={{ color: "#D4A574" }}
            >
              02 · ¿Qué quieres montar?
            </label>
            <textarea
              id="concepto"
              rows={4}
              placeholder="Describe tu concepto: qué ofreces, quiénes son tus clientes, qué espacio necesitas…"
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              className="w-full rounded-2xl bg-[#161616] border border-white/8 px-5 py-4 text-sm sm:text-base resize-none placeholder-gray-600 outline-none transition-colors focus:border-[#D4A574]/50"
              style={{ color: "#E1E0CC" }}
            />
          </div>

          {/* Paso 3: Datos de contacto */}
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] mb-4" style={{ color: "#D4A574" }}>
              03 · Tus datos
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="nombre" className="block text-xs text-gray-500 mb-2">
                  Nombre
                </label>
                <input
                  id="nombre"
                  type="text"
                  placeholder="Tu nombre o empresa"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full rounded-2xl bg-[#161616] border border-white/8 px-5 py-4 text-sm sm:text-base placeholder-gray-600 outline-none transition-colors focus:border-[#D4A574]/50"
                  style={{ color: "#E1E0CC" }}
                />
              </div>
              <div>
                <label htmlFor="telefono" className="block text-xs text-gray-500 mb-2">
                  WhatsApp / Teléfono
                </label>
                <input
                  id="telefono"
                  type="tel"
                  placeholder="+56 9 XXXX XXXX"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  className="w-full rounded-2xl bg-[#161616] border border-white/8 px-5 py-4 text-sm sm:text-base placeholder-gray-600 outline-none transition-colors focus:border-[#D4A574]/50"
                  style={{ color: "#E1E0CC" }}
                />
              </div>
            </div>
          </div>

          {/* Consentimiento — Ley 19.628 / Ley 21.719 */}
          <div className="space-y-3 border-t border-white/5 pt-6">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-[#D4A574]"
              />
              <span className="text-xs leading-relaxed text-gray-400">
                Autorizo a Casona San Martín a tratar los datos que entrego en este
                formulario con la única finalidad de contactarme y responder mi solicitud
                de cotización de local. He leído la{" "}
                <a
                  href="/politica-privacidad.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                  style={{ color: "#D4A574" }}
                >
                  Política de Privacidad
                </a>
                . <span style={{ color: "#D4A574" }}>*</span>
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={marketing}
                onChange={(e) => setMarketing(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-[#D4A574]"
              />
              <span className="text-xs leading-relaxed text-gray-500">
                (Opcional) Quiero recibir novedades, eventos y promociones de la Casona
                San Martín. Puedo revocar este consentimiento cuando quiera.
              </span>
            </label>
          </div>

          {/* Submit */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 pt-2">
            <p className="text-xs text-gray-600 max-w-xs">
              Te contactaremos por WhatsApp para agendar una visita y entregarte la cotización.
            </p>
            <button
              type="submit"
              disabled={!isValid}
              className="group inline-flex items-center justify-between gap-2 bg-primary text-black font-medium text-sm sm:text-base rounded-full pl-6 pr-1.5 py-1.5 transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:gap-3 self-start sm:self-auto shrink-0"
            >
              <span>{sent ? "¡Mensaje enviado!" : "Enviar y reservar mi visita"}</span>
              <span className="bg-black rounded-full w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center transition-transform group-hover:scale-110 group-disabled:group-hover:scale-100">
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: "#D4A574" }} />
              </span>
            </button>
          </div>

        </motion.form>
      </div>
    </section>
  );
}
