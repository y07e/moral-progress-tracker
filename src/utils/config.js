import { DEFAULT_TIMETABLE } from '../data/timetable'

const CONFIG_KEY = 'app-config'

/** 시간표를 비교 가능한 문자열로 정규화 (subjectIdx 무시) */
function canonTimetable(tt) {
  return JSON.stringify(
    Object.fromEntries(
      [1, 2, 3, 4, 5].map((d) => [
        d,
        ((tt || {})[d] || []).map((l) => `${l.period}-${l.grade}-${l.classNum}`).sort(),
      ])
    )
  )
}

function isEmptyTimetable(tt) {
  if (!tt) return true
  return Object.values(tt).every((d) => !d || d.length === 0)
}

export function getConfig() {
  try {
    const data = localStorage.getItem(CONFIG_KEY)
    if (!data) return null
    const config = JSON.parse(data)
    return migrateConfig(config)
  } catch {
    return null
  }
}

/** 2026학년도 2학기 도덕 시간표 (2026-08-19부터 적용) — 기존 사용자 자동 입력용 */
const SEMESTER2_2026_TIMETABLE = {
  1: [ // 월
    { period: 3, grade: 1, classNum: 1, subjectIdx: 0 },
    { period: 5, grade: 1, classNum: 4, subjectIdx: 0 },
    { period: 6, grade: 3, classNum: 11, subjectIdx: 0 },
  ],
  2: [ // 화
    { period: 1, grade: 1, classNum: 7, subjectIdx: 0 },
    { period: 2, grade: 1, classNum: 9, subjectIdx: 0 },
    { period: 4, grade: 1, classNum: 3, subjectIdx: 0 },
    { period: 5, grade: 1, classNum: 8, subjectIdx: 0 },
  ],
  3: [ // 수
    { period: 2, grade: 1, classNum: 1, subjectIdx: 0 },
    { period: 3, grade: 1, classNum: 4, subjectIdx: 0 },
    { period: 4, grade: 1, classNum: 6, subjectIdx: 0 },
    { period: 6, grade: 3, classNum: 11, subjectIdx: 0 },
  ],
  4: [ // 목
    { period: 1, grade: 1, classNum: 8, subjectIdx: 0 },
    { period: 2, grade: 1, classNum: 2, subjectIdx: 0 },
    { period: 4, grade: 1, classNum: 5, subjectIdx: 0 },
    { period: 5, grade: 1, classNum: 3, subjectIdx: 0 },
    { period: 7, grade: 1, classNum: 7, subjectIdx: 0 },
  ],
  5: [ // 금
    { period: 1, grade: 1, classNum: 6, subjectIdx: 0 },
    { period: 3, grade: 1, classNum: 2, subjectIdx: 0 },
    { period: 4, grade: 1, classNum: 9, subjectIdx: 0 },
    { period: 6, grade: 1, classNum: 5, subjectIdx: 0 },
  ],
}
const SEMESTER2_2026_START = '2026-08-19'

/** 기존 config를 새 스키마로 마이그레이션 */
function migrateConfig(config) {
  if (!config) return null

  // subject → subjects 마이그레이션
  let subjects = config.subjects
  if (!subjects) {
    subjects = config.subject ? [config.subject] : ['']
  }
  // 빈 문자열 2번째 제거
  if (subjects.length === 2 && !subjects[1]) subjects = [subjects[0]]

  const grades = (config.grades || []).map((g) => ({
    grade: g.grade,
    classes: g.classes,
    textbook: g.curriculumLabel || g.textbook || '',
    curriculumRevision: g.curriculumRevision || config.curriculumRevision || '',
    publisher: g.publisher || config.publisher || '',
    subjectIdx: g.subjectIdx ?? 0,
  }))

  const result = { ...config, subjects, grades }

  // 학기별 시간표 마이그레이션: 기존 단일 timetable → timetables[학기]
  if (!result.timetables) {
    const timetables = {}
    if (result.timetable) timetables[result.semester || 1] = result.timetable
    // 기존 사용자(2026학년도): 2학기 시간표 자동 입력
    if (!timetables[2] && result.year === 2026) {
      timetables[2] = SEMESTER2_2026_TIMETABLE
      result.semester2Start = result.semester2Start || SEMESTER2_2026_START
    }
    result.timetables = timetables
  }

  // 복구(2026): 학기만 2학기로 바꾸고 저장해서 2학기 칸에 1학기 시간표가 들어간 경우
  // → 그 시간표를 1학기 칸으로 되돌리고 2학기 칸에는 실제 2학기 시간표를 넣는다
  if (
    result.year === 2026 &&
    result.timetables[2] &&
    canonTimetable(result.timetables[2]) === canonTimetable(DEFAULT_TIMETABLE)
  ) {
    if (isEmptyTimetable(result.timetables[1])) {
      result.timetables = { ...result.timetables, 1: result.timetables[2] }
    }
    result.timetables = { ...result.timetables, 2: SEMESTER2_2026_TIMETABLE }
    if (result.semester === 2) result.timetable = SEMESTER2_2026_TIMETABLE
  }

  if (result.timetables[2] && !result.semester2Start) {
    result.semester2Start = SEMESTER2_2026_START
  }

  // 레거시 필드 제거
  delete result.subject
  delete result.curriculumRevision
  delete result.publisher
  return result
}

export function saveConfig(config) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config))
}

export function hasConfig() {
  return !!localStorage.getItem(CONFIG_KEY)
}

// 설정에서 학년 목록 가져오기
export function getGradeClasses(config) {
  if (!config) return []
  return config.grades || []
}

// 설정에서 Header 제목 생성
export function getHeaderTitle(config) {
  if (!config) return '진도 관리 프로그램'
  const subjectStr = (config.subjects || []).filter(Boolean).join('·')
  return `${config.year}학년도 ${subjectStr}과 진도 관리 프로그램`
}

// 설정에서 Header 부제목 생성
export function getHeaderSubtitle(config) {
  if (!config) return ''
  const parts = config.grades.map((g) => `${g.grade}학년 ${g.classes.length}개반`)
  // 중복 제거 (같은 학년 다른 과목)
  const unique = [...new Set(parts)]
  return `${config.schoolName} · ${unique.join(' + ')}`
}

// 과목 목록 가져오기 (헬퍼)
export function getSubjects(config) {
  if (!config) return ['']
  return (config.subjects || ['']).filter(Boolean)
}

// 기존 사용자를 위한 기본값
export function getLegacyDefault() {
  return {
    schoolName: '양산여자중학교',
    subjects: ['도덕'],
    year: 2026,
    semester: 1,
    grades: [
      { grade: 1, classes: [1, 2, 3, 4, 5, 6, 7, 8, 9], textbook: '도덕①', curriculumRevision: '', publisher: '', subjectIdx: 0 },
      { grade: 3, classes: [11], textbook: '도덕②', curriculumRevision: '', publisher: '', subjectIdx: 0 },
    ],
  }
}
