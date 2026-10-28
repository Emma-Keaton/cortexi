import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'Cortexi - AI Video Synthesis & StykAnimate Workstation',
  description: 'Local-first AI video synthesis workstation with StykAnimate IK rigging, infographics, hyperframes, and neural voiceover.',
  openGraph: {
    title: 'Cortexi - AI Video Synthesis & StykAnimate Workstation',
    description: 'Local-first AI video synthesis workstation with StykAnimate IK rigging, infographics, hyperframes, and neural voiceover.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cortexi - AI Video Synthesis & StykAnimate Workstation',
    description: 'Local-first AI video synthesis workstation with StykAnimate IK rigging, infographics, hyperframes, and neural voiceover.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
