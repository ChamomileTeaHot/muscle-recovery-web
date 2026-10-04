import reference from './growth-reference.json' with { type: 'json' };

export type GrowthSex = 'male' | 'female';
type LMS = { l: number; m: number; s: number };

// WHO monthly attained-growth references, not a longitudinal prediction model.
export function growthLms(sex: GrowthSex, indicator: 'height' | 'bmi', month: number): LMS {
  if (!['male', 'female'].includes(sex) || !Number.isInteger(month) || month < 61 || month > 228) {
    throw Error('WHO 성장 자료는 생후 61~228개월 범위에서 제공합니다.');
  }
  const row = reference[sex][indicator][month - 61];
  return { l: row[1], m: row[2], s: row[3] };
}

export function growthZ(value: number, { l, m, s }: LMS) {
  return l === 0 ? Math.log(value / m) / s : (Math.pow(value / m, l) - 1) / (l * s);
}

export function growthValue(z: number, { l, m, s }: LMS) {
  return l === 0 ? m * Math.exp(s * z) : m * Math.pow(1 + l * s * z, 1 / l);
}

export function youthGrowthScenario(input: { years: number; months: number; height: number; weight: number; sex: GrowthSex; horizon: number }) {
  const { years, months, height, weight, sex, horizon } = input;
  if (!Number.isInteger(years) || !Number.isInteger(months) || months < 0 || months > 11) {
    throw Error('기준일의 만 나이와 추가 개월 수를 확인해 주세요.');
  }
  const ageMonths = years * 12 + months;
  if (ageMonths < 61 || ageMonths >= 216) throw Error('어린이·청소년 참고선은 만 5세 1개월부터 17세 11개월까지 제공합니다.');
  if (!Number.isFinite(height) || height < 50 || height > 250 || !Number.isFinite(weight) || weight < 5 || weight > 350) {
    throw Error('기준일에 측정한 키(cm)와 체중(kg)을 확인해 주세요.');
  }
  if (![3, 6, 12].includes(horizon) || ageMonths + horizon > 228) throw Error('비교 기간을 3·6·12개월 중에서 선택해 주세요.');
  const bmi = weight / (height / 100) ** 2;
  const heightZ = growthZ(height, growthLms(sex, 'height', ageMonths));
  const bmiZ = growthZ(bmi, growthLms(sex, 'bmi', ageMonths));
  if (![heightZ, bmiZ].every(z => Number.isFinite(z) && Math.abs(z) <= 3)) {
    throw Error('입력값이 이 참고선의 계산 범위(성장 기준 ±3 표준편차)를 벗어났어요. 나이·단위·측정값을 확인해 주세요. 값이 맞다면 보호자와 의료진에게 성장 기록을 확인받으세요.');
  }
  const points = Array.from({ length: horizon + 1 }, (_, month) => {
    const referenceHeight = growthValue(heightZ, growthLms(sex, 'height', ageMonths + month));
    const referenceBmi = growthValue(bmiZ, growthLms(sex, 'bmi', ageMonths + month));
    return { month, height: referenceHeight, weight: referenceBmi * (referenceHeight / 100) ** 2, measured: month === 0 ? weight : null };
  });
  return { bmi, points };
}
