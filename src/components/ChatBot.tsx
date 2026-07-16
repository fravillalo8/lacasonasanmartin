import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, MessageCircle, Bot } from "lucide-react";

type Message = { role: "user" | "assistant"; content: string };

const CHAT_API = "/chat.php";

const WELCOME: Message = {
  role: "assistant",
  content:
    "¡Hola! Soy el asistente de La Casona San Martín. Puedo ayudarte con horarios de nuestros locales, eventos, cómo llegar, cotización de espacios y más. ¿En qué te puedo ayudar?",
};

const SUGGESTED = [
  "¿Cuáles son los horarios de la pizzería?",
  "¿Cómo llego a la Casona?",
  "¿Qué eventos tienen?",
  "Quiero cotizar un local",
];

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1 py-0.5">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="w-1.5 h-1.5 rounded-full animate-bounce"
          style={{ backgroundColor: "#D4A574", animationDelay: `${delay}ms` }}
        />
      ))}
    </span>
  );
}

function Bubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? "rounded-br-sm text-black font-medium"
            : "rounded-bl-sm"
        }`}
        style={
          isUser
            ? { backgroundColor: "#D4A574" }
            : { backgroundColor: "#1e1e1e", color: "#E1E0CC" }
        }
      >
        {msg.content}
      </div>
    </motion.div>
  );
}

export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    if (isOpen) {
      setHasUnread(false);
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) return;

      const userMsg: Message = { role: "user", content: trimmed };
      const next = [...messages, userMsg];
      setMessages(next);
      setInput("");
      setIsLoading(true);

      try {
        const res = await fetch(CHAT_API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: next }),
        });
        if (!res.ok) throw new Error("API error");
        const { reply } = (await res.json()) as { reply: string };
        const botMsg: Message = { role: "assistant", content: reply };
        setMessages((prev) => [...prev, botMsg]);
        if (!isOpen) setHasUnread(true);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "Lo siento, hubo un error. Por favor contáctanos directamente al +56 9 2650 514 o en @casonasanmartin.",
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [messages, isLoading, isOpen],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    send(input);
  };

  const showSuggestions = messages.length === 1 && !isLoading;

  return (
    <>
      {/* Chat panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="panel"
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 16 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="fixed bottom-[5.5rem] right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] max-w-sm flex flex-col rounded-2xl overflow-hidden shadow-2xl border"
            style={{
              backgroundColor: "#111",
              borderColor: "rgba(255,255,255,0.08)",
              maxHeight: "min(72vh, 560px)",
            }}
          >
            {/* Header */}
            <div
              className="flex items-center gap-3 px-4 py-3 shrink-0 border-b"
              style={{
                backgroundColor: "#181818",
                borderColor: "rgba(255,255,255,0.07)",
              }}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: "#D4A574" }}
              >
                <Bot className="w-4 h-4 text-black" />
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className="font-serif text-sm leading-tight"
                  style={{ color: "#E1E0CC" }}
                >
                  Asistente La Casona
                </p>
                <p className="text-[10px]" style={{ color: "#D4A574" }}>
                  {isLoading ? "Escribiendo…" : "En línea"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
                aria-label="Cerrar chat"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5 min-h-0">
              {messages.map((msg, i) => (
                <Bubble key={i} msg={msg} />
              ))}

              {isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div
                    className="px-3.5 py-2.5 rounded-2xl rounded-bl-sm text-sm"
                    style={{ backgroundColor: "#1e1e1e" }}
                  >
                    <TypingDots />
                  </div>
                </motion.div>
              )}

              {/* Suggestions */}
              {showSuggestions && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {SUGGESTED.map((s) => (
                    <button
                      type="button"
                      key={s}
                      onClick={() => send(s)}
                      className="text-xs px-3 py-1.5 rounded-full border transition-colors hover:bg-white/10"
                      style={{
                        borderColor: "rgba(212,165,116,0.4)",
                        color: "#D4A574",
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <form
              onSubmit={handleSubmit}
              className="flex items-center gap-2 px-3 py-3 shrink-0 border-t"
              style={{ borderColor: "rgba(255,255,255,0.07)" }}
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Escribe tu consulta…"
                disabled={isLoading}
                className="flex-1 bg-white/5 rounded-full px-4 py-2 text-sm outline-none disabled:opacity-50 transition-opacity"
                style={{
                  color: "#E1E0CC",
                  caretColor: "#D4A574",
                }}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center disabled:opacity-40 transition-opacity active:scale-95"
                style={{ backgroundColor: "#D4A574" }}
                aria-label="Enviar mensaje"
              >
                <Send className="w-4 h-4 text-black" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating button */}
      <motion.button
        onClick={() => setIsOpen((v) => !v)}
        className="fixed bottom-4 sm:bottom-6 right-4 sm:right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-xl"
        style={{ backgroundColor: "#D4A574" }}
        whileHover={{ scale: 1.07 }}
        whileTap={{ scale: 0.93 }}
        aria-label={isOpen ? "Cerrar asistente" : "Abrir asistente"}
      >
        <AnimatePresence mode="wait" initial={false}>
          {isOpen ? (
            <motion.span
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              <X className="w-6 h-6 text-black" />
            </motion.span>
          ) : (
            <motion.span
              key="open"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              <MessageCircle className="w-6 h-6 text-black" />
            </motion.span>
          )}
        </AnimatePresence>

        {/* Unread badge */}
        <AnimatePresence>
          {hasUnread && !isOpen && (
            <motion.span
              key="badge"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 flex items-center justify-center text-[9px] text-white font-bold"
            >
              1
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </>
  );
}
