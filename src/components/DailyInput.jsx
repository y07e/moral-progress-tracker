import { useState, useMemo } from 'react'
import { getLessonsForDate, getBaseLessonsForDate, getClassLabel, DAY_NAMES, getLocalDateStr, getActiveTimetable } from '../data/timetable'

export default function DailyInput({ records, overrides = {}, config, onSave, onDelete, onAddLesson, onRemoveLesson, onRestoreLesson }) {
  const grades = config?.grades || []
  const defaultGrade = grades[0]?.grade || 1

  const [selectedDate, setSelectedDate] = useState(
    () => getLocalDateStr()
  )
  const [showAddForm, setShowAddForm] = useState(false)
  const [newLesson, setNewLesson] = useState({ period: '', grade: defaultGrade, classNum: '' })

  const dayOfWeek = new Date(selectedDate).getDay()
  const dayName = DAY_NAMES[dayOfWeek]
  const lessons = getLessonsForDate(selectedDate, overrides)
  const isToday = selectedDate === getLocalDateStr()

  // 이 날짜에 제외된 수업 목록
  const dayOverride = overrides[selectedDate] || { additions: [], removals: [] }
  const removedLessons = dayOverride.removals || []
  const addedKeys = new Set((dayOverride.additions || []).map((a) => `${a.grade}-${a.classNum}`))

  // 각 수업별 입력 상태 관리
  const [inputs, setInputs] = useState({})

  // 해당 날짜의 기존 기록 조회
  const existingByKey = useMemo(() => {
    const map = {}
    records
      .filter((r) => r.date === selectedDate)
      .forEach((r) => {
        const key = `${r.grade}-${r.classNum}`
        map[key] = r
      })
    return map
  }, [records, selectedDate])

  // 오늘 저장 현황
  const savedCount = useMemo(() => {
    return lessons.filter((l) => existingByKey[`${l.grade}-${l.classNum}`]).length
  }, [lessons, existingByKey])

  // 전체 수업 통계 (학년·과목별 수업 횟수)
  const overallStats = useMemo(() => {
    const gradeStatsArr = grades.map((g) => {
      const count = records.filter((r) => r.grade === g.grade && (r.subjectIdx ?? 0) === g.subjectIdx).length
      return { grade: g.grade, subjectIdx: g.subjectIdx, label: g.textbook || `${g.grade}학년`, count }
    })
    return { gradeStats: gradeStatsArr, totalRecords: records.length }
  }, [records, grades])

  // 각 반의 마지막 기록 (이전 진도 확인용)
  const lastRecordByClass = useMemo(() => {
    const map = {}
    records
      .sort((a, b) => b.date.localeCompare(a.date))
      .forEach((r) => {
        const key = `${r.grade}-${r.classNum}`
        if (!map[key]) map[key] = r
      })
    return map
  }, [records])

  const getInput = (grade, classNum) => {
    const key = `${grade}-${classNum}`
    const existing = existingByKey[key]
    if (existing && !inputs[key]) {
      return {
        unit: existing.unit || '',
        page: existing.page || '',
        content: existing.content || '',
        period: existing.period || '',
        type: existing.type || '정상수업',
        memo: existing.memo || '',
      }
    }
    return inputs[key] || { unit: '', page: '', content: '', period: '', type: '정상수업', memo: '' }
  }

  const setInput = (grade, classNum, field, value) => {
    const key = `${grade}-${classNum}`
    setInputs((prev) => ({
      ...prev,
      [key]: { ...getInput(grade, classNum), [field]: value },
    }))
  }

  // 특정 학년 전체에 같은 단원 적용
  const applyToAllGrade = (grade, unit) => {
    setInputs((prev) => {
      const next = { ...prev }
      lessons
        .filter((l) => l.grade === grade)
        .forEach((l) => {
          const key = `${l.grade}-${l.classNum}`
          next[key] = { ...getInput(l.grade, l.classNum), unit }
        })
      return next
    })
  }

  const handleSave = (grade, classNum, subjectIdx) => {
    const key = `${grade}-${classNum}`
    const input = getInput(grade, classNum)
    const existing = existingByKey[key]

    const record = {
      id: existing?.id || `${selectedDate}-${key}`,
      date: selectedDate,
      grade,
      classNum,
      subjectIdx: subjectIdx ?? 0,
      unit: input.unit,
      page: input.page,
      content: input.content,
      period: input.period,
      type: input.type,
      memo: input.memo,
    }
    onSave(record)
  }

  const handleSaveAll = () => {
    lessons.forEach((l) => {
      const input = getInput(l.grade, l.classNum)
      if (input.unit || input.content) {
        handleSave(l.grade, l.classNum, l.subjectIdx ?? 0)
      }
    })
  }

  const handleDelete = (grade, classNum) => {
    const key = `${grade}-${classNum}`
    const existing = existingByKey[key]
    if (existing) {
      onDelete(existing.id)
      setInputs((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })
    }
  }

  const goToday = () => setSelectedDate(getLocalDateStr())
  const goPrev = () => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() - 1)
    setSelectedDate(getLocalDateStr(d))
  }
  const goNext = () => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + 1)
    setSelectedDate(getLocalDateStr(d))
  }

  // 학년·과목별 수업 분리 (동적)
  const subjects = config?.subjects || ['']
  const lessonsByGrade = grades.map((g) => ({
    ...g,
    subjectName: subjects[g.subjectIdx] || '',
    lessons: lessons.filter((l) => l.grade === g.grade && (l.subjectIdx ?? 0) === g.subjectIdx),
  }))

  // 날짜 포맷
  const dateObj = new Date(selectedDate)
  const formattedDate = `${dateObj.getFullYear()}년 ${dateObj.getMonth() + 1}월 ${dateObj.getDate()}일`

  return (
    <div className="daily-input">
      {/* 날짜 네비게이션 */}
      <div className="date-nav">
        <button className="cal-nav-btn" onClick={goPrev}>◀</button>
        <div className="date-info">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="date-picker"
          />
          <span className={`day-badge ${isToday ? 'today' : ''}`}>
            {isToday ? '오늘' : ''} {dayName}요일
          </span>
        </div>
        <button className="cal-nav-btn" onClick={goNext}>▶</button>
        <button className={`btn-today-nav ${isToday ? 'is-today' : ''}`} onClick={goToday}>
          오늘
        </button>
      </div>

      {/* 주간 시간표 */}
      <WeeklyTimetable dayOfWeek={dayOfWeek} config={config} />

      {/* 오늘의 요약 카드 */}
      <div className="today-summary-card">
        <div className="summary-date-display">
          <span className="summary-date-text">{formattedDate}</span>
          {lessons.length > 0 && (
            <span className="summary-lesson-count">
              {lessons.length}개 수업
            </span>
          )}
        </div>
        <div className="summary-stats-row">
          <div className="summary-stat">
            <span className="stat-icon">📚</span>
            <span className="stat-number">{overallStats.totalRecords}</span>
            <span className="stat-desc">총 수업 기록</span>
          </div>
          {overallStats.gradeStats.map((gs) => (
            <div key={gs.grade} className="summary-stat">
              <span className="stat-icon">📖</span>
              <span className="stat-number">{gs.count}회</span>
              <span className="stat-desc">{gs.label}</span>
            </div>
          ))}
          {lessons.length > 0 && (
            <div className="summary-stat highlight">
              <span className="stat-icon">{savedCount === lessons.length ? '✅' : '⏳'}</span>
              <span className="stat-number">{savedCount}/{lessons.length}</span>
              <span className="stat-desc">오늘 저장</span>
            </div>
          )}
        </div>
        {lessons.length > 0 && (
          <div className="today-progress-bar">
            <div
              className="today-progress-fill"
              style={{ width: `${lessons.length > 0 ? (savedCount / lessons.length) * 100 : 0}%` }}
            />
          </div>
        )}
      </div>

      {/* 제외된 수업 복원 영역 */}
      {removedLessons.length > 0 && (
        <div className="removed-lessons-card">
          <div className="removed-header">
            <span>🚫 이 날 제외된 수업</span>
          </div>
          <div className="removed-list">
            {removedLessons.map((key) => {
              const [g, c] = key.split('-').map(Number)
              return (
                <div key={key} className="removed-item">
                  <span className="removed-label">{getClassLabel(g, c)}</span>
                  <button
                    className="btn-restore-sm"
                    onClick={() => onRestoreLesson(selectedDate, g, c)}
                  >
                    복원
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 수업 추가 버튼/폼 */}
      <div className="add-lesson-area">
        {!showAddForm ? (
          <button className="btn-add-lesson" onClick={() => setShowAddForm(true)}>
            + 수업 추가
          </button>
        ) : (
          <div className="add-lesson-form">
            <span className="add-form-title">수업 추가</span>
            <div className="add-form-row">
              <select
                value={newLesson.grade}
                onChange={(e) => setNewLesson({ ...newLesson, grade: Number(e.target.value) })}
                className="add-input"
              >
                {grades.map((g) => (
                  <option key={g.grade} value={g.grade}>{g.grade}학년</option>
                ))}
              </select>
              <input
                type="number"
                value={newLesson.classNum}
                onChange={(e) => setNewLesson({ ...newLesson, classNum: e.target.value })}
                placeholder="반"
                min="1" max="11"
                className="add-input add-input-sm"
              />
              <input
                type="number"
                value={newLesson.period}
                onChange={(e) => setNewLesson({ ...newLesson, period: e.target.value })}
                placeholder="교시"
                min="1" max="7"
                className="add-input add-input-sm"
              />
              <button
                className="btn-add-confirm"
                onClick={() => {
                  if (newLesson.classNum && newLesson.period) {
                    onAddLesson(selectedDate, {
                      period: Number(newLesson.period),
                      grade: newLesson.grade,
                      classNum: Number(newLesson.classNum),
                    })
                    setNewLesson({ period: '', grade: 1, classNum: '' })
                    setShowAddForm(false)
                  }
                }}
              >
                추가
              </button>
              <button className="btn-add-cancel" onClick={() => setShowAddForm(false)}>
                취소
              </button>
            </div>
          </div>
        )}
      </div>

      {lessons.length === 0 ? (
        <div className="no-lessons-card">
          <div className="no-lessons-icon">🌸</div>
          <p className="no-lessons-title">수업 없는 날</p>
          <p className="no-lessons-desc">
            {dayOfWeek === 0 || dayOfWeek === 6
              ? '주말에는 수업이 없습니다. 편안한 휴일 보내세요!'
              : '오늘은 수업이 배정되지 않은 날입니다.'}
          </p>
        </div>
      ) : (
        <>
          {lessonsByGrade.map((grp, gIdx) => {
            if (grp.lessons.length === 0) return null
            return (
              <div key={`${grp.grade}-${grp.subjectIdx}`} className={`grade-section grade-${grp.grade}`}>
                <div className={`grade-section-header ${gIdx > 0 ? `grade-${grp.grade}-header` : ''}`}>
                  <div className="grade-title-area">
                    <span className="grade-emoji">{['📗','📘','📙','📕'][gIdx % 4]}</span>
                    <h3>{grp.grade}학년 {grp.textbook || ''}</h3>
                    <span className="grade-count-badge">{grp.lessons.length}개 반</span>
                  </div>
                  {grp.lessons.length > 1 && (
                    <div className="grade-actions">
                      <input
                        type="text"
                        className="bulk-unit-input"
                        placeholder="일괄 단원명 입력 후 Enter..."
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && e.target.value.trim()) {
                            applyToAllGrade(grp.grade, e.target.value.trim())
                            e.target.value = ''
                          }
                        }}
                      />
                      <button className="btn-primary btn-save-all" onClick={handleSaveAll}>
                        전체 저장
                      </button>
                    </div>
                  )}
                </div>

                <div className="lessons-list">
                  {grp.lessons.map((lesson, idx) => (
                    <LessonRow
                      key={`${lesson.grade}-${lesson.classNum}`}
                      lesson={lesson}
                      input={getInput(lesson.grade, lesson.classNum)}
                      existing={existingByKey[`${lesson.grade}-${lesson.classNum}`]}
                      lastRecord={lastRecordByClass[`${lesson.grade}-${lesson.classNum}`]}
                      colorIndex={idx}
                      isAdded={addedKeys.has(`${lesson.grade}-${lesson.classNum}`)}
                      onInputChange={(field, val) =>
                        setInput(lesson.grade, lesson.classNum, field, val)
                      }
                      onSave={() => handleSave(lesson.grade, lesson.classNum, lesson.subjectIdx ?? grp.subjectIdx)}
                      onDelete={() => handleDelete(lesson.grade, lesson.classNum)}
                      onRemove={() => onRemoveLesson(selectedDate, lesson.grade, lesson.classNum)}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}

/* ===== 주간 시간표 미니 뷰 ===== */
const MINI_DAYS = ['월', '화', '수', '목', '금']

function WeeklyTimetable({ dayOfWeek, config }) {
  const [open, setOpen] = useState(false)
  const timetable = getActiveTimetable()

  // 최대 교시 계산
  const maxPeriod = useMemo(() => {
    let max = 0
    for (let d = 1; d <= 5; d++) {
      const lessons = timetable[d] || []
      lessons.forEach((l) => { if (l.period > max) max = l.period })
    }
    return max || 7
  }, [timetable])

  // 총 수업 수
  const totalLessons = useMemo(() => {
    let count = 0
    for (let d = 1; d <= 5; d++) count += (timetable[d] || []).length
    return count
  }, [timetable])

  if (totalLessons === 0) return null

  return (
    <div className="mini-timetable-wrap">
      <button className="mini-tt-toggle" onClick={() => setOpen(!open)}>
        📅 {open ? '시간표 접기' : '시간표 펼쳐보기'} · 주 {totalLessons}시간
      </button>
      {open && (
        <div className="mini-tt-grid-wrap">
          <table className="mini-tt-grid">
            <thead>
              <tr>
                <th className="mini-tt-corner"></th>
                {MINI_DAYS.map((name, i) => (
                  <th
                    key={i}
                    className={`mini-tt-dayhead ${dayOfWeek === i + 1 ? 'today' : ''}`}
                  >
                    {name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: maxPeriod }, (_, i) => i + 1).map((period) => (
                <tr key={period}>
                  <td className="mini-tt-period">{period}</td>
                  {MINI_DAYS.map((_, di) => {
                    const day = di + 1
                    const lesson = (timetable[day] || []).find((l) => l.period === period)
                    const isToday = dayOfWeek === day
                    if (!lesson) {
                      return <td key={day} className={`mini-tt-cell empty ${isToday ? 'today-col' : ''}`}></td>
                    }
                    const sIdx = lesson.subjectIdx ?? 0
                    const subjectColors = ['#4f46e5', '#059669']
                    const gradeColor = (config?.subjects?.length || 0) > 1 ? subjectColors[sIdx] || '#4f46e5'
                      : lesson.grade === 1 ? '#4f46e5' : lesson.grade === 2 ? '#7c3aed' : '#059669'
                    return (
                      <td
                        key={day}
                        className={`mini-tt-cell filled ${isToday ? 'today-col' : ''}`}
                        style={{ '--grade-color': gradeColor }}
                      >
                        <span className="mini-tt-class">{lesson.grade}-{lesson.classNum}</span>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          {config?.grades?.length > 0 && (
            <div className="mini-tt-legend">
              {config.grades.map((g) => {
                const multiSubj = (config.subjects?.length || 0) > 1
                const subjectColors = ['#4f46e5', '#059669']
                const color = multiSubj ? subjectColors[g.subjectIdx] || '#4f46e5'
                  : g.grade === 1 ? '#4f46e5' : g.grade === 2 ? '#7c3aed' : '#059669'
                const count = Object.values(timetable).flat().filter(
                  (l) => l.grade === g.grade && (l.subjectIdx ?? 0) === g.subjectIdx
                ).length
                return (
                  <span key={`${g.grade}-${g.subjectIdx}`} className="mini-tt-legend-item">
                    <span className="mini-tt-legend-dot" style={{ background: color }}></span>
                    {g.grade}학년 {g.textbook || ''} ({count}시간)
                  </span>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const CLASS_COLORS = [
  '#4f46e5', '#7c3aed', '#db2777', '#e11d48',
  '#ea580c', '#d97706', '#059669', '#0891b2',
  '#2563eb', '#6d28d9', '#c026d3',
]

function LessonRow({
  lesson,
  input,
  existing,
  lastRecord,
  colorIndex = 0,
  isAdded = false,
  onInputChange,
  onSave,
  onDelete,
  onRemove,
}) {
  const label = getClassLabel(lesson.grade, lesson.classNum)
  const saved = !!existing
  const accentColor = CLASS_COLORS[colorIndex % CLASS_COLORS.length]

  // 이전 진도 표시
  let prevInfo = ''
  if (lastRecord) {
    const parts = [lastRecord.unit, lastRecord.content, lastRecord.page].filter(Boolean)
    prevInfo = parts.join(' · ')
  }

  return (
    <div className={`lesson-row ${saved ? 'saved' : ''} ${isAdded ? 'added-lesson' : ''}`}>
      <div className="lesson-header">
        <span
          className="lesson-label"
          style={{ background: accentColor + '18', color: accentColor, borderLeft: `3px solid ${accentColor}` }}
        >
          {label}
        </span>
        <span className="lesson-period">{lesson.period}교시</span>
        {isAdded && <span className="added-badge">추가됨</span>}
        {saved ? (
          <span className="saved-badge">✓ 저장됨</span>
        ) : (
          <span className="pending-badge">미입력</span>
        )}
        <button className="btn-remove-lesson" onClick={onRemove} title="이 날 수업 제외">
          ✕
        </button>
      </div>

      {prevInfo && (
        <div className="prev-progress">
          <span className="prev-label">이전 진도</span>
          <span className="prev-value">{prevInfo}</span>
        </div>
      )}

      <div className="lesson-inputs">
        <input
          type="text"
          value={input.unit}
          onChange={(e) => onInputChange('unit', e.target.value)}
          placeholder="단원명"
          className="input-unit"
        />

        <input
          type="text"
          value={input.page}
          onChange={(e) => onInputChange('page', e.target.value)}
          placeholder="페이지"
          className="input-page"
        />

        <input
          type="text"
          value={input.content}
          onChange={(e) => onInputChange('content', e.target.value)}
          placeholder="수업내용"
          className="input-content"
        />

        <input
          type="text"
          value={input.period}
          onChange={(e) => onInputChange('period', e.target.value)}
          placeholder="차시"
          className="input-period"
        />

        <select
          value={input.type}
          onChange={(e) => onInputChange('type', e.target.value)}
          className="input-type"
        >
          <option value="정상수업">정상수업</option>
          <option value="보충수업">보충수업</option>
          <option value="평가">평가</option>
          <option value="휴강">휴강</option>
          <option value="기타">기타</option>
        </select>

        <input
          type="text"
          value={input.memo}
          onChange={(e) => onInputChange('memo', e.target.value)}
          placeholder="메모"
          className="input-memo"
        />

        <div className="lesson-actions">
          <button
            className="btn-save-sm"
            onClick={onSave}
            style={{ background: saved ? '#059669' : accentColor }}
          >
            {saved ? '수정' : '저장'}
          </button>
          {saved && (
            <button className="btn-del-sm" onClick={onDelete}>
              삭제
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
