import { Mic } from "lucide-react";
import { motion } from "framer-motion";

/**
 * VoiceButton - UI trigger for voice input
 * Parent component (InputBar) handles the actual Speech Recognition
 */
function VoiceButton({ onClick, isListening = false, disabled = false }) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      className={`chat-action-btn voice-btn ${isListening ? "listening" : ""}`}
      title={isListening ? "Stop listening" : "Start voice input"}
      aria-label={isListening ? "Stop voice input" : "Start voice input"}
      aria-pressed={isListening}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {isListening ? (
        <motion.div
          animate={{ opacity: [0.5, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
        >
          <Mic size={18} />
        </motion.div>
      ) : (
        <Mic size={18} />
      )}
    </motion.button>
  );
}

export default VoiceButton;
