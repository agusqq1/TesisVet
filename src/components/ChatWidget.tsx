import React, { useState, useRef, useEffect } from "react";
import {
  MessageCircle,
  X,
  Send,
  Sparkles,
  Bot,
  RotateCcw,
  Calendar,
  FileText,
  Clock,
  MapPin,
  ChevronDown,
} from "lucide-react";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: string;
  source?: "gemini-ai" | "clinical-knowledge-base";
  actionButtons?: Array<{
    label: string;
    path: string;
    icon?: string;
  }>;
}

interface ChatWidgetProps {
  navigate: (path: string) => void;
}

const QUICK_PROMPTS = [
  {
    label: "🍽️ Ayuno para ecografía",
    prompt: "¿Cómo debo preparar a mi mascota y cuánto tiempo de ayuno necesita para una ecografía?",
  },
  {
    label: "💉 Vacunación de cachorros/gatitos",
    prompt: "¿Qué vacunas necesita un cachorro o gatito y a qué edad se aplican?",
  },
  {
    label: "📍 Horarios y sede Del Viso",
    prompt: "¿Cuáles son los horarios de atención y la dirección de la clínica en Del Viso?",
  },
  {
    label: "❤️ Turnos para Cardiografía / Rayos X",
    prompt: "¿Cómo se coordinan los turnos de cardiografía, Doppler y radiología digital?",
  },
  {
    label: "📅 ¿Cómo saco un turno online?",
    prompt: "¿Cómo puedo sacar un turno para mi mascota desde la web?",
  },
];

