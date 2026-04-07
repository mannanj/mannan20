import { Header } from '@/components/header';

export default function EpisodesLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      {children}
    </>
  );
}
