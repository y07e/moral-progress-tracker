import { MORAL1_CURRICULUM, MORAL2_CURRICULUM, findSubunitInfo } from '../data/curriculum'

const RECORDS_KEY = 'moral-progress-records'
const OVERRIDES_KEY = 'timetable-overrides'

/** 기존 subunitId 기반 레코드를 새 형식으로 변환 */
function migrateRecord(record) {
  // 이미 새 형식이면 그대로
  if ('unit' in record || 'content' in record) return record
  if (!record.subunitId) return { ...record, unit: '', page: '', content: '' }

  // 기존 하드코딩 커리큘럼에서 subunitId → 사람이 읽을 수 있는 단원명 변환
  const curriculum = record.grade === 3 ? MORAL2_CURRICULUM : MORAL1_CURRICULUM
  const info = findSubunitInfo(curriculum, record.subunitId)
  if (info) {
    return { ...record, unit: info.unit.title, content: info.sub.title, page: '' }
  }
  return { ...record, unit: '', content: record.subunitId, page: '' }
}

export function getRecords() {
  try {
    const data = localStorage.getItem(RECORDS_KEY)
    let records = data ? JSON.parse(data) : []
    // grade 필드가 없는 구버전 레코드 필터링
    records = records.filter((r) => r.grade)

    // 마이그레이션 필요 여부 확인
    const needsMigration = records.some((r) => r.subunitId && !('unit' in r))
    if (needsMigration) {
      records = records.map(migrateRecord)
      localStorage.setItem(RECORDS_KEY, JSON.stringify(records))
    }

    return records
  } catch {
    return []
  }
}

export function saveRecord(record) {
  const records = getRecords()
  const existing = records.findIndex((r) => r.id === record.id)
  if (existing >= 0) {
    records[existing] = record
  } else {
    records.push({ ...record, id: record.id || Date.now().toString() })
  }
  localStorage.setItem(RECORDS_KEY, JSON.stringify(records))
  return records
}

export function deleteRecord(id) {
  const records = getRecords().filter((r) => r.id !== id)
  localStorage.setItem(RECORDS_KEY, JSON.stringify(records))
  return records
}

// --- 시간표 예외 처리 ---
// 구조: { "2026-03-10": { additions: [{period, grade, classNum}], removals: ["3-11"] } }

export function getOverrides() {
  try {
    const data = localStorage.getItem(OVERRIDES_KEY)
    return data ? JSON.parse(data) : {}
  } catch {
    return {}
  }
}

function saveOverrides(overrides) {
  localStorage.setItem(OVERRIDES_KEY, JSON.stringify(overrides))
}

export function addLessonOverride(date, lesson) {
  const all = getOverrides()
  if (!all[date]) all[date] = { additions: [], removals: [] }
  const dup = all[date].additions.find(
    (a) => a.grade === lesson.grade && a.classNum === lesson.classNum
  )
  if (!dup) all[date].additions.push(lesson)
  // 혹시 제외 목록에 있었다면 복원
  const remKey = `${lesson.grade}-${lesson.classNum}`
  all[date].removals = all[date].removals.filter((r) => r !== remKey)
  saveOverrides(all)
  return all
}

export function removeLessonOverride(date, grade, classNum) {
  const all = getOverrides()
  if (!all[date]) all[date] = { additions: [], removals: [] }
  const key = `${grade}-${classNum}`
  const addIdx = all[date].additions.findIndex(
    (a) => a.grade === grade && a.classNum === classNum
  )
  if (addIdx >= 0) {
    all[date].additions.splice(addIdx, 1)
  } else {
    if (!all[date].removals.includes(key)) {
      all[date].removals.push(key)
    }
  }
  saveOverrides(all)
  return all
}

export function restoreLessonOverride(date, grade, classNum) {
  const all = getOverrides()
  if (!all[date]) return all
  const key = `${grade}-${classNum}`
  all[date].removals = all[date].removals.filter((r) => r !== key)
  saveOverrides(all)
  return all
}
