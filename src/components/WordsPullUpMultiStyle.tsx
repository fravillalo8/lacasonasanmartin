import { motion, useInView } from "framer-motion";
import { useRef } from "react";

type Segment = { text: string; className?: string };

type Props = {
  segments: Segment[];
  className?: string;
};

export default function WordsPullUpMultiStyle({
  segments,
  className = "",
}: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  const flat: { word: string; className?: string }[] = [];
  segments.forEach((seg) => {
    seg.text
      .split(" ")
      .filter(Boolean)
      .forEach((word) => {
        flat.push({ word, className: seg.className });
      });
  });

  return (
    <span
      ref={ref}
      className={`inline-flex flex-wrap justify-center ${className}`}
    >
      {flat.map((item, i) => (
        <motion.span
          key={`${item.word}-${i}`}
          className={`inline-block whitespace-pre ${item.className ?? ""}`}
          initial={{ y: 20, opacity: 0 }}
          animate={inView ? { y: 0, opacity: 1 } : {}}
          transition={{
            duration: 0.6,
            delay: i * 0.08,
            ease: [0.16, 1, 0.3, 1],
          }}
        >
          {item.word}
          {i < flat.length - 1 && " "}
        </motion.span>
      ))}
    </span>
  );
}
