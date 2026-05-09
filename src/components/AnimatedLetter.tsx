import { motion, useTransform, type MotionValue } from "framer-motion";

type Props = {
  char: string;
  index: number;
  total: number;
  progress: MotionValue<number>;
};

export default function AnimatedLetter({
  char,
  index,
  total,
  progress,
}: Props) {
  const charProgress = index / total;
  const opacity = useTransform(
    progress,
    [charProgress - 0.1, charProgress + 0.05],
    [0.2, 1],
  );
  return (
    <motion.span style={{ opacity }} className="inline">
      {char === " " ? " " : char}
    </motion.span>
  );
}
