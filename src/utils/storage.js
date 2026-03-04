const RECORDS_KEY = 'moral-progress-records'

export function getRecords() {
  try {
    const data = localStorage.getItem(RECORDS_KEY)
    const records = data ? JSON.parse(data) : []
    // grade 필드가 없는 구버전 레코드 필터링
    return records.filter((r) => r.grade)
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
