import InstagramIcon from "./icons/InstagramIcon";

const NAV = [
  { label: "Nuestra Historia", href: "#historia" },
  { label: "Locales en la Casona", href: "#emprendedores" },
  { label: "Eventos", href: "#eventos" },
  { label: "Contacto", href: "#contacto" },
];

export default function Footer() {
  return (
    <footer className="bg-black border-t border-white/5 py-12 sm:py-14 px-4 sm:px-6">
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

      <div className="mx-auto max-w-7xl mt-10 pt-6 border-t border-white/5 flex flex-col sm:flex-row gap-2 sm:gap-4 sm:items-center sm:justify-between">
        <p className="text-xs text-gray-500">
          © {new Date().getFullYear()} La Casona San Martín · Patrimonio
          histórico
        </p>
        <address className="text-xs text-gray-500 not-italic">
          Carretera San Martín 421, Paradero 10, Rinconada de los Andes
        </address>
      </div>
    </footer>
  );
}
