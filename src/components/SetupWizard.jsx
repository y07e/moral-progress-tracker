import { useState } from 'react'

const STEPS = ['시간표 설정', '교과서 설정']

const DAYS = [
  { id: 1, name: '월' },
  { id: 2, name: '화' },
  { id: 3, name: '수' },
  { id: 4, name: '목' },
  { id: 5, name: '금' },
]

const MAX_PERIODS = 7
const SUBJECT_COLORS = ['#4f46e5', '#059669']

/** 그리드 데이터 → timetable + grades 자동 추출 */
function parseTimetableGrid(grid, gridSubjects, subjects) {
  const timetable = { 1: [], 2: [], 3: [], 4: [], 5: [] }
  const gradeMap = {}

  Object.entries(grid).forEach(([key, value]) => {
    if (!value || !value.trim()) return
    const [day, period] = key.split('-').map(Number)
    const match = value.trim().match(/^(\d+)-(\d+)$/)
    if (!match) return
    const grade = Number(match[1])
    const classNum = Number(match[2])
    const subjectIdx = gridSubjects[key] ?? 0
    if (grade <= 0 || classNum <= 0 || !timetable[day]) return

    timetable[day].push({ period, grade, classNum, subjectIdx })

    const gKey = `${grade}-${subjectIdx}`
    if (!gradeMap[gKey]) gradeMap[gKey] = { grade, subjectIdx, classes: new Set() }
    gradeMap[gKey].classes.add(classNum)
  })

  Object.values(timetable).forEach((l) => l.sort((a, b) => a.period - b.period))

  const grades = Object.values(gradeMap)
    .sort((a, b) => a.subjectIdx - b.subjectIdx || a.grade - b.grade)
    .map((info) => ({
      grade: info.grade,
      subjectIdx: info.subjectIdx,
      classes: [...info.classes].sort((a, b) => a - b),
      textbook: subjects[info.subjectIdx] || '',
    }))

  return { timetable, grades }
}

