import { validDate, validWorkout, type Workout } from './workouts';

export type WorkoutStorage = 'account' | 'device';
const key = 'recovery-guest-workouts-v1';

function localRows(): Workout[] {
  const raw = window.localStorage.getItem(key);
  if (!raw) return [];
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw Error('이 기기의 운동 기록을 읽을 수 없어요. 브라우저 저장 공간을 확인해 주세요.'); }
  if (!Array.isArray(parsed) || !parsed.every(validWorkout)) throw Error('이 기기의 운동 기록 형식을 확인할 수 없어요.');
  return parsed;
}

function saveLocal(rows: Workout[]) {
  try { window.localStorage.setItem(key, JSON.stringify(rows)); }
  catch { throw Error('이 기기에 운동 기록을 저장하지 못했어요. 브라우저 저장 공간을 확인해 주세요.'); }
}

async function responseBody(response: Response): Promise<{error?: string} | Workout[]> {
  try { return await response.json(); } catch { throw Error('운동 기록 서비스 응답을 확인할 수 없어요.'); }
}

export async function loadWorkouts(date: string, signal?: AbortSignal): Promise<{ rows: Workout[]; storage: WorkoutStorage }> {
  if (!validDate(date)) throw Error('날짜를 확인해 주세요.');
  const response = await fetch(`/api/workouts?date=${encodeURIComponent(date)}`, { signal });
  if (response.status === 401) return { rows: localRows().filter(row => row.date === date).reverse(), storage: 'device' };
  const body = await responseBody(response);
  if (!response.ok) throw Error(!Array.isArray(body) && body.error || '운동 기록을 불러오지 못했어요.');
  if (!Array.isArray(body) || !body.every(validWorkout)) throw Error('운동 기록 형식을 확인할 수 없어요.');
  return { rows: body, storage: 'account' };
}

export async function changeWorkout(method: 'POST' | 'PATCH' | 'DELETE', body: Workout | { id: string; stretched?: boolean }): Promise<WorkoutStorage> {
  const response = await fetch('/api/workouts', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (response.status !== 401) {
    const result = await responseBody(response);
    if (!response.ok) throw Error(!Array.isArray(result) && result.error || '운동 기록을 저장하지 못했어요.');
    return 'account';
  }
  const rows = localRows();
  if (method === 'POST') {
    if (!validWorkout(body)) throw Error('운동 기록의 날짜·종목·횟수를 확인해 주세요.');
    if (!rows.some(row => row.id === body.id)) saveLocal([...rows, body]);
  } else {
    if (!body || typeof body.id !== 'string') throw Error('운동 기록을 확인해 주세요.');
    if (method === 'PATCH') {
      if (typeof body.stretched !== 'boolean') throw Error('스트레칭 여부를 확인해 주세요.');
      saveLocal(rows.map(row => row.id === body.id ? { ...row, stretched: body.stretched! } : row));
    } else saveLocal(rows.filter(row => row.id !== body.id));
  }
  return 'device';
}
