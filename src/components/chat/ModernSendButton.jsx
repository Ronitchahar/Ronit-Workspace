import { motion } from "framer-motion";
import { ArrowUp } from "lucide-react";

function ModernSendButton({
  onClick,
  disabled = false,
  loading = false,
}) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled || loading}
      className="modern-send-btn"
      aria-label="Send message"
      whileHover={
        !(disabled || loading)
          ? {
              scale: 1.04,
              y: -2,
            }
          : {}
      }
      whileTap={
        !(disabled || loading)
          ? {
              scale: 0.96,
            }
          : {}
      }
      transition={{
        duration: 0.18,
        ease: "easeOut",
      }}
      style={{
        width: "64px",
        height: "64px",
        minWidth: "64px",

        border: "none",
        outline: "none",
        borderRadius: "20px",

        display: "flex",
        alignItems: "center",
        justifyContent: "center",

        cursor:
          disabled || loading
            ? "not-allowed"
            : "pointer",

        position: "relative",
        overflow: "hidden",

        flexShrink: 0,

        background:
          disabled || loading
            ? "rgba(255,255,255,0.06)"
            : "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",

        color: "#ffffff",

        boxShadow:
          disabled || loading
            ? "none"
            : `
                0 10px 30px rgba(59,130,246,0.22),
                0 0 22px rgba(139,92,246,0.18)
              `,

        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",

        transition:
          "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      {/* Glow Overlay */}
      {!disabled && !loading && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.18), transparent)",
            pointerEvents: "none",
          }}
        />
      )}

      {/* Loading State */}
      {loading ? (
        <motion.div
          animate={{
            rotate: 360,
          }}
          transition={{
            repeat: Infinity,
            duration: 1,
            ease: "linear",
          }}
          style={{
            width: "22px",
            height: "22px",
            border: "2px solid rgba(255,255,255,0.35)",
            borderTop: "2px solid #ffffff",
            borderRadius: "50%",
          }}
        />
      ) : (
        <ArrowUp
          size={24}
          strokeWidth={3}
          style={{
            opacity: disabled ? 0.35 : 1,
            position: "relative",
            zIndex: 2,
          }}
        />
      )}
    </motion.button>
  );
}

export default ModernSendButton;
