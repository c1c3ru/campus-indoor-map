import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Campus · Mapa indoor', description: 'Explore os setores do prédio da administração.' };
export default function Layout({ children }: { children: React.ReactNode }) {
 return <html lang="pt-BR"><body>{children}</body></html>;
}
