const CONFIG_KEY = 'app-config'

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
