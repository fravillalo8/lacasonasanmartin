import { motion, useInView } from "framer-motion";
import { useRef } from "react";

type Props = {
  text: string;
  className?: string;
  showAsterisk?: boolean;
  delayBase?: number;
};

export default function WordsPullUp({
  text,
  className = "",
  showAsterisk = false,
  delayBase = 0,
}: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const words = text.split(" ");

  return (
    <span ref={ref} className={`inline-flex flex-wrap ${className}`}>
      {words.map((word, i) => {
        const isLast = i === words.length - 1;
        return (
          <motion.span
            key={`${word}-${i}`}
            className="relative inline-block whitespace-pre"
            initial={{ y: 20, opacity: 0 }}
            animate={inView ? { y: 0, opacity: 1 } : {}}
            transition={{
              duration: 0.6,
              delay: delayBase + i * 0.08,
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            {showAsterisk && isLast ? (
              <>
                {word}
                <span className="absolute top-[0.65em] -right-[0.3em] text-[0.31em]">
                  *
                </span>
              </>
            ) : (
              word
            )}
            {i < words.length - 1 && " "}
          </motion.span>
        );
      })}
    </span>
  );
}
