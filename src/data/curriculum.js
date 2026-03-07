/** 기존 커리큘럼 데이터 - 마이그레이션 전용 (storage.js에서 import) */

export const MORAL1_CURRICULUM = [
  {
    id: 'm1-1', title: 'Ⅰ. 자신과의 관계',
    subunits: [
      { id: 'm1-1-1', title: '01. 나는 누구인가?' },
      { id: 'm1-1-2', title: '02. 어떤 사람이 도덕적인 사람일까?' },
      { id: 'm1-1-3', title: '03. 행복이란 무엇일까?' },
    ],
  },
  {
    id: 'm1-2', title: 'Ⅱ. 타인과의 관계',
    subunits: [
      { id: 'm1-2-1', title: '01. 가정의 모습은 어떠해야 할까?' },
      { id: 'm1-2-2', title: '02. 우정이 소중한 이유는 무엇일까?' },
      { id: 'm1-2-3', title: '03. 가상공간에서 타인을 어떻게 대해야 할까?' },
    ],
  },
  {
    id: 'm1-3', title: 'Ⅲ. 사회·공동체와의 관계',
    subunits: [
      { id: 'm1-3-1', title: '01. 인권은 왜 소중한가?' },
      { id: 'm1-3-2', title: '02. 다양한 문화와 어떻게 공존할까?' },
      { id: 'm1-3-3', title: '03. 통일은 어떤 의미가 있을까?' },
    ],
  },
  {
    id: 'm1-4', title: 'Ⅳ. 자연과의 관계',
    subunits: [
      { id: 'm1-4-1', title: '01. 도덕적 고려의 대상은 어디까지일까?' },
      { id: 'm1-4-2', title: '02. 생명체는 왜 소중한가?' },
    ],
  },
]

export const MORAL2_CURRICULUM = [
  {
    id: 'm2-1', title: 'Ⅰ. 타인과의 관계',
    subunits: [
      { id: 'm2-1-1', title: '1. 정보 통신 윤리' },
      { id: 'm2-1-2', title: '2. 평화적 갈등 해결' },
      { id: 'm2-1-3', title: '3. 폭력의 문제' },
    ],
  },
  {
    id: 'm2-2', title: 'Ⅱ. 사회·공동체와의 관계',
    subunits: [
      { id: 'm2-2-1', title: '1. 도덕적 시민' },
      { id: 'm2-2-2', title: '2. 사회 정의' },
      { id: 'm2-2-3', title: '3. 북한 이해' },
      { id: 'm2-2-4', title: '4. 통일 윤리 의식' },
    ],
  },
  {
    id: 'm2-3', title: 'Ⅲ. 자연·초월과의 관계',
    subunits: [
      { id: 'm2-3-1', title: '1. 자연관' },
      { id: 'm2-3-2', title: '2. 과학과 윤리' },
      { id: 'm2-3-3', title: '3. 삶의 소중함' },
      { id: 'm2-3-4', title: '4. 마음의 평화' },
    ],
  },
]

/** storage.js 마이그레이션에서 사용 */
export function findSubunitInfo(curriculum, subunitId) {
  for (const unit of curriculum) {
    const sub = unit.subunits.find((s) => s.id === subunitId)
    if (sub) return { unit, sub }
  }
  return null
}

/** 아래 함수들은 더 이상 사용하지 않음 (no-op) */
export function setActiveCurricula() {}
export function getCurriculumForGrade() { return [] }
export function getAllSubunits() { return [] }
export function getTotalSubunits() { return 0 }
