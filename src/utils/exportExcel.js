import * as XLSX from 'xlsx'
import { getCurriculumForGrade, getTotalSubunits } from '../data/curriculum'
import { getClassLabel } from '../data/timetable'

export function exportToExcel(records, grade) {
  const curriculum = getCurriculumForGrade(grade)
  const totalSubunits = getTotalSubunits(curriculum)
  const gradeRecords = records.filter((r) => r.grade === grade)
  const classes = grade === 1 ? [1, 2, 3, 4, 5, 6, 7, 8, 9] : [11]
  const gradeLabel = grade === 1 ? '1학년 도덕①' : '3학년 도덕②'

  // 시트 1: 전체 수업 기록
  const rows = gradeRecords
    .sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date)
      if (dateCompare !== 0) return dateCompare
      return (a.classNum || 0) - (b.classNum || 0)
    })
    .map((r) => {
      let unitTitle = ''
      let subunitTitle = ''
      for (const unit of curriculum) {
        const sub = unit.subunits.find((s) => s.id === r.subunitId)
        if (sub) {
          unitTitle = unit.title
          subunitTitle = sub.title
          break
        }
      }
      return {
        반: getClassLabel(r.grade, r.classNum),
        날짜: r.date,
        대단원: unitTitle,
        중단원: subunitTitle,
        차시: r.period || '',
        수업유형: r.type || '정상수업',
        메모: r.memo || '',
      }
    })

  const ws = XLSX.utils.json_to_sheet(rows)
  ws['!cols'] = [
    { wch: 8 },
    { wch: 12 },
    { wch: 22 },
    { wch: 26 },
    { wch: 8 },
    { wch: 12 },
    { wch: 30 },
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '수업 기록')

  // 시트 2: 반별 진도 요약
  const summaryRows = classes.map((cn) => {
    const classRecs = gradeRecords.filter((r) => r.classNum === cn)
    const subs = new Set()
    classRecs.forEach((r) => {
      if (r.subunitId) subs.add(r.subunitId)
    })
    return {
      반: getClassLabel(grade, cn),
      '총 수업 횟수': classRecs.length,
      '완료 단원': subs.size,
      '전체 단원': totalSubunits,
      '진도율(%)':
        totalSubunits > 0
          ? Math.round((subs.size / totalSubunits) * 100)
          : 0,
    }
  })
  const ws2 = XLSX.utils.json_to_sheet(summaryRows)
  ws2['!cols'] = [
    { wch: 8 },
    { wch: 14 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
  ]
  XLSX.utils.book_append_sheet(wb, ws2, '반별 요약')

  // 시트 3: 단원별 진도 현황 (각 반의 완료 여부)
  const unitRows = []
  curriculum.forEach((unit) => {
    unit.subunits.forEach((sub) => {
      const row = { 대단원: unit.title, 중단원: sub.title, 배정차시: sub.totalPeriods }
      classes.forEach((cn) => {
        const label = grade === 1 ? `${cn}반` : `${cn}반`
        const classRecs = gradeRecords.filter(
          (r) => r.classNum === cn && r.subunitId === sub.id
        )
        row[label] = classRecs.length > 0 ? '✓' : ''
      })
      unitRows.push(row)
    })
  })
  const ws3 = XLSX.utils.json_to_sheet(unitRows)
  const unitColWidths = [{ wch: 22 }, { wch: 26 }, { wch: 8 }]
  classes.forEach(() => unitColWidths.push({ wch: 6 }))
  ws3['!cols'] = unitColWidths
  XLSX.utils.book_append_sheet(wb, ws3, '단원별 진도')

  const fileName = `양산여자중학교_${gradeLabel}_진도기록.xlsx`
  XLSX.writeFile(wb, fileName)
}
