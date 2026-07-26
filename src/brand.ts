// Marca del POS, conmuttable por build (Vite env) SIN romper el deploy raíz.
// Default = La Casona San Martín. Para otra instancia (ej. El Luchador), el build
// pasa VITE_BRAND_NAME / VITE_BRAND_SUB / VITE_BRAND_LOGO.
//   VITE_BRAND_NAME="El Luchador" VITE_BRAND_SUB="Restaurant Mexicano" \
//   VITE_BRAND_LOGO="🎭" npx vite build --base=/gastro/
export const BRAND = {
  /** Nombre grande (sistema / restaurante). */
  name: import.meta.env.VITE_BRAND_NAME ?? "MesaControl",
  /** Subtítulo (nombre del local). */
  sub: import.meta.env.VITE_BRAND_SUB ?? "La Casona San Martín",
  /** Emoji del logo (fallback). */
  logo: import.meta.env.VITE_BRAND_LOGO ?? "🍽️",
};
