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
    [charProgress - 0.12, charProgress + 0.04],
    [0.55, 1],
  );
  return (
    <motion.span style={{ opacity }} className="inline">
      {char === " " ? " " : char}
    </motion.span>
  );
}
