import { useState, useMemo } from 'react'
import { getLessonsForDate, getClassLabel, DAY_NAMES, getLocalDateStr } from '../data/timetable'
import { getCurriculumForGrade, getTotalSubunits, findSubunitInfo } from '../data/curriculum'

export default function DailyInput({ records, onSave, onDelete }) {
  const [selectedDate, setSelectedDate] = useState(
    () => getLocalDateStr()
  )

  const dayOfWeek = new Date(selectedDate).getDay()
  const dayName = DAY_NAMES[dayOfWeek]
  const lessons = getLessonsForDate(selectedDate)
  const isToday = selectedDate === getLocalDateStr()

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

  // 전체 진도 통계
  const overallStats = useMemo(() => {
    const g1Recs = records.filter((r) => r.grade === 1)
    const g3Recs = records.filter((r) => r.grade === 3)
    const g1Subs = new Set()
    const g3Subs = new Set()
    g1Recs.forEach((r) => { if (r.subunitId) g1Subs.add(r.subunitId) })
    g3Recs.forEach((r) => { if (r.subunitId) g3Subs.add(r.subunitId) })
    const g1Total = getTotalSubunits(getCurriculumForGrade(1))
    const g3Total = getTotalSubunits(getCurriculumForGrade(3))
    return {
      g1Done: g1Subs.size, g1Total,
      g3Done: g3Subs.size, g3Total,
      totalRecords: records.length,
    }
  }, [records])

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
        subunitId: existing.subunitId || '',
        period: existing.period || '',
        type: existing.type || '정상수업',
        memo: existing.memo || '',
      }
    }
    return inputs[key] || { subunitId: '', period: '', type: '정상수업', memo: '' }
  }

  const setInput = (grade, classNum, field, value) => {
    const key = `${grade}-${classNum}`
    setInputs((prev) => ({
      ...prev,
      [key]: { ...getInput(grade, classNum), [field]: value },
    }))
  }

  // 1학년 전체에 같은 단원 적용
  const applyToAll1st = (subunitId) => {
    setInputs((prev) => {
      const next = { ...prev }
      lessons
        .filter((l) => l.grade === 1)
        .forEach((l) => {
          const key = `${l.grade}-${l.classNum}`
          next[key] = { ...getInput(l.grade, l.classNum), subunitId }
        })
      return next
    })
  }

  const handleSave = (grade, classNum) => {
    const key = `${grade}-${classNum}`
    const input = getInput(grade, classNum)
    const existing = existingByKey[key]

    const record = {
      id: existing?.id || `${selectedDate}-${key}`,
      date: selectedDate,
      grade,
      classNum,
      subunitId: input.subunitId,
      period: input.period,
      type: input.type,
      memo: input.memo,
    }
    onSave(record)
  }

  const handleSaveAll = () => {
    lessons.forEach((l) => {
      const input = getInput(l.grade, l.classNum)
      if (input.subunitId) {
        handleSave(l.grade, l.classNum)
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

  // 1학년 수업과 3학년 수업 분리
  const grade1Lessons = lessons.filter((l) => l.grade === 1)
  const grade3Lessons = lessons.filter((l) => l.grade === 3)

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
          <div className="summary-stat">
            <span className="stat-icon">📖</span>
            <span className="stat-number">{overallStats.g1Done}/{overallStats.g1Total}</span>
            <span className="stat-desc">1학년 진도</span>
          </div>
          <div className="summary-stat">
            <span className="stat-icon">📝</span>
            <span className="stat-number">{overallStats.g3Done}/{overallStats.g3Total}</span>
            <span className="stat-desc">3학년 진도</span>
          </div>
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

      {lessons.length === 0 ? (
        <div className="no-lessons-card">
          <div className="no-lessons-icon">🌸</div>
          <p className="no-lessons-title">수업 없는 날</p>
          <p className="no-lessons-desc">
            {dayOfWeek === 0 || dayOfWeek === 6
              ? '주말에는 수업이 없습니다. 편안한 휴일 보내세요!'
              : '오늘은 도덕 수업이 배정되지 않은 날입니다.'}
          </p>
        </div>
      ) : (
        <>
          {/* 1학년 수업 */}
          {grade1Lessons.length > 0 && (
            <div className="grade-section grade-1">
              <div className="grade-section-header">
                <div className="grade-title-area">
                  <span className="grade-emoji">📗</span>
                  <h3>1학년 도덕①</h3>
                  <span className="grade-count-badge">{grade1Lessons.length}개 반</span>
                </div>
                <div className="grade-actions">
                  <select
                    className="bulk-select"
                    onChange={(e) => {
                      if (e.target.value) applyToAll1st(e.target.value)
                    }}
                    defaultValue=""
                  >
                    <option value="">동일 단원 일괄 적용...</option>
                    {getCurriculumForGrade(1).map((unit) => (
                      <optgroup key={unit.id} label={unit.title}>
                        {unit.subunits.map((sub) => (
                          <option key={sub.id} value={sub.id}>
                            {sub.title}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <button className="btn-primary btn-save-all" onClick={handleSaveAll}>
                    전체 저장
                  </button>
                </div>
              </div>

              <div className="lessons-list">
                {grade1Lessons.map((lesson, idx) => (
                  <LessonRow
                    key={`${lesson.grade}-${lesson.classNum}`}
                    lesson={lesson}
                    input={getInput(lesson.grade, lesson.classNum)}
                    existing={existingByKey[`${lesson.grade}-${lesson.classNum}`]}
                    lastRecord={lastRecordByClass[`${lesson.grade}-${lesson.classNum}`]}
                    curriculum={getCurriculumForGrade(lesson.grade)}
                    colorIndex={idx}
                    onInputChange={(field, val) =>
                      setInput(lesson.grade, lesson.classNum, field, val)
                    }
                    onSave={() => handleSave(lesson.grade, lesson.classNum)}
                    onDelete={() => handleDelete(lesson.grade, lesson.classNum)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 3학년 수업 */}
          {grade3Lessons.length > 0 && (
            <div className="grade-section grade-3">
              <div className="grade-section-header grade-3-header">
                <div className="grade-title-area">
                  <span className="grade-emoji">📘</span>
                  <h3>3학년 도덕②</h3>
                  <span className="grade-count-badge">{grade3Lessons.length}개 반</span>
                </div>
              </div>
              <div className="lessons-list">
                {grade3Lessons.map((lesson, idx) => (
                  <LessonRow
                    key={`${lesson.grade}-${lesson.classNum}`}
                    lesson={lesson}
                    input={getInput(lesson.grade, lesson.classNum)}
                    existing={existingByKey[`${lesson.grade}-${lesson.classNum}`]}
                    lastRecord={lastRecordByClass[`${lesson.grade}-${lesson.classNum}`]}
                    curriculum={getCurriculumForGrade(lesson.grade)}
                    colorIndex={idx}
                    onInputChange={(field, val) =>
                      setInput(lesson.grade, lesson.classNum, field, val)
                    }
                    onSave={() => handleSave(lesson.grade, lesson.classNum)}
                    onDelete={() => handleDelete(lesson.grade, lesson.classNum)}
                  />
                ))}
              </div>
            </div>
          )}
        </>
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
  curriculum,
  colorIndex = 0,
  onInputChange,
  onSave,
  onDelete,
}) {
  const label = getClassLabel(lesson.grade, lesson.classNum)
  const saved = !!existing
  const accentColor = CLASS_COLORS[colorIndex % CLASS_COLORS.length]

  // 이전 진도 표시
  let prevInfo = ''
  if (lastRecord && lastRecord.subunitId) {
    const info = findSubunitInfo(curriculum, lastRecord.subunitId)
    if (info) {
      prevInfo = `${info.sub.title} ${lastRecord.period || ''}`
    }
  }

  return (
    <div className={`lesson-row ${saved ? 'saved' : ''}`}>
      <div className="lesson-header">
        <span
          className="lesson-label"
          style={{ background: accentColor + '18', color: accentColor, borderLeft: `3px solid ${accentColor}` }}
        >
          {label}
        </span>
        <span className="lesson-period">{lesson.period}교시</span>
        {saved ? (
          <span className="saved-badge">✓ 저장됨</span>
        ) : (
          <span className="pending-badge">미입력</span>
        )}
      </div>

      {prevInfo && (
        <div className="prev-progress">
          <span className="prev-label">이전 진도</span>
          <span className="prev-value">{prevInfo}</span>
        </div>
      )}

      <div className="lesson-inputs">
        <select
          value={input.subunitId}
          onChange={(e) => onInputChange('subunitId', e.target.value)}
          className="input-unit"
        >
          <option value="">-- 단원 선택 --</option>
          {curriculum.map((unit) => (
            <optgroup key={unit.id} label={unit.title}>
              {unit.subunits.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.title}
                </option>
              ))}
            </optgroup>
          ))}
        </select>

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
