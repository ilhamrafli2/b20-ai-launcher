import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'B20 AI Launcher',
  description: 'Prompt-to-B20 launcher for Base',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}