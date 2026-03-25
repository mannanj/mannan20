'use client';

interface AnimatedTextProps {
  text: string;
  charDelay?: number;
}

export function AnimatedText({ text, charDelay = 0.04 }: AnimatedTextProps) {
  return (
    <span>
      {text.split('').map((char, i) => (
        <span
          key={i}
          style={{
            animation: 'dotColor 1.5s infinite',
            animationDelay: `${i * charDelay}s`,
          }}
        >
          {char}
        </span>
      ))}
    </span>
  );
}
