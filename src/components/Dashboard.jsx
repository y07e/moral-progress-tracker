import { getLessonsForDate, getClassLabel, DAY_NAMES, getLocalDateStr } from '../data/timetable'

const ACCENT_COLORS = ['accent-green', 'accent-blue', 'accent-amber', 'accent-green', 'accent-blue', 'accent-amber']
const GRADE_ICONS = ['📗', '📘', '📙', '📕', '📓', '📔']

export default function Dashboard({ records, overrides = {}, config }) {
  const today = getLocalDateStr()
  const dayOfWeek = new Date().getDay()
  const todayLessons = getLessonsForDate(today, overrides)
  const todayRecords = records.filter((r) => r.date === today)

  const grades = config?.grades || []

  // 학년별 통계 (수업 횟수 기반)
  const gradeStats = grades.map((g, idx) => {
    const gradeRecords = records.filter((r) => r.grade === g.grade && (r.subjectIdx ?? 0) === g.subjectIdx)

    const classStats = g.classes.map((cn) => {
      const cr = gradeRecords.filter((r) => r.classNum === cn)
      return { classNum: cn, grade: g.grade, count: cr.length }
    })

    const maxCount = Math.max(...classStats.map((s) => s.count), 1)

    return {
      grade: g.grade,
      label: g.textbook || `${g.grade}학년`,
      classes: g.classes,
      records: gradeRecords,
      totalLessons: gradeRecords.length,
      classStats,
      maxCount,
      icon: GRADE_ICONS[idx % GRADE_ICONS.length],
      accent: ACCENT_COLORS[idx % ACCENT_COLORS.length],
    }
  })

  // 오늘 수업 중 기록 완료된 것
  const todaySaved = new Set()
  todayRecords.forEach((r) => todaySaved.add(`${r.grade}-${r.classNum}`))

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
        {gradeStats.map((gs) => (
          <div key={gs.grade} className={`dash-overview-item ${gs.accent}`}>
            <span className="dash-ov-icon">{gs.icon}</span>
            <div className="dash-ov-info">
              <span className="dash-ov-number">{gs.totalLessons}회</span>
              <span className="dash-ov-label">{gs.grade}학년 수업</span>
            </div>
          </div>
        ))}
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
            <p>오늘은 수업이 없습니다.</p>
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

      {/* 학년별 반별 현황 (수업 횟수 기반) */}
      {gradeStats.map((gs) => (
        <div key={`${gs.grade}-${gs.accent}-${gs.label}`} className="card">
          <div className="card-title-row">
            <span className="card-icon">{gs.icon}</span>
            <h3>{gs.grade}학년 {gs.label} 반별 현황</h3>
            <span className="card-badge">{gs.totalLessons}회 수업</span>
          </div>
          {gs.classes.length <= 3 ? (
            <div className="g3-summary">
              {gs.classStats.map((s) => (
                <div key={s.classNum} style={{ textAlign: 'center' }}>
                  <div className="progress-circle">
                    <svg viewBox="0 0 120 120">
                      <circle cx="60" cy="60" r="50" className="progress-bg" />
                      <circle cx="60" cy="60" r="50" className="progress-fill"
                        strokeDasharray={`${(Math.min(s.count / gs.maxCount, 1)) * 314} 314`} />
                    </svg>
                    <span className="progress-text">{s.count}회</span>
                  </div>
                  <div className="g3-detail">
                    <div className="stat-row"><span>{s.classNum}반</span><strong>{s.count}회 수업</strong></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="class-grid">
              {gs.classStats.map((s) => {
                const pct = gs.maxCount > 0 ? Math.round((s.count / gs.maxCount) * 100) : 0
                return (
                  <div key={s.classNum} className="class-summary-card">
                    <div className="class-card-header">
                      <strong>{s.classNum}반</strong>
                      <span className="class-pct">{s.count}회</span>
                    </div>
                    <div className="class-progress-mini">
                      <div className="class-progress-fill" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="class-card-detail">
                      <span>{s.count}회 수업</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      ))}

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
                <th>수업내용</th>
                <th>차시</th>
                <th>유형</th>
              </tr>
            </thead>
            <tbody>
              {[...records]
                .sort((a, b) => b.date.localeCompare(a.date) || (a.grade - b.grade) || (a.classNum - b.classNum))
                .slice(0, 15)
                .map((r) => (
                  <tr key={r.id}>
                    <td>{r.date}</td>
                    <td><span className="table-class-badge">{getClassLabel(r.grade, r.classNum)}</span></td>
                    <td>{r.unit || '-'}</td>
                    <td>{r.content || '-'}</td>
                    <td>{r.period || '-'}</td>
                    <td><span className={`badge type-${r.type}`}>{r.type}</span></td>
                  </tr>
                ))}
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
