import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: '리커버리 | 스트레칭과 식사 기록',
  description: '운동에 맞는 스트레칭을 확인하고, 먹은 음식의 양에 따라 열량과 영양성분을 기록하세요.',
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="ko"><body>{children}</body></html>;
}
