import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: '리커버리 | 운동 후 나에게 맞는 스트레칭',
  description: '운동을 검색하고 사용 근육에 맞는 스트레칭을 사진과 한국어 방법으로 확인하세요.',
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="ko"><body>{children}</body></html>;
}
