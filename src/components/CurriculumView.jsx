import { useState, useMemo } from 'react'
import { getClassLabel } from '../data/timetable'

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']

export default function CurriculumView({ records, onExport, config }) {
  const grades = config?.grades || []
  const [viewGradeKey, setViewGradeKey] = useState(() => {
    const g = grades[0]
    return g ? `${g.grade}-${g.subjectIdx ?? 0}` : '1-0'
  })
  const [viewClass, setViewClass] = useState(0) // 0 = 전체
  const [viewMode, setViewMode] = useState('matrix') // 'list' | 'matrix'

  // 진도표용 월 선택
  const [matrixMonth, setMatrixMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })

  const [vGrade, vSubjectIdx] = viewGradeKey.split('-').map(Number)
  const gradeConfig = grades.find((g) => g.grade === vGrade && (g.subjectIdx ?? 0) === vSubjectIdx)
  const classes = gradeConfig?.classes || []

  // 필터링 (리스트용)
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

  // ===== 진도표 매트릭스 데이터 =====
  const matrixData = useMemo(() => {
    const gradeRecords = records.filter(
      (r) => r.grade === vGrade && (r.subjectIdx ?? 0) === vSubjectIdx
    )

    // 해당 월의 날짜 목록 (기록이 있는 날짜만)
    const datesInMonth = new Set()
    gradeRecords.forEach((r) => {
      if (r.date.startsWith(matrixMonth)) datesInMonth.add(r.date)
    })
    const sortedDates = [...datesInMonth].sort()

    // 날짜×반 매트릭스
    const matrix = {}
    gradeRecords.forEach((r) => {
      if (!r.date.startsWith(matrixMonth)) return
      const key = `${r.date}-${r.classNum}`
      // 같은 날짜+반에 여러 기록이 있으면 합침
      if (!matrix[key]) matrix[key] = []
      matrix[key].push(r)
    })

    return { sortedDates, matrix }
  }, [records, vGrade, vSubjectIdx, matrixMonth])

  // 월 이동
  const changeMonth = (delta) => {
    const [y, m] = matrixMonth.split('-').map(Number)
    const d = new Date(y, m - 1 + delta, 1)
    setMatrixMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  // 월 목록 (학년도 기준 3월~다음해 2월)
  const monthOptions = useMemo(() => {
    const year = config?.year || new Date().getFullYear()
    const options = []
    for (let i = 0; i < 12; i++) {
      const m = ((2 + i) % 12) + 1 // 3,4,5,...,12,1,2
      const y = m >= 3 ? year : year + 1
      options.push(`${y}-${String(m).padStart(2, '0')}`)
    }
    return options
  }, [config?.year])

  // 셀 표시 텍스트 결정
  const getCellText = (recs) => {
    if (!recs || recs.length === 0) return ''
    // 주요 표시: 단원명 > 수업내용 > 유형
    const parts = recs.map((r) => {
      if (r.unit) return r.unit
      if (r.content) return r.content
      if (r.type && r.type !== '정상수업') return r.type
      return '✓'
    })
    return parts.join(', ')
  }

  // 셀 특수 유형 체크 (비정상수업이면 빨간색 표시)
  const getCellType = (recs) => {
    if (!recs || recs.length === 0) return 'empty'
    const types = recs.map((r) => r.type || '정상수업')
    if (types.some((t) => ['휴강', '평가'].includes(t))) return 'special'
    return 'normal'
  }

  // 날짜에서 비고 추출 (메모가 있는 것들)
  const getDateMemo = (date) => {
    const gradeRecords = records.filter(
      (r) => r.grade === vGrade && (r.subjectIdx ?? 0) === vSubjectIdx && r.date === date
    )
    const memos = gradeRecords.map((r) => r.memo).filter(Boolean)
    return [...new Set(memos)].join(', ')
  }

  const [mYear, mMonth] = matrixMonth.split('-').map(Number)

  // 진도표 인쇄
  const handlePrintMatrix = () => {
    const subjectName = gradeConfig?.textbook || (config?.subjects?.[vSubjectIdx] || '')
    const title = `${config?.year || mYear}학년도 ${mMonth}월 ${vGrade}학년 ${subjectName}과 진도표`
    const dates = matrixData.sortedDates

    let tableHtml = `
      <table>
        <thead><tr>
          <th class="th-date">날짜</th>
          ${classes.map((cn) => `<th>${vGrade}-${cn}</th>`).join('')}
          <th>비고</th>
        </tr></thead>
        <tbody>
    `
    dates.forEach((date) => {
      const d = new Date(date)
      const dayLabel = DAY_LABELS[d.getDay()]
      const mm = date.substring(5, 7)
      const dd = date.substring(8, 10)
      const memo = getDateMemo(date)

      tableHtml += `<tr>
        <td class="td-date">${Number(mm)}/${Number(dd)} ${dayLabel}</td>`
      classes.forEach((cn) => {
        const key = `${date}-${cn}`
        const recs = matrixData.matrix[key]
        const text = getCellText(recs)
        const type = getCellType(recs)
        const cls = type === 'special' ? 'special' : ''
        tableHtml += `<td class="${cls}">${text}</td>`
      })
      tableHtml += `<td class="td-memo">${memo}</td></tr>`
    })
    tableHtml += '</tbody></table>'

    // 현재 페이지에서 인쇄 (새 창 없이)
    const printStyle = document.createElement('style')
    printStyle.id = 'matrix-print-style'
    printStyle.textContent = `
      @media print {
        @page { size: portrait; margin: 10mm; }
        body > * { display: none !important; }
        #matrix-print-area { display: block !important; }
      }
      #matrix-print-area {
        display: none;
        font-family: -apple-system, 'Malgun Gothic', sans-serif;
        padding: 0; margin: 0;
      }
      #matrix-print-area h1 {
        text-align: center; font-size: 17px; margin: 8px 0 10px; font-weight: 800;
      }
      #matrix-print-area table {
        width: 100%; border-collapse: collapse; font-size: 10px;
      }
      #matrix-print-area th {
        background: #333; color: white; padding: 5px 3px;
        border: 1px solid #999; font-weight: 700; text-align: center;
        -webkit-print-color-adjust: exact; print-color-adjust: exact;
      }
      #matrix-print-area td {
        padding: 4px 3px; border: 1px solid #999; text-align: center;
        word-break: keep-all; line-height: 1.3; font-size: 9px;
      }
      #matrix-print-area .td-date {
        font-weight: 600; white-space: nowrap; background: #eee;
        -webkit-print-color-adjust: exact; print-color-adjust: exact;
      }
      #matrix-print-area .td-memo { font-size: 8px; color: #666; }
      #matrix-print-area .special { color: #c00; font-weight: 700; }
    `

    // 기존 인쇄 요소 제거
    document.getElementById('matrix-print-style')?.remove()
    document.getElementById('matrix-print-area')?.remove()

    document.head.appendChild(printStyle)

    const printArea = document.createElement('div')
    printArea.id = 'matrix-print-area'
    printArea.innerHTML = `<h1>${title}</h1>${tableHtml}`
    document.body.appendChild(printArea)

    window.print()

    // 인쇄 후 정리
    setTimeout(() => {
      document.getElementById('matrix-print-style')?.remove()
      document.getElementById('matrix-print-area')?.remove()
    }, 500)
  }

  return (
    <div className="curriculum-view">
      <div className="curriculum-top-bar">
        <div className="curriculum-title-area">
          <span className="curriculum-icon">📋</span>
          <h2>수업 기록</h2>
        </div>
        <div className="curriculum-controls">
          {/* 뷰 토글 버튼 */}
          <div className="view-mode-toggle">
            <button
              className={`view-mode-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
            >
              📋 리스트
            </button>
            <button
              className={`view-mode-btn ${viewMode === 'matrix' ? 'active' : ''}`}
              onClick={() => setViewMode('matrix')}
            >
              📊 진도표
            </button>
          </div>
        </div>
      </div>

      {/* ===== 리스트 뷰 ===== */}
      {viewMode === 'list' && (
        <>
          <div className="cv-filter-row">
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

          <div className="curriculum-progress-banner">
            <div className="cpb-info">
              <span className="cpb-label">{vGrade}학년 {gradeConfig?.textbook || ''} · {viewClass === 0 ? '전체' : `${viewClass}반`}</span>
              <span className="cpb-numbers">총 {filtered.length}건의 수업 기록</span>
            </div>
          </div>

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
        </>
      )}

      {/* ===== 진도표 뷰 ===== */}
      {viewMode === 'matrix' && (
        <div className="matrix-view">
          {/* 진도표 필터 */}
          <div className="matrix-filter-row">
            <select
              value={viewGradeKey}
              onChange={(e) => setViewGradeKey(e.target.value)}
              className="filter-select"
            >
              {grades.map((g) => (
                <option key={`${g.grade}-${g.subjectIdx}`} value={`${g.grade}-${g.subjectIdx ?? 0}`}>
                  {g.grade}학년 {g.textbook || ''}
                </option>
              ))}
            </select>
            <div className="matrix-month-nav">
              <button className="cal-nav-btn" onClick={() => changeMonth(-1)}>◀</button>
              <select
                value={matrixMonth}
                onChange={(e) => setMatrixMonth(e.target.value)}
                className="filter-select matrix-month-select"
              >
                {monthOptions.map((m) => {
                  const [y, mo] = m.split('-')
                  return <option key={m} value={m}>{y}년 {Number(mo)}월</option>
                })}
              </select>
              <button className="cal-nav-btn" onClick={() => changeMonth(1)}>▶</button>
            </div>
            <button className="btn-primary" onClick={() => onExport(vGrade, vSubjectIdx)}>
              📥 엑셀
            </button>
            <button className="btn-secondary" onClick={() => handlePrintMatrix()}>
              🖨️ 인쇄
            </button>
          </div>

          {/* 진도표 제목 */}
          <div className="matrix-title-banner">
            <h3>{config?.year || mYear}학년도 {vGrade}학년 {gradeConfig?.textbook || (config?.subjects?.[vSubjectIdx] || '')}과 진도표</h3>
            <span className="matrix-month-label">{mYear}년 {mMonth}월</span>
          </div>

          {/* 매트릭스 테이블 */}
          {matrixData.sortedDates.length > 0 ? (
            <div className="matrix-table-wrap">
              <table className="matrix-table">
                <thead>
                  <tr>
                    <th className="matrix-th-date">날짜</th>
                    {classes.map((cn) => (
                      <th key={cn} className="matrix-th-class">{vGrade}-{cn}</th>
                    ))}
                    <th className="matrix-th-memo">비고</th>
                  </tr>
                </thead>
                <tbody>
                  {matrixData.sortedDates.map((date) => {
                    const d = new Date(date)
                    const dayLabel = DAY_LABELS[d.getDay()]
                    const mm = date.substring(5, 7)
                    const dd = date.substring(8, 10)
                    const memo = getDateMemo(date)
                    const isWeekend = d.getDay() === 0 || d.getDay() === 6

                    return (
                      <tr key={date} className={isWeekend ? 'matrix-row-weekend' : ''}>
                        <td className="matrix-td-date">
                          <span className="matrix-date-num">{Number(mm)}/{Number(dd)}</span>
                          <span className={`matrix-date-day ${d.getDay() === 0 ? 'sunday' : ''} ${d.getDay() === 6 ? 'saturday' : ''}`}>{dayLabel}</span>
                        </td>
                        {classes.map((cn) => {
                          const key = `${date}-${cn}`
                          const recs = matrixData.matrix[key]
                          const cellText = getCellText(recs)
                          const cellType = getCellType(recs)

                          return (
                            <td
                              key={cn}
                              className={`matrix-td-cell ${cellType}`}
                              title={recs?.map((r) => [r.unit, r.content, r.memo].filter(Boolean).join(' · ')).join('\n') || ''}
                            >
                              {cellText}
                            </td>
                          )
                        })}
                        <td className="matrix-td-memo">{memo}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="no-record-box">
              <span className="no-record-icon">📊</span>
              <p>{mMonth}월에 기록된 수업이 없습니다.</p>
            </div>
          )}

          {/* 범례 */}
          <div className="matrix-legend">
            <span className="matrix-legend-item"><span className="matrix-legend-dot normal"></span> 정상수업</span>
            <span className="matrix-legend-item"><span className="matrix-legend-dot special"></span> 평가/휴강</span>
            <span className="matrix-legend-item"><span className="matrix-legend-dot empty-dot"></span> 수업 없음</span>
          </div>
        </div>
      )}
    </div>
  )
}
