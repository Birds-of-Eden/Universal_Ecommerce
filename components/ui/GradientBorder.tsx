import React from 'react';

interface GradientBorderProps {
  children: React.ReactNode;
  className?: string;
  borderRadius?: string;
  animated?: boolean;
}

function GradientBorder({ 
  children, 
  className = "", 
  borderRadius = "rounded-2xl",
  animated = true 
}: GradientBorderProps) {
  return (
    <>
      <div 
        className={`${borderRadius} ${className} ${animated ? 'animate-border' : ''}`}
        style={{
          background: 'linear-gradient(45deg, #080b11, #172033) padding-box, conic-gradient(from var(--border-angle), #475569 80%, #6366f1 86%, #818cf8 90%, #6366f1 94%, #475569) border-box',
          backgroundClip: 'padding-box, border-box',
          border: '2px solid transparent',
          '--border-angle': '0deg'
        } as React.CSSProperties}
      >
        {children}
      </div>
      {animated && (
        <style dangerouslySetInnerHTML={{
          __html: `
            @supports (property: --border-angle) {
              @property --border-angle {
                inherits: false;
                initial-value: 0deg;
                syntax: '<angle>';
              }
            }

            @keyframes border {
              to { --border-angle: 360deg; }
            }

            .animate-border {
              animation: border 4s linear infinite;
            }
          `
        }} />
      )}
    </>
  );
}

export default GradientBorder;
