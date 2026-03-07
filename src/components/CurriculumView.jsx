import { useState, useMemo } from 'react'
import { getClassLabel } from '../data/timetable'

export default function CurriculumView({ records, onExport, config }) {
  const grades = config?.grades || []
  const [viewGradeKey, setViewGradeKey] = useState(() => {
    const g = grades[0]
    return g ? `${g.grade}-${g.subjectIdx ?? 0}` : '1-0'
  })
  const [viewClass, setViewClass] = useState(0) // 0 = 전체

  const [vGrade, vSubjectIdx] = viewGradeKey.split('-').map(Number)
  const gradeConfig = grades.find((g) => g.grade === vGrade && (g.subjectIdx ?? 0) === vSubjectIdx)
  const classes = gradeConfig?.classes || []

  // 필터링
  const filtered = useMemo(() => {
    let result = records.filter((r) => r.grade === vGrade && (r.subjectIdx ?? 0) === vSubjectIdx)
    if (viewClass !== 0) result = result.filter((r) => r.classNum === viewClass)
    return result.sort((a, b) => b.date.localeCompare(a.date) || a.classNum - b.classNum)
  }, [records, vGrade, vSubjectIdx, viewClass])

  // 단원별 요약
  const unitSummary = useMemo(() => {
    const map = {}
    filtered.forEach((r) => {
      const unit = r.unit || '(미입력)'
      if (!map[unit]) map[unit] = { count: 0, classes: new Set() }
      map[unit].count++
      map[unit].classes.add(r.classNum)
    })
    return Object.entries(map).sort(([, a], [, b]) => b.count - a.count)
  }, [filtered])

  // 반별 비교
  const classCompare = useMemo(() => {
    if (viewClass !== 0 || classes.length <= 1) return null
    return classes.map((cn) => {
      const count = records.filter((r) => r.grade === vGrade && (r.subjectIdx ?? 0) === vSubjectIdx && r.classNum === cn).length
      return { classNum: cn, count }
    })
  }, [records, vGrade, vSubjectIdx, viewClass, classes])

  const maxCount = classCompare ? Math.max(...classCompare.map((c) => c.count), 1) : 1

  return (
    <div className="curriculum-view">
      <div className="curriculum-top-bar">
        <div className="curriculum-title-area">
          <span className="curriculum-icon">📋</span>
          <h2>수업 기록</h2>
        </div>
        <div className="curriculum-controls">
          <div className="view-filters">
            <select
              value={viewGradeKey}
              onChange={(e) => { setViewGradeKey(e.target.value); setViewClass(0) }}
              className="filter-select"
            >
              {grades.map((g) => (
                <option key={`${g.grade}-${g.subjectIdx}`} value={`${g.grade}-${g.subjectIdx ?? 0}`}>{g.grade}학년 {g.textbook || ''}</option>
              ))}
            </select>
            <select
              value={viewClass}
              onChange={(e) => setViewClass(Number(e.target.value))}
              className="filter-select"
            >
              <option value={0}>전체</option>
              {classes.map((cn) => (
                <option key={cn} value={cn}>{cn}반</option>
              ))}
            </select>
          </div>
          <button className="btn-primary" onClick={() => onExport(vGrade, vSubjectIdx)}>
            📥 엑셀 내보내기
          </button>
        </div>
      </div>

      <div className="curriculum-progress-banner">
        <div className="cpb-info">
          <span className="cpb-label">{vGrade}학년 {gradeConfig?.textbook || ''} · {viewClass === 0 ? '전체' : `${viewClass}반`}</span>
          <span className="cpb-numbers">총 {filtered.length}건의 수업 기록</span>
        </div>
      </div>

      {/* 반별 비교 */}
      {classCompare && classes.length > 1 && (
        <div className="class-compare-section">
          <h3>반별 수업 횟수 비교</h3>
          <div className="class-compare-grid">
            {classCompare.map((c) => (
              <div key={c.classNum} className="compare-item">
                <span className="compare-class">{c.classNum}반</span>
                <div className="compare-bar-container">
                  <div className="compare-bar-fill" style={{ width: `${maxCount > 0 ? (c.count / maxCount) * 100 : 0}%` }} />
                </div>
                <span className="compare-value">{c.count}회</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 단원별 요약 */}
      {unitSummary.length > 0 && (
        <div className="unit-summary-section">
          <h3>단원별 수업 현황</h3>
          <div className="unit-summary-grid">
            {unitSummary.map(([unit, data]) => (
              <div key={unit} className="unit-summary-card">
                <strong>{unit}</strong>
                <span className="unit-summary-count">{data.count}회</span>
                <span className="unit-summary-classes">{data.classes.size}개 반</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 수업 기록 테이블 */}
      {filtered.length > 0 ? (
        <table className="records-table">
          <thead>
            <tr>
              <th>날짜</th>
              <th>반</th>
              <th>단원명</th>
              <th>페이지</th>
              <th>수업내용</th>
              <th>차시</th>
              <th>유형</th>
              <th>메모</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id}>
                <td>{r.date}</td>
                <td><span className="table-class-badge">{getClassLabel(r.grade, r.classNum)}</span></td>
                <td>{r.unit || '-'}</td>
                <td>{r.page || '-'}</td>
                <td>{r.content || '-'}</td>
                <td>{r.period || '-'}</td>
                <td><span className={`badge type-${r.type}`}>{r.type}</span></td>
                <td className="memo-cell">{r.memo || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="no-record-box">
          <span className="no-record-icon">📝</span>
          <p>수업 기록이 없습니다. 진도 입력 탭에서 기록을 추가해보세요!</p>
        </div>
      )}
    </div>
  )
}
