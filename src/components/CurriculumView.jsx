import { useState } from 'react'
import { getCurriculumForGrade, getTotalSubunits, findSubunitInfo } from '../data/curriculum'
import { getClassLabel } from '../data/timetable'

export default function CurriculumView({ records, onExport }) {
  const [viewGrade, setViewGrade] = useState(1)
  const [viewClass, setViewClass] = useState(0) // 0 = 전체

  const curriculum = getCurriculumForGrade(viewGrade)
  const totalSubunits = getTotalSubunits(curriculum)

  const classes =
    viewGrade === 1
      ? [1, 2, 3, 4, 5, 6, 7, 8, 9]
      : [11]

  // 필터링
  const filtered =
    viewClass === 0
      ? records.filter((r) => r.grade === viewGrade)
      : records.filter((r) => r.grade === viewGrade && r.classNum === viewClass)

  const completedSubunits = new Set()
  const subunitRecords = {}
  filtered.forEach((r) => {
    if (r.subunitId) {
      completedSubunits.add(r.subunitId)
      if (!subunitRecords[r.subunitId]) subunitRecords[r.subunitId] = []
      subunitRecords[r.subunitId].push(r)
    }
  })

  const completedCount = completedSubunits.size
  const progressPercent =
    totalSubunits > 0 ? Math.round((completedCount / totalSubunits) * 100) : 0

  const classLabel = viewClass === 0 ? '전체' : `${viewClass}반`

  // 반별 비교
  const classCompare =
    viewClass === 0
      ? classes.map((cn) => {
          const cr = records.filter((r) => r.grade === viewGrade && r.classNum === cn)
          const subs = new Set()
          cr.forEach((r) => { if (r.subunitId) subs.add(r.subunitId) })
          return {
            classNum: cn,
            completed: subs.size,
            total: totalSubunits,
            pct: totalSubunits > 0 ? Math.round((subs.size / totalSubunits) * 100) : 0,
          }
        })
      : null

  return (
    <div className="curriculum-view">
      <div className="curriculum-top-bar">
        <div className="curriculum-title-area">
          <span className="curriculum-icon">📋</span>
          <h2>교육과정 진도표</h2>
        </div>
        <div className="curriculum-controls">
          <div className="view-filters">
            <select
              value={viewGrade}
              onChange={(e) => { setViewGrade(Number(e.target.value)); setViewClass(0) }}
              className="filter-select"
            >
              <option value={1}>1학년 도덕①</option>
              <option value={3}>3학년 도덕②</option>
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
          <button className="btn-primary" onClick={() => onExport(viewGrade)}>
            📥 엑셀 내보내기
          </button>
        </div>
      </div>

      <div className="curriculum-progress-banner">
        <div className="cpb-info">
          <span className="cpb-label">{viewGrade === 1 ? '1학년 도덕①' : '3학년 도덕②'} · {classLabel}</span>
          <span className="cpb-numbers">{completedCount}/{totalSubunits} 단원 완료</span>
        </div>
        <div className="cpb-bar">
          <div className="cpb-bar-fill" style={{ width: `${progressPercent}%` }} />
        </div>
        <span className="cpb-pct">{progressPercent}%</span>
      </div>

      {classCompare && viewGrade === 1 && (
        <div className="class-compare-section">
          <h3>반별 진도 비교</h3>
          <div className="class-compare-grid">
            {classCompare.map((c) => (
              <div key={c.classNum} className="compare-item">
                <span className="compare-class">{c.classNum}반</span>
                <div className="compare-bar-container">
                  <div className="compare-bar-fill" style={{ width: `${c.pct}%` }} />
                </div>
                <span className="compare-value">{c.completed}/{c.total} ({c.pct}%)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="curriculum-list">
        {curriculum.map((unit) => {
          const unitCompleted = unit.subunits.filter((s) =>
            completedSubunits.has(s.id)
          ).length

          return (
            <div key={unit.id} className="unit-section">
              <div className="unit-header">
                <h3>{unit.title}</h3>
                <span className="unit-progress">
                  {unitCompleted}/{unit.subunits.length}
                </span>
              </div>
              <div className="subunit-list">
                {unit.subunits.map((sub) => {
                  const isCompleted = completedSubunits.has(sub.id)
                  const subRecs = subunitRecords[sub.id] || []

                  return (
                    <div key={sub.id} className={`subunit-item ${isCompleted ? 'completed' : ''}`}>
                      <div className="subunit-check">{isCompleted ? '✅' : '⬜'}</div>
                      <div className="subunit-info">
                        <span className="subunit-title">{sub.title}</span>
                        {subRecs.length > 0 && (
                          <div className="subunit-details">
                            {subRecs.map((r) => (
                              <span key={r.id} className="subunit-date">
                                {viewClass === 0 ? `${getClassLabel(r.grade, r.classNum)} ` : ''}
                                {r.date}{r.period && ` (${r.period}차시)`}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <span className="subunit-periods">{sub.totalPeriods}차시</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
