import React from "react";

function Skeleton({ width = "100%", height = "20px", borderRadius = "4px", style = {} }) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius,
        background: "linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%)",
        backgroundSize: "200% 100%",
        animation: "skeleton-loading 1.5s infinite",
        ...style,
      }}
    />
  );
}

export default Skeleton;
