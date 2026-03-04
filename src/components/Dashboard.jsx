import { getLessonsForDate, getClassLabel, DAY_NAMES, TIMETABLE, getLocalDateStr } from '../data/timetable'
import { getCurriculumForGrade, findSubunitInfo, getTotalSubunits } from '../data/curriculum'

export default function Dashboard({ records }) {
  const today = getLocalDateStr()
  const dayOfWeek = new Date().getDay()
  const todayLessons = getLessonsForDate(today)
  const todayRecords = records.filter((r) => r.date === today)

  // 1학년 / 3학년 각각 통계
  const grade1Records = records.filter((r) => r.grade === 1)
  const grade3Records = records.filter((r) => r.grade === 3)

  const classStats = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((cn) => {
    const cr = grade1Records.filter((r) => r.classNum === cn)
    const subs = new Set()
    cr.forEach((r) => { if (r.subunitId) subs.add(r.subunitId) })
    const total = getTotalSubunits(getCurriculumForGrade(1))
    return {
      classNum: cn,
      grade: 1,
      completed: subs.size,
      total,
      pct: total > 0 ? Math.round((subs.size / total) * 100) : 0,
      count: cr.length,
    }
  })

  const grade3Subs = new Set()
  grade3Records.forEach((r) => { if (r.subunitId) grade3Subs.add(r.subunitId) })
  const g3Total = getTotalSubunits(getCurriculumForGrade(3))
  const g3Pct = g3Total > 0 ? Math.round((grade3Subs.size / g3Total) * 100) : 0

  // 오늘 수업 중 기록 완료된 것
  const todaySaved = new Set()
  todayRecords.forEach((r) => todaySaved.add(`${r.grade}-${r.classNum}`))

  // 전체 통계
  const totalG1Subs = new Set()
  grade1Records.forEach((r) => { if (r.subunitId) totalG1Subs.add(r.subunitId) })
  const g1Total = getTotalSubunits(getCurriculumForGrade(1))
  const g1Pct = g1Total > 0 ? Math.round((totalG1Subs.size / g1Total) * 100) : 0

  return (
    <div className="dashboard">
      {/* 전체 현황 요약 */}
      <div className="dash-overview">
        <div className="dash-overview-item">
          <span className="dash-ov-icon">📊</span>
          <div className="dash-ov-info">
            <span className="dash-ov-number">{records.length}</span>
            <span className="dash-ov-label">전체 수업 기록</span>
          </div>
        </div>
        <div className="dash-overview-item accent-green">
          <span className="dash-ov-icon">📗</span>
          <div className="dash-ov-info">
            <span className="dash-ov-number">{g1Pct}%</span>
            <span className="dash-ov-label">1학년 진도율</span>
          </div>
        </div>
        <div className="dash-overview-item accent-blue">
          <span className="dash-ov-icon">📘</span>
          <div className="dash-ov-info">
            <span className="dash-ov-number">{g3Pct}%</span>
            <span className="dash-ov-label">3학년 진도율</span>
          </div>
        </div>
        <div className="dash-overview-item accent-amber">
          <span className="dash-ov-icon">✏️</span>
          <div className="dash-ov-info">
            <span className="dash-ov-number">{todayRecords.length}/{todayLessons.length}</span>
            <span className="dash-ov-label">오늘 입력</span>
          </div>
        </div>
      </div>

      {/* 오늘의 시간표 */}
      <div className="today-schedule card">
        <div className="card-title-row">
          <span className="card-icon">🕐</span>
          <h3>오늘의 시간표</h3>
          <span className="card-subtitle">{today} ({DAY_NAMES[dayOfWeek]})</span>
        </div>
        {todayLessons.length === 0 ? (
          <div className="no-record-box">
            <span className="no-record-icon">☀️</span>
            <p>오늘은 도덕 수업이 없습니다.</p>
          </div>
        ) : (
          <>
            <div className="schedule-pills">
              {todayLessons.map((l) => {
                const key = `${l.grade}-${l.classNum}`
                const done = todaySaved.has(key)
                return (
                  <div key={key} className={`schedule-pill ${done ? 'done' : 'pending'}`}>
                    <span className="pill-period">{l.period}교시</span>
                    <span className="pill-class">{getClassLabel(l.grade, l.classNum)}</span>
                    <span className="pill-status">{done ? '✅' : '⬜'}</span>
                  </div>
                )
              })}
            </div>
            <div className="schedule-progress-wrap">
              <div className="schedule-progress-bar">
                <div
                  className="schedule-progress-fill"
                  style={{ width: `${todayLessons.length > 0 ? (todayRecords.length / todayLessons.length) * 100 : 0}%` }}
                />
              </div>
              <span className="schedule-summary">
                입력 완료 {todayRecords.length} / {todayLessons.length}
              </span>
            </div>
          </>
        )}
      </div>

      {/* 1학년 반별 현황 */}
      <div className="card">
        <div className="card-title-row">
          <span className="card-icon">📗</span>
          <h3>1학년 도덕① 반별 진도</h3>
          <span className="card-badge">{totalG1Subs.size}/{g1Total} 완료</span>
        </div>
        <div className="class-grid">
          {classStats.map((s) => (
            <div key={s.classNum} className="class-summary-card">
              <div className="class-card-header">
                <strong>{s.classNum}반</strong>
                <span className="class-pct">{s.pct}%</span>
              </div>
              <div className="class-progress-mini">
                <div className="class-progress-fill" style={{ width: `${s.pct}%` }} />
              </div>
              <div className="class-card-detail">
                <span>{s.completed}/{s.total} 단원</span>
                <span>{s.count}회 수업</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3학년 현황 */}
      <div className="card">
        <div className="card-title-row">
          <span className="card-icon">📘</span>
          <h3>3학년 11반 도덕②</h3>
        </div>
        <div className="g3-summary">
          <div className="progress-circle">
            <svg viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="50" className="progress-bg" />
              <circle
                cx="60" cy="60" r="50"
                className="progress-fill"
                strokeDasharray={`${(g3Pct / 100) * 314} 314`}
              />
            </svg>
            <span className="progress-text">{g3Pct}%</span>
          </div>
          <div className="g3-detail">
            <div className="stat-row"><span>완료 단원</span><strong>{grade3Subs.size}/{g3Total}</strong></div>
            <div className="stat-row"><span>총 수업</span><strong>{grade3Records.length}회</strong></div>
          </div>
        </div>
      </div>

      {/* 최근 기록 */}
      <div className="card">
        <div className="card-title-row">
          <span className="card-icon">📋</span>
          <h3>최근 수업 기록</h3>
          <span className="card-subtitle">최근 15건</span>
        </div>
        {records.length > 0 ? (
          <table className="records-table">
            <thead>
              <tr>
                <th>날짜</th>
                <th>반</th>
                <th>단원</th>
                <th>차시</th>
                <th>유형</th>
                <th>메모</th>
              </tr>
            </thead>
            <tbody>
              {[...records]
                .sort((a, b) => b.date.localeCompare(a.date) || (a.grade - b.grade) || (a.classNum - b.classNum))
                .slice(0, 15)
                .map((r) => {
                  const cur = getCurriculumForGrade(r.grade)
                  const info = findSubunitInfo(cur, r.subunitId)
                  return (
                    <tr key={r.id}>
                      <td>{r.date}</td>
                      <td><span className="table-class-badge">{getClassLabel(r.grade, r.classNum)}</span></td>
                      <td>{info ? info.sub.title : '-'}</td>
                      <td>{r.period || '-'}</td>
                      <td><span className={`badge type-${r.type}`}>{r.type}</span></td>
                      <td className="memo-cell">{r.memo || '-'}</td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        ) : (
          <div className="no-record-box">
            <span className="no-record-icon">📝</span>
            <p>진도 입력 탭에서 수업 기록을 추가해보세요!</p>
          </div>
        )}
      </div>
    </div>
  )
}