export default function SetupWizard({ initialConfig, onComplete }) {
  const [step, setStep] = useState(0)
  const [config, setConfig] = useState(
    initialConfig || {
      schoolName: '',
      subjects: ['', ''],
      year: new Date().getFullYear(),
      semester: 1,
      grades: [],
      timetable: { 1: [], 2: [], 3: [], 4: [], 5: [] },
    }
  )

  const subjects = (() => {
    const s = config.subjects || ['', '']
    return s.length >= 2 ? s : [s[0] || '', s[1] || '']
  })()

  const updateSubject = (idx, value) => {
    const newSubjects = [...subjects]
    newSubjects[idx] = value
    setConfig((prev) => ({ ...prev, subjects: newSubjects }))
  }

  const update = (field, value) => setConfig((prev) => ({ ...prev, [field]: value }))

  const canNext = () => {
    if (step === 0) {
      if (!config.schoolName || !subjects[0]) return false
      return Object.values(config.timetable).some((d) => d.length > 0)
    }
    if (step === 1) {
      return config.grades.every((g) => g.curriculumRevision && g.textbook?.trim())
    }
    return true
  }

  const handleFinish = () => {
    const cleanSubjects = subjects.filter(Boolean)
    onComplete({ ...config, subjects: cleanSubjects })
  }

  return (
    <div className="setup-wizard">
      <div className="setup-header">
        <h1>진도 관리 프로그램 설정</h1>
        <p className="setup-desc">아래 단계를 따라 설정해주세요.</p>
      </div>

      <div className="setup-steps">
        {STEPS.map((label, i) => (
          <div key={i} className={`setup-step ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}>
            <span className="step-num">{i < step ? '✓' : i + 1}</span>
            <span className="step-label">{label}</span>
          </div>
        ))}
      </div>

      <div className="setup-body">
        {step === 0 && <StepTimetableGrid config={config} setConfig={setConfig} update={update} subjects={subjects} updateSubject={updateSubject} />}
        {step === 1 && <StepTextbook config={config} setConfig={setConfig} subjects={subjects} />}
      </div>

      <div className="setup-footer">
        {step > 0 && (
          <button className="btn-setup-prev" onClick={() => setStep(step - 1)}>이전</button>
        )}
        {step < STEPS.length - 1 ? (
          <button className="btn-setup-next" onClick={() => setStep(step + 1)} disabled={!canNext()}>다음</button>
        ) : (
          <button className="btn-setup-finish" onClick={handleFinish} disabled={!canNext()}>설정 완료</button>
        )}
      </div>
    </div>
  )
}

/* ===== Step 1: 기본 정보 + 시간표 그리드 ===== */
function StepTimetableGrid({ config, setConfig, update, subjects, updateSubject }) {
  const hasSecond = !!subjects[1]
  const [activeSubjectIdx, setActiveSubjectIdx] = useState(0)

  const [grid, setGrid] = useState(() => {
    const initial = {}
    if (config.timetable) {
      Object.entries(config.timetable).forEach(([day, lessons]) => {
        if (Array.isArray(lessons)) {
          lessons.forEach((l) => { initial[`${day}-${l.period}`] = `${l.grade}-${l.classNum}` })
        }
      })
    }
    return initial
  })

  const [gridSubjects, setGridSubjects] = useState(() => {
    const initial = {}
    if (config.timetable) {
      Object.entries(config.timetable).forEach(([day, lessons]) => {
        if (Array.isArray(lessons)) {
          lessons.forEach((l) => { initial[`${day}-${l.period}`] = l.subjectIdx ?? 0 })
        }
      })
    }
    return initial
  })

  const handleCellChange = (day, period, value) => {
    const key = `${day}-${period}`
    const newGrid = { ...grid, [key]: value }
    setGrid(newGrid)

    const newGridSubjects = { ...gridSubjects }
    if (value && value.trim()) {
      newGridSubjects[key] = activeSubjectIdx
    } else {
      delete newGridSubjects[key]
    }
    setGridSubjects(newGridSubjects)

    const { timetable, grades } = parseTimetableGrid(newGrid, newGridSubjects, subjects)

    const existingGrades = config.grades || []
    grades.forEach((g) => {
      const existing = existingGrades.find((eg) => eg.grade === g.grade && eg.subjectIdx === g.subjectIdx)
      if (existing) {
        if (existing.textbook) g.textbook = existing.textbook
        if (existing.curriculumRevision) g.curriculumRevision = existing.curriculumRevision
        if (existing.publisher) g.publisher = existing.publisher
      }
    })

    setConfig((prev) => ({ ...prev, timetable, grades }))
  }

  const filledCount = Object.values(grid).filter((v) => v && /^\d+-\d+$/.test(v.trim())).length

  return (
    <div className="setup-section">
      <h2>시간표 설정</h2>

      <div className="setup-row">
        <div className="setup-field compact">
          <label>학교</label>
          <input type="text" value={config.schoolName} onChange={(e) => update('schoolName', e.target.value)} placeholder="예: 양산여자중학교" />
        </div>
        <div className="setup-field compact">
          <label>과목 1</label>
          <input type="text" value={subjects[0]} onChange={(e) => updateSubject(0, e.target.value)} placeholder="예: 도덕" />
        </div>
        <div className="setup-field compact">
          <label>과목 2 (선택)</label>
          <input type="text" value={subjects[1] || ''} onChange={(e) => updateSubject(1, e.target.value)} placeholder="미입력시 1과목" />
        </div>
      </div>
      <div className="setup-row">
        <div className="setup-field compact">
          <label>학년도</label>
          <input type="number" value={config.year} onChange={(e) => update('year', Number(e.target.value))} />
        </div>
        <div className="setup-field compact">
          <label>학기</label>
          <select value={config.semester} onChange={(e) => update('semester', Number(e.target.value))}>
            <option value={1}>1학기</option>
            <option value={2}>2학기</option>
          </select>
        </div>
      </div>

      {subjects[0] && (
        <div className="tt-grid-title">
          {config.year}학년도 {config.semester}학기 {subjects.filter(Boolean).join('·')} 시간표
        </div>
      )}

      {hasSecond && (
        <div className="subject-toggle-bar">
          <span className="subject-toggle-label">입력 과목:</span>
          {subjects.filter(Boolean).map((s, i) => (
            <button key={i} className={`subject-toggle-btn ${activeSubjectIdx === i ? 'active' : ''}`}
              style={{ '--subj-color': SUBJECT_COLORS[i] }}
              onClick={() => setActiveSubjectIdx(i)}>
              {s}
            </button>
          ))}
        </div>
      )}

      <p className="setup-hint">
        각 칸에 "학년-반" 형식으로 입력하세요. (예: 1-9, 3-11)
        {hasSecond && ' · 과목을 선택한 후 입력하면 해당 과목으로 배정됩니다.'}
      </p>

      <div className="tt-grid-wrapper">
        <table className="tt-grid">
          <thead>
            <tr>
              <th className="tt-grid-corner"></th>
              {DAYS.map((d) => (<th key={d.id} className="tt-grid-dayhead">{d.name}</th>))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: MAX_PERIODS }, (_, i) => i + 1).map((period) => (
              <tr key={period}>
                <td className="tt-grid-period">{period}</td>
                {DAYS.map((d) => {
                  const key = `${d.id}-${period}`
                  const value = grid[key] || ''
                  const isFilled = /^\d+-\d+$/.test(value.trim())
                  const cellSubjectIdx = gridSubjects[key] ?? 0
                  const cellColor = SUBJECT_COLORS[cellSubjectIdx]
                  return (
                    <td key={key} className={`tt-grid-cell ${isFilled ? 'filled' : ''}`}>
                      <input type="text" value={value}
                        onChange={(e) => handleCellChange(d.id, period, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            const nextDay = d.id < 5 ? d.id + 1 : 1
                            const nextPeriod = d.id < 5 ? period : period + 1
                            if (nextPeriod <= MAX_PERIODS) {
                              document.querySelector(`[data-cell="${nextDay}-${nextPeriod}"]`)?.focus()
                            }
                          }
                        }}
                        data-cell={key} className="tt-grid-input" placeholder="·" />
                      {isFilled && (
                        <span className="tt-grid-subject" style={hasSecond ? { color: cellColor } : undefined}>
                          {hasSecond ? (subjects[cellSubjectIdx] || '') : (subjects[0] || '')}
                        </span>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {config.grades?.length > 0 && (
        <div className="tt-derived-info">
          <strong>감지된 학급:</strong>{' '}
          {config.grades.map((g) => {
            const subjName = hasSecond ? ` [${subjects[g.subjectIdx] || ''}]` : ''
            return `${g.grade}학년 ${g.classes.length}개반${subjName}`
          }).join(' · ')}
          <span className="tt-derived-count"> — 총 {filledCount}개 수업</span>
        </div>
      )}
    </div>
  )
}

/* ===== Step 2: 교과서 설정 ===== */
function StepTextbook({ config, setConfig, subjects }) {
  const hasSecond = subjects.filter(Boolean).length > 1

  const updateGradeField = (grade, subjectIdx, field, value) => {
    setConfig((prev) => ({
      ...prev,
      grades: prev.grades.map((g) =>
        g.grade === grade && g.subjectIdx === subjectIdx ? { ...g, [field]: value } : g
      ),
    }))
  }

  const subjectGroups = subjects.filter(Boolean).map((name, sIdx) => ({
    name, subjectIdx: sIdx,
    grades: config.grades.filter((g) => g.subjectIdx === sIdx),
  })).filter((sg) => sg.grades.length > 0)

  return (
    <div className="setup-section">
      <h2>교과서 설정</h2>
      <p className="setup-hint">학년별 교과서 정보를 입력하세요.</p>

      {subjectGroups.map((sg) => (
        <div key={sg.subjectIdx}>
          {hasSecond && (
            <div className="textbook-subject-header">
              <span className="textbook-subject-badge"
                style={{ background: SUBJECT_COLORS[sg.subjectIdx] }}>
                {sg.name}
              </span>
            </div>
          )}
          {sg.grades.map((g) => (
            <div key={`${g.grade}-${g.subjectIdx}`} className="textbook-grade-card">
              <div className="textbook-grade-header">
                <span className="textbook-grade-label">{g.grade}학년</span>
                <span className="textbook-grade-info">{g.classes.length}개반 ({g.classes.join(', ')}반)</span>
              </div>
              <div className="setup-row">
                <div className="setup-field compact">
                  <label>교육과정</label>
                  <select value={g.curriculumRevision || ''}
                    onChange={(e) => updateGradeField(g.grade, g.subjectIdx, 'curriculumRevision', e.target.value)}>
                    <option value="">-- 선택 --</option>
                    <option value="2015">2015개정</option>
                    <option value="2022">2022개정</option>
                  </select>
                </div>
                <div className="setup-field compact">
                  <label>출판사</label>
                  <input type="text" value={g.publisher || ''}
                    onChange={(e) => updateGradeField(g.grade, g.subjectIdx, 'publisher', e.target.value)}
                    placeholder="예: 동아출판" />
                </div>
                <div className="setup-field compact">
                  <label>교과서명</label>
                  <input type="text" value={g.textbook || ''}
                    onChange={(e) => updateGradeField(g.grade, g.subjectIdx, 'textbook', e.target.value)}
                    placeholder={`예: ${subjects[g.subjectIdx] || '과목'}${g.grade}`} />
                </div>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
