/**
 * 2026학년도 1학기 도덕 시간표
 * dayOfWeek: 0=일, 1=월, 2=화, 3=수, 4=목, 5=금, 6=토
 * grade: 학년, classNum: 반, period: 교시
 */
export const TIMETABLE = {
  1: [ // 월요일
    { period: 1, grade: 3, classNum: 11 },
    { period: 2, grade: 1, classNum: 8 },
    { period: 4, grade: 1, classNum: 9 },
    { period: 5, grade: 1, classNum: 7 },
    { period: 7, grade: 1, classNum: 4 },
  ],
  2: [ // 화요일
    { period: 3, grade: 1, classNum: 5 },
    { period: 4, grade: 1, classNum: 7 },
    { period: 6, grade: 1, classNum: 2 },
  ],
  3: [ // 수요일
    { period: 1, grade: 1, classNum: 9 },
    { period: 3, grade: 1, classNum: 3 },
    { period: 5, grade: 1, classNum: 2 },
    { period: 6, grade: 1, classNum: 1 },
  ],
  4: [ // 목요일
    { period: 2, grade: 1, classNum: 1 },
    { period: 4, grade: 1, classNum: 6 },
    { period: 6, grade: 1, classNum: 3 },
    { period: 7, grade: 1, classNum: 5 },
  ],
  5: [ // 금요일
    { period: 1, grade: 3, classNum: 11 },
    { period: 2, grade: 1, classNum: 6 },
    { period: 4, grade: 1, classNum: 8 },
    { period: 6, grade: 1, classNum: 4 },
  ],
}

export const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토']

export function getLessonsForDate(date) {
  const d = typeof date === 'string' ? new Date(date) : date
  const day = d.getDay() // 0=일 ~ 6=토
  return TIMETABLE[day] || []
}

/**
 * 로컬 타임존 기준 날짜 문자열 반환 (YYYY-MM-DD)
 * toISOString()은 UTC 기준이라 한국 시간과 다를 수 있음
 */
export function getLocalDateStr(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function getClassLabel(grade, classNum) {
  return `${grade}-${classNum}`
}

export function getCurriculumIdForGrade(grade) {
  return grade === 3 ? 'moral2' : 'moral1'
}
