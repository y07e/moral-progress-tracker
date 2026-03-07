import * as XLSX from 'xlsx'
import { getClassLabel } from '../data/timetable'
import { getConfig } from './config'

export function exportToExcel(records, grade, subjectIdx = 0) {
  const config = getConfig()
  const gradeRecords = records.filter((r) => r.grade === grade && (r.subjectIdx ?? 0) === subjectIdx)
  const gradeConfig = config?.grades?.find((g) => g.grade === grade && (g.subjectIdx ?? 0) === subjectIdx)
  const classes = gradeConfig?.classes || []
  const gradeLabel = gradeConfig?.textbook || `${grade}학년`

  // 시트 1: 전체 수업 기록
  const rows = gradeRecords
    .sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date)
      if (dateCompare !== 0) return dateCompare
      return (a.classNum || 0) - (b.classNum || 0)
    })
    .map((r) => ({
      반: getClassLabel(r.grade, r.classNum),
      날짜: r.date,
      단원명: r.unit || '',
      페이지: r.page || '',
      수업내용: r.content || '',
      차시: r.period || '',
      수업유형: r.type || '정상수업',
      메모: r.memo || '',
    }))

  const ws = XLSX.utils.json_to_sheet(rows)
  ws['!cols'] = [
    { wch: 8 }, { wch: 12 }, { wch: 22 },
    { wch: 10 }, { wch: 30 }, { wch: 8 },
    { wch: 12 }, { wch: 30 },
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '수업 기록')

  // 시트 2: 반별 수업 요약
  const summaryRows = classes.map((cn) => {
    const classRecs = gradeRecords.filter((r) => r.classNum === cn)
    return {
      반: getClassLabel(grade, cn),
      '총 수업 횟수': classRecs.length,
    }
  })
  const ws2 = XLSX.utils.json_to_sheet(summaryRows)
  ws2['!cols'] = [{ wch: 8 }, { wch: 14 }]
  XLSX.utils.book_append_sheet(wb, ws2, '반별 요약')

  // 시트 3: 단원별 수업 현황
  const unitMap = {}
  gradeRecords.forEach((r) => {
    const unit = r.unit || '(미입력)'
    if (!unitMap[unit]) unitMap[unit] = {}
    classes.forEach((cn) => {
      if (!unitMap[unit][cn]) unitMap[unit][cn] = 0
    })
    unitMap[unit][r.classNum] = (unitMap[unit][r.classNum] || 0) + 1
  })

  const unitRows = Object.entries(unitMap).map(([unit, classData]) => {
    const row = { 단원명: unit }
    classes.forEach((cn) => {
      row[`${cn}반`] = classData[cn] || 0
    })
    return row
  })

  if (unitRows.length > 0) {
    const ws3 = XLSX.utils.json_to_sheet(unitRows)
    const unitColWidths = [{ wch: 22 }]
    classes.forEach(() => unitColWidths.push({ wch: 6 }))
    ws3['!cols'] = unitColWidths
    XLSX.utils.book_append_sheet(wb, ws3, '단원별 현황')
  }

  const schoolName = config?.schoolName || ''
  const fileName = `${schoolName}_${gradeLabel}_수업기록.xlsx`
  XLSX.writeFile(wb, fileName)
}