export const ChatWidget: React.FC<ChatWidgetProps> = ({ navigate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(1);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const initialGreeting: ChatMessage = {
    id: "init-1",
    role: "assistant",
    text: `¡Hola! 🐾 Soy **VetBot**, el asistente clínico inteligente de **VetAnimal Del Viso**.\n\nPodés consultarme dudas simples sobre:\n• **Preparación para estudios** (ayuno para ecografías o análisis de sangre)\n• **Plan de vacunas y desparasitación** para perros y gatos\n• **Horarios, guardia y ubicación** en Del Viso y centro de Tortuguitas\n• **Turnos clínicos o especializados** (Cardiografía, Ecodoppler, Rayos X)\n\n¿En qué te puedo ayudar hoy?`,
    timestamp: "Ahora",
    source: "clinical-knowledge-base",
    actionButtons: [
      { label: "Sacar Turno", path: "/booking", icon: "calendar" },
      { label: "Ver Historial", path: "/historial", icon: "file" },
    ],
  };

  const [messages, setMessages] = useState<ChatMessage[]>([initialGreeting]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isLoading]);

  const detectActionButtons = (text: string) => {
    const actions: Array<{ label: string; path: string; icon?: string }> = [];
    const lower = text.toLowerCase();

    if (lower.includes("turno") || lower.includes("agendar") || lower.includes("reservar") || lower.includes("/booking")) {
      actions.push({ label: "Sacar Turno", path: "/booking", icon: "calendar" });
    }
    if (lower.includes("cardio") || lower.includes("doppler") || lower.includes("rayos") || lower.includes("especializ")) {
      actions.push({ label: "Turno Especializado", path: "/booking?tipo=especializado", icon: "calendar" });
    }
    if (lower.includes("historial") || lower.includes("expediente") || lower.includes("radiograf") || lower.includes("/historial")) {
      actions.push({ label: "Ver Historial", path: "/historial", icon: "file" });
    }
    if (lower.includes("tienda") || lower.includes("alimento") || lower.includes("farmacia") || lower.includes("/tienda")) {
      actions.push({ label: "Ir a Tienda", path: "/tienda", icon: "shop" });
    }

    // Filtrar duplicados por path
    return actions.filter((v, i, a) => a.findIndex((t) => t.path === v.path) === i);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputValue).trim();
    if (!query || isLoading) return;

    const userMsg: ChatMessage = {
      id: "usr-" + Date.now(),
      role: "user",
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setIsLoading(true);

    try {
      // Tomar contexto de conversación reciente
      const historyPayload = messages.slice(-5).map((m) => ({
        role: m.role,
        content: m.text,
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: query,
          history: historyPayload,
        }),
      });

      const data = await res.json();
      const replyText = data.reply || data.error || "Disculpá, no pude procesar la respuesta en este momento.";
      const actionButtons = detectActionButtons(replyText);

      const botMsg: ChatMessage = {
        id: "bot-" + Date.now(),
        role: "assistant",
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        source: data.source || "clinical-knowledge-base",
        actionButtons: actionButtons.length > 0 ? actionButtons : undefined,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      console.error("Error al enviar mensaje:", err);
      const fallbackMsg: ChatMessage = {
        id: "bot-" + Date.now(),
        role: "assistant",
        text: "🐾 Disculpá, tuvimos un inconveniente de red. Si es una urgencia, recordá comunicarte directamente con la clínica al (02320) 47-1234.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        source: "clinical-knowledge-base",
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        ...initialGreeting,
        id: "init-" + Date.now(),
        timestamp: "Ahora",
      },
    ]);
  };

  const renderFormattedText = (text: string) => {
    // Parser simple y seguro para negritas (**texto**), viñetas (•) y saltos de línea
    const lines = text.split("\n");
    return lines.map((line, lineIdx) => {
      const trimmed = line.trim();
      if (!trimmed) {
        return <div key={lineIdx} className="h-2" />;
      }

      // Procesar negrita dentro de la línea
      const parts = line.split(/(\*\*[^*]+\*\*)/g);

      return (
        <div key={lineIdx} className="leading-relaxed">
          {parts.map((part, pIdx) => {
            if (part.startsWith("**") && part.endsWith("**")) {
              return (
                <strong key={pIdx} className="font-semibold text-slate-900">
                  {part.slice(2, -2)}
                </strong>
              );
            }
            return <span key={pIdx}>{part}</span>;
          })}
        </div>
      );
    });
  };

  return (
    <aside aria-label="Asistente de chat VetAnimal" className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Ventana de Chat */}
      {isOpen && (
        <div
          id="vetanimal-chatbox-window"
          className="w-[360px] sm:w-[410px] h-[580px] max-h-[85vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden mb-3 animate-in fade-in slide-in-from-bottom-5 duration-200"
          style={{ boxShadow: "0 20px 40px -15px rgba(15, 23, 42, 0.25)" }}
        >
          {/* Cabecera del Chat */}
          <div className="bg-gradient-to-r from-brand-700 via-brand-600 to-brand-700 p-4 text-white flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white font-bold shadow-inner">
                  <Bot size={22} className="text-white" />
                </div>
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-brand-700 rounded-full"></span>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-sm leading-tight text-white">VetBot Asistente IA</h3>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-white/20 text-white border border-white/25">
                    <Sparkles size={10} className="mr-0.5" /> Clínico
                  </span>
                </div>
                <p className="text-xs text-brand-100 flex items-center gap-1 mt-0.5">
                  <MapPin size={11} /> VetAnimal Del Viso · En línea
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 text-white/80">
              <button
                type="button"
                onClick={handleResetChat}
                title="Reiniciar conversación"
                className="p-1.5 hover:bg-white/15 rounded-lg transition-colors text-white"
                aria-label="Reiniciar chat"
              >
                <RotateCcw size={16} />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Cerrar chat"
                className="p-1.5 hover:bg-white/15 rounded-lg transition-colors text-white"
                aria-label="Minimizar chat"
              >
                <ChevronDown size={18} />
              </button>
            </div>
          </div>

          {/* Área de Mensajes */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/60">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.role === "user" ? "items-end" : "items-start"
                }`}
              >
                <div className="flex items-start gap-2 max-w-[88%]">
                  {msg.role === "assistant" && (
                    <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center shrink-0 mt-0.5">
                      <Bot size={15} />
                    </div>
                  )}

                  <div
                    className={`rounded-2xl px-3.5 py-2.5 text-sm ${
                      msg.role === "user"
                        ? "bg-brand-600 text-white rounded-tr-none shadow-sm"
                        : "bg-white text-slate-800 border border-slate-200 rounded-tl-none shadow-sm"
                    }`}
                  >
                    {msg.role === "assistant" ? (
                      <div>{renderFormattedText(msg.text)}</div>
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    )}

                    {/* Botones de acción contextuales si corresponden */}
                    {msg.actionButtons && msg.actionButtons.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap gap-1.5">
                        {msg.actionButtons.map((btn, bIdx) => (
                          <button
                            key={bIdx}
                            type="button"
                            onClick={() => {
                              navigate(btn.path);
                              setIsOpen(false);
                            }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 transition-colors shadow-2xs"
                          >
                            {btn.icon === "calendar" && <Calendar size={13} />}
                            {btn.icon === "file" && <FileText size={13} />}
                            {btn.label} →
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-1 px-1">
                  <span>{msg.timestamp}</span>
                  {msg.source === "gemini-ai" && (
                    <span className="flex items-center gap-0.5 text-brand-500 font-medium ml-1">
                      <Sparkles size={9} /> IA
                    </span>
                  )}
                </div>
              </div>
            ))}

            {/* Indicador de escritura */}
            {isLoading && (
              <div className="flex items-start gap-2 max-w-[85%]">
                <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center shrink-0">
                  <Bot size={15} />
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none px-4 py-3 shadow-xs flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-brand-600 animate-bounce"></span>
                  <span className="w-2 h-2 rounded-full bg-brand-600 animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-2 h-2 rounded-full bg-brand-600 animate-bounce [animation-delay:0.4s]"></span>
                  <span className="text-xs text-slate-500 font-medium ml-1.5">
                    VetBot está respondiendo...
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Preguntas frecuentes rápidas (Chips) */}
          <div className="px-3 py-2 bg-white border-t border-slate-100 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
                Consultas rápidas:
              </span>
              {QUICK_PROMPTS.map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendMessage(chip.prompt)}
                  disabled={isLoading}
                  className="text-xs px-2.5 py-1 bg-slate-100 hover:bg-brand-50 hover:text-brand-700 text-slate-700 rounded-full border border-slate-200 transition-colors shrink-0 disabled:opacity-50"
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          {/* Input de Mensaje */}
          <div className="p-3 bg-white border-t border-slate-200">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Escribí tu consulta sobre cuidados, estudios o turnos..."
                disabled={isLoading}
                className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:bg-white transition-all disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || isLoading}
                className="w-10 h-10 rounded-xl bg-brand-600 hover:bg-brand-700 text-white flex items-center justify-center shrink-0 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
                title="Enviar consulta"
                aria-label="Enviar consulta"
              >
                <Send size={16} />
              </button>
            </form>
            <p className="text-[10px] text-slate-400 text-center mt-2 leading-tight">
              Orientación informativa preventiva con IA. Ante una urgencia médica grave, acudí a la clínica presencialmente.
            </p>
          </div>
        </div>
      )}

      {/* Botón Flotante de Activación */}
      <button
        id="vetanimal-chat-button"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`group relative flex items-center gap-2.5 px-4 py-3 rounded-full text-white font-semibold text-sm shadow-xl transition-all duration-300 transform active:scale-95 ${
          isOpen
            ? "bg-slate-800 hover:bg-slate-900"
            : "bg-gradient-to-r from-brand-600 via-brand-700 to-brand-700 hover:from-brand-700 hover:to-brand-800 hover:shadow-brand-500/25"
        }`}
        style={{ boxShadow: "0 10px 25px -5px rgba(37, 99, 235, 0.4)" }}
        aria-label="Abrir asistente de chat"
      >
        <div className="relative">
          {isOpen ? (
            <X size={22} className="text-white" />
          ) : (
            <MessageCircle size={22} className="text-white" />
          )}

          {!isOpen && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 border-2 border-brand-700 rounded-full animate-pulse"></span>
          )}
        </div>

        {!isOpen && (
          <div className="flex items-center gap-1.5">
            <span>Consultá con IA</span>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-white/20 text-white">
              <Sparkles size={11} className="mr-0.5" /> VetBot
            </span>
          </div>
        )}

        {/* Notificación no leída en el botón si está cerrado */}
        {!isOpen && unreadCount > 0 && (
          <span className="absolute -top-1.5 -left-1.5 w-5 h-5 bg-amber-500 text-white text-[11px] font-bold rounded-full flex items-center justify-center border-2 border-white shadow-xs">
            1
          </span>
        )}
      </button>
    </aside>
  );
};
