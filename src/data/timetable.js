/**
 * 시간표 기본값 (설정이 없을 때 fallback)
 * dayOfWeek: 0=일, 1=월, 2=화, 3=수, 4=목, 5=금, 6=토
 */
export const DEFAULT_TIMETABLE = {
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

// 현재 활성 시간표 (config에서 설정됨)
let _activeTimetable = DEFAULT_TIMETABLE
// 학기별 시간표: { 1: {요일: [수업]}, 2: {요일: [수업]} }
let _timetablesBySemester = null
// 2학기 시작일 (YYYY-MM-DD). 이 날짜부터 2학기 시간표 적용
let _semester2Start = null
// 학년도 (예: 2026). 다음 학년도 3월부터는 다시 1학기로 돌아간다
let _schoolYear = null

export function setActiveTimetable(tt) {
  _activeTimetable = tt || DEFAULT_TIMETABLE
  _timetablesBySemester = null
  _semester2Start = null
  _schoolYear = null
}

/** 학기별 시간표 등록. 날짜에 따라 자동으로 해당 학기 시간표가 적용된다. */
export function setActiveTimetables(timetables, semester2Start, schoolYear) {
  _timetablesBySemester = timetables || null
  _semester2Start = semester2Start || null
  _schoolYear = schoolYear || null
  _activeTimetable = getTimetableForDate(new Date())
}

/** 날짜가 속한 학기 번호 반환 (2학기 시작일 전이면 1) */
export function getSemesterForDate(date) {
  if (!_semester2Start) return 1
  const dateStr = typeof date === 'string' ? date : getLocalDateStr(date)
  if (dateStr < _semester2Start) return 1
  // 다음 학년도(3월 1일)부터는 다시 1학기
  if (_schoolYear && dateStr >= `${_schoolYear + 1}-03-01`) return 1
  return 2
}

/** 날짜에 해당하는 학기의 시간표 반환 */
export function getTimetableForDate(date) {
  if (_timetablesBySemester) {
    const sem = getSemesterForDate(date)
    const tt = _timetablesBySemester[sem]
    if (tt) return tt
    // 해당 학기 시간표가 없으면 있는 쪽으로 fallback
    return _timetablesBySemester[sem === 1 ? 2 : 1] || _activeTimetable
  }
  return _activeTimetable
}

export function getActiveTimetable() {
  return _activeTimetable
}

export function getBaseLessonsForDate(date) {
  const d = typeof date === 'string' ? new Date(date) : date
  const day = d.getDay() // 0=일 ~ 6=토
  return getTimetableForDate(date)[day] || []
}

export function getLessonsForDate(date, overrides = {}) {
  const dateStr = typeof date === 'string' ? date : getLocalDateStr(date)
  const base = getBaseLessonsForDate(date)
  const dayOverride = overrides[dateStr]
  if (!dayOverride) return base

  // 제외된 수업 필터링
  let result = base.filter((l) => {
    const key = `${l.grade}-${l.classNum}`
    return !dayOverride.removals?.includes(key)
  })

  // 추가된 수업 합치기
  if (dayOverride.additions?.length > 0) {
    result = [...result, ...dayOverride.additions]
  }

  // 교시 순으로 정렬
  return result.sort((a, b) => a.period - b.period)
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
