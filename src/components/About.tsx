import { useRef } from "react";
import { motion, useScroll } from "framer-motion";
import WordsPullUpMultiStyle from "./WordsPullUpMultiStyle";
import AnimatedLetter from "./AnimatedLetter";

const PARAGRAPH =
  "Este edificio ha sido testigo de la historia de Rinconada de Los Andes. Hoy, restaurada con respeto a su arquitectura colonial, Casona San Martín reúne pizzería, café, moda sustentable y eventos culturales en un mismo lugar.";

export default function About() {
  const ref = useRef<HTMLParagraphElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.8", "end 0.2"],
  });

  const words = PARAGRAPH.split(" ");
  const totalChars = PARAGRAPH.length;

  return (
    <section id="historia" className="bg-black py-24 sm:py-32 px-4 sm:px-6">
      <div className="bg-[#101010] mx-auto max-w-6xl rounded-3xl px-6 sm:px-10 py-16 sm:py-24 text-center">
        <motion.div
          className="relative mx-auto mb-8 sm:mb-12 w-36 h-36 sm:w-44 sm:h-44 md:w-52 md:h-52"
          initial={{ opacity: 0, scale: 0.85 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        >
          <motion.div
            className="absolute -inset-2 rounded-full bg-primary/20 blur-2xl"
            animate={{ opacity: [0.4, 0.7, 0.4], scale: [1, 1.05, 1] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute -inset-1 rounded-full"
            style={{
              background:
                "conic-gradient(from 0deg, #D4A574, #C1614A, #D4A574)",
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
          />
          <img
            src="/photos/logo-casona.jpg"
            alt="Casona San Martín · Rinconada de Los Andes"
            className="relative w-full h-full rounded-full object-cover ring-2 ring-black"
          />
        </motion.div>

        <p
          className="text-[10px] sm:text-xs uppercase tracking-[0.25em] mb-8 sm:mb-12"
          style={{ color: "#D4A574" }}
        >
          Patrimonio Histórico
        </p>

        <h2
          className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl max-w-3xl mx-auto leading-[0.95] sm:leading-[0.9] mb-10 sm:mb-14"
          style={{ color: "#E1E0CC" }}
        >
          <WordsPullUpMultiStyle
            segments={[
              {
                text: "Ubicados en el corazón de Rinconada,",
                className: "font-normal",
              },
              {
                text: "Valle de Aconcagua.",
                className: "italic",
              },
              {
                text: "Un espacio donde la tradición colonial se encuentra con el emprendimiento moderno.",
                className: "font-normal",
              },
            ]}
          />
        </h2>

        <p
          ref={ref}
          className="max-w-2xl mx-auto text-xs sm:text-sm md:text-base leading-relaxed"
          style={{ color: "#DEDBC8" }}
        >
          {words.map((word, wIdx) => {
            const charsBefore = words
              .slice(0, wIdx)
              .reduce((sum, w) => sum + w.length + 1, 0);
            return (
              <span key={wIdx} className="inline-block whitespace-pre">
                {word.split("").map((char, cIdx) => (
                  <AnimatedLetter
                    key={cIdx}
                    char={char}
                    index={charsBefore + cIdx}
                    total={totalChars}
                    progress={scrollYProgress}
                  />
                ))}
                {wIdx < words.length - 1 ? " " : ""}
              </span>
            );
          })}
        </p>
      </div>
    </section>
  );
}
