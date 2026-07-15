import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CaloFit — AI asosida ovqatlanishni kuzatish',
  description: 'Ovqat rasmini yuklab, AI orqali kaloriya va makronutrientlarni tahlil qiling.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
