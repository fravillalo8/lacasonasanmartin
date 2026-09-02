import InstagramIcon from "./icons/InstagramIcon";

declare global {
  interface Window {
    // Definida por public/cookie-consent.js para reabrir el aviso de cookies.
    showCookiePreferences?: () => void;
  }
}

const NAV = [
  { label: "Nuestra Historia", href: "#historia" },
  { label: "Locales en la Casona", href: "#emprendedores" },
  { label: "Eventos", href: "#eventos" },
  { label: "Contacto", href: "#contacto" },
];

export default function Footer() {
  return (
    <footer className="bg-black border-t border-white/5 pt-12 pb-28 sm:py-14 px-4 sm:px-6">
      <div className="mx-auto max-w-7xl flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
        <a href="#" className="flex items-center gap-4">
          <img
            src="/photos/logo-casona.jpg"
            alt="Logo de Casona San Martín, patrimonio histórico en Rinconada de Los Andes"
            loading="lazy"
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover ring-1 ring-primary/30"
          />
          <div>
            <p
              className="font-serif text-lg sm:text-xl leading-tight"
              style={{ color: "#E1E0CC" }}
            >
              La Casona San Martín
            </p>
            <p
              className="text-[10px] uppercase tracking-[0.2em] mt-0.5"
              style={{ color: "#D4A574" }}
            >
              Rinconada de los Andes
            </p>
          </div>
        </a>

        <nav aria-label="Navegación secundaria">
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-xs sm:text-sm">
            {NAV.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  className="transition-colors hover:text-cream"
                  style={{ color: "rgba(225, 224, 204, 0.65)" }}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <a
          href="https://www.instagram.com/casonasanmartin/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm self-start lg:self-auto group"
          style={{ color: "#D4A574" }}
        >
          <InstagramIcon size={16} />
          <span className="group-hover:underline">@casonasanmartin</span>
        </a>
      </div>

      <div className="mx-auto max-w-7xl mt-10 pt-6 border-t border-white/5 flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 sm:items-center sm:justify-between">
          <p className="text-xs text-gray-500">
            © {new Date().getFullYear()} La Casona San Martín · Patrimonio histórico ·{" "}
            <a href="/politica-privacidad.html" className="hover:text-gray-300 transition-colors">Privacidad</a>{" "}·{" "}
            <a href="/terminos.html" className="hover:text-gray-300 transition-colors">Términos</a>{" "}·{" "}
            <button
              type="button"
              onClick={() => window.showCookiePreferences?.()}
              className="hover:text-gray-300 transition-colors underline-offset-2 hover:underline"
            >
              Preferencias de cookies
            </button>
          </p>
          <p className="text-xs text-gray-500">
            Página creada por{" "}
            <a
              href="https://timetomarket.cl"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-gray-300 transition-colors"
            >
              timetomarket.cl
            </a>
          </p>
        </div>
        {/* Identificación del prestador (Ley 19.496 art. 32 · Ley 21.719).
            Reemplazar los placeholders con la razón social y RUT reales. */}
        <address className="text-[11px] text-gray-600 not-italic leading-relaxed">
          Responsable:{" "}
          <span className="text-gray-500">[RAZÓN SOCIAL POR CONFIRMAR]</span> · RUT:{" "}
          <span className="text-gray-500">[RUT POR CONFIRMAR]</span> · Carretera San Martín 421,
          Paradero 10, Rinconada de los Andes, Región de Valparaíso ·{" "}
          <a
            href="mailto:contacto@lacasonasanmartin.cl"
            className="hover:text-gray-400 transition-colors"
          >
            contacto@lacasonasanmartin.cl
          </a>
        </address>
      </div>
    </footer>
  );
}
