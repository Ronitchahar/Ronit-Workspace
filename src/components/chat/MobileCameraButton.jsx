// import React, { useRef } from "react";
// import { Camera } from "lucide-react";
// import { motion } from "framer-motion";

// /**
//  * MobileCameraButton - Uses native mobile camera capture
//  * Provides simple, reliable camera access on mobile devices
//  * Fallback to native file input capture - no custom video stream
//  */
// export default function MobileCameraButton({
//   onPhotoCapture,
//   disabled = false,
//   onError = null,
// }) {
//   const inputRef = useRef(null);

//   const handleClick = () => {
//     inputRef.current?.click();
//   };

//   const handleFileChange = (e) => {
//     const file = e.target.files?.[0];
//     if (!file) return;

//     try {
//       // Validate file is an image
//       if (!file.type.startsWith('image/')) {
//         if (onError) onError("Please select an image file");
//         return;
//       }

//       // Pass file directly to handler
//       onPhotoCapture(file);
//     } catch (err) {
//       if (onError) onError("Failed to process photo");
//     }

//     // Reset input for next use
//     if (e.target) e.target.value = "";
//   };

//   return (
//     <>
//       <motion.button
//         className="camera-btn chat-action-btn"
//         onClick={handleClick}
//         disabled={disabled}
//         whileHover={{ scale: 1.05 }}
//         whileTap={{ scale: 0.95 }}
//         aria-label="Take a photo"
//         title="Take photo"
//       >
//         <Camera size={18} />
//       </motion.button>
//       
//       {/* Native file input with camera capture */}
//       <input
//         ref={inputRef}
//         type="file"
//         accept="image/*"
//         capture="environment"
//         onChange={handleFileChange}
//         style={{ display: "none" }}
//       />
//     </>
//   );
// }
