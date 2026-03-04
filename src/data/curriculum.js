/** 1학년 도덕① - 2022개정 동아출판 (노영준 외) */
export const MORAL1_CURRICULUM = [
  {
    id: 'm1-1',
    title: 'Ⅰ. 자신과의 관계',
    subunits: [
      { id: 'm1-1-1', title: '01. 나는 누구인가?', totalPeriods: 4 },
      { id: 'm1-1-2', title: '02. 어떤 사람이 도덕적인 사람일까?', totalPeriods: 4 },
      { id: 'm1-1-3', title: '03. 행복이란 무엇일까?', totalPeriods: 4 },
    ],
  },
  {
    id: 'm1-2',
    title: 'Ⅱ. 타인과의 관계',
    subunits: [
      { id: 'm1-2-1', title: '01. 가정의 모습은 어떠해야 할까?', totalPeriods: 3 },
      { id: 'm1-2-2', title: '02. 우정이 소중한 이유는 무엇일까?', totalPeriods: 3 },
      { id: 'm1-2-3', title: '03. 가상공간에서 타인을 어떻게 대해야 할까?', totalPeriods: 4 },
    ],
  },
  {
    id: 'm1-3',
    title: 'Ⅲ. 사회·공동체와의 관계',
    subunits: [
      { id: 'm1-3-1', title: '01. 인권은 왜 소중한가?', totalPeriods: 3 },
      { id: 'm1-3-2', title: '02. 다양한 문화와 어떻게 공존할까?', totalPeriods: 4 },
      { id: 'm1-3-3', title: '03. 통일은 어떤 의미가 있을까?', totalPeriods: 4 },
    ],
  },
  {
    id: 'm1-4',
    title: 'Ⅳ. 자연과의 관계',
    subunits: [
      { id: 'm1-4-1', title: '01. 도덕적 고려의 대상은 어디까지일까?', totalPeriods: 3 },
      { id: 'm1-4-2', title: '02. 생명체는 왜 소중한가?', totalPeriods: 3 },
    ],
  },
]

/** 3학년 도덕② - 2015개정 동아출판 (노영준 외) */
export const MORAL2_CURRICULUM = [
  {
    id: 'm2-1',
    title: 'Ⅰ. 타인과의 관계',
    subunits: [
      { id: 'm2-1-1', title: '1. 정보 통신 윤리', totalPeriods: 4 },
      { id: 'm2-1-2', title: '2. 평화적 갈등 해결', totalPeriods: 4 },
      { id: 'm2-1-3', title: '3. 폭력의 문제', totalPeriods: 4 },
    ],
  },
  {
    id: 'm2-2',
    title: 'Ⅱ. 사회·공동체와의 관계',
    subunits: [
      { id: 'm2-2-1', title: '1. 도덕적 시민', totalPeriods: 4 },
      { id: 'm2-2-2', title: '2. 사회 정의', totalPeriods: 4 },
      { id: 'm2-2-3', title: '3. 북한 이해', totalPeriods: 4 },
      { id: 'm2-2-4', title: '4. 통일 윤리 의식', totalPeriods: 4 },
    ],
  },
  {
    id: 'm2-3',
    title: 'Ⅲ. 자연·초월과의 관계',
    subunits: [
      { id: 'm2-3-1', title: '1. 자연관', totalPeriods: 4 },
      { id: 'm2-3-2', title: '2. 과학과 윤리', totalPeriods: 4 },
      { id: 'm2-3-3', title: '3. 삶의 소중함', totalPeriods: 4 },
      { id: 'm2-3-4', title: '4. 마음의 평화', totalPeriods: 4 },
    ],
  },
]

export const CURRICULA = {
  moral1: { label: '도덕① (1학년)', data: MORAL1_CURRICULUM },
  moral2: { label: '도덕② (3학년)', data: MORAL2_CURRICULUM },
}

export function getCurriculumForGrade(grade) {
  return grade === 3 ? MORAL2_CURRICULUM : MORAL1_CURRICULUM
}

export function getAllSubunits(curriculum) {
  return curriculum.flatMap((unit) =>
    unit.subunits.map((sub) => ({
      ...sub,
      unitTitle: unit.title,
      unitId: unit.id,
    }))
  )
}

export function getTotalSubunits(curriculum) {
  return curriculum.reduce((sum, u) => sum + u.subunits.length, 0)
}

export function findSubunitInfo(curriculum, subunitId) {
  for (const unit of curriculum) {
    const sub = unit.subunits.find((s) => s.id === subunitId)
    if (sub) return { unit, sub }
  }
  return null
}
