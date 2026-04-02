import type { Metadata } from 'next';
import '@xyflow/react/dist/style.css';

export const metadata: Metadata = {
  title: 'Jordan TreeDiets Canvas',
  robots: { index: false, follow: false },
};

export default function JordanLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen w-screen bg-black text-white overflow-hidden">
      {children}
    </div>
  );
}
