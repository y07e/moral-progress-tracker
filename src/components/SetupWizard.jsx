import { useState, useRef } from 'react'

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

const EMPTY_TIMETABLE = () => ({ 1: [], 2: [], 3: [], 4: [], 5: [] })

/**
 * 붙여넣은 시간표 텍스트 파싱 (컴시간알리미/엑셀에서 표 복사 → 탭 구분)
 * 지원 형식: "107도덕"(1학년 7반), "311도덕"(3학년 11반), "1-7", "3-11"
 * 과목명이 있는 칸은 현재 과목명이 포함된 것만 인식 (창체 등 제외)
 */
function parsePastedTimetable(text, subjectName, subjectIdx) {
  const tt = EMPTY_TIMETABLE()
  const lines = text.split(/\r?\n/).map((l) => l.replace(/\u00a0/g, " "))
  let period = 0
  let count = 0
  for (const rawLine of lines) {
    if (!rawLine.trim()) continue
    // 요일 헤더 행 스킵 (수업 코드 없이 요일만 있는 행)
    if (/[월화수목금]/.test(rawLine) && !/\d{3}|\d+\s*-\s*\d+/.test(rawLine)) continue
    let cells = rawLine.split('\t')
    if (cells.length < 2) continue
    // 첫 칸이 교시 라벨("1(09:00)", "3교시", "5")이면 교시 번호로 사용
    const first = cells[0].trim()
    const periodMatch = first.match(/^(\d{1,2})\s*(\(|교시|:|$)/)
    const looksLikeLesson = /^\*?\d{3}/.test(first) || /^\d+\s*-\s*\d+/.test(first)
    if (periodMatch && !looksLikeLesson) {
      period = Number(periodMatch[1])
      cells = cells.slice(1)
    } else if (first === '' || first === '교시') {
      cells = cells.slice(1)
      period += 1
    } else {
      period += 1
    }
    if (period < 1 || period > MAX_PERIODS) continue
    cells.slice(0, 5).forEach((cell, dayIdx) => {
      const c = cell.trim()
      if (!c) return
      // 과목명이 붙어 있는 칸은 현재 과목만 인식 (예: "*109A_창체" 제외)
      if (/[가-힣]/.test(c) && subjectName && !c.includes(subjectName)) return
      let grade, classNum
      const dash = c.match(/^\*?(\d+)\s*-\s*(\d+)/)
      const code = c.match(/^\*?(\d)(\d{2})/)
      if (dash) { grade = Number(dash[1]); classNum = Number(dash[2]) }
      else if (code) { grade = Number(code[1]); classNum = Number(code[2]) }
      else return
      if (grade <= 0 || classNum <= 0) return
      tt[dayIdx + 1].push({ period, grade, classNum, subjectIdx })
      count += 1
    })
  }
  Object.values(tt).forEach((l) => l.sort((a, b) => a.period - b.period))
  return { timetable: tt, count }
}

/** 모든 학기 시간표에서 학급 목록(합집합) 추출. 기존 교과서 정보는 유지 */
function gradesFromTimetables(timetables, subjects, existingGrades = []) {
  const gradeMap = {}
  Object.values(timetables || {}).forEach((tt) => {
    Object.values(tt || {}).forEach((lessons) => {
      ;(lessons || []).forEach((l) => {
        const subjectIdx = l.subjectIdx ?? 0
        const gKey = `${l.grade}-${subjectIdx}`
        if (!gradeMap[gKey]) gradeMap[gKey] = { grade: l.grade, subjectIdx, classes: new Set() }
        gradeMap[gKey].classes.add(l.classNum)
      })
    })
  })
  return Object.values(gradeMap)
    .sort((a, b) => a.subjectIdx - b.subjectIdx || a.grade - b.grade)
    .map((info) => {
      const existing = existingGrades.find((eg) => eg.grade === info.grade && eg.subjectIdx === info.subjectIdx)
      return {
        grade: info.grade,
        subjectIdx: info.subjectIdx,
        classes: [...info.classes].sort((a, b) => a - b),
        textbook: existing?.textbook || subjects[info.subjectIdx] || '',
        curriculumRevision: existing?.curriculumRevision || '',
        publisher: existing?.publisher || '',
      }
    })
}

export default function SetupWizard({ initialConfig, onComplete, onRestoreFromBackup }) {
  const [step, setStep] = useState(0)
  const [restoreMsg, setRestoreMsg] = useState(null)
  const restoreRef = useRef()
  const [config, setConfig] = useState(
    initialConfig || {
      schoolName: '',
      subjects: ['', ''],
      year: new Date().getFullYear(),
      semester: 1,
      grades: [],
      timetable: EMPTY_TIMETABLE(),
      timetables: {},
      semester2Start: '',
    }
  )

  const handleRestoreFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result)
        if (data.version && data.records && data.config) {
          const valid = data.records.filter((r) => r.id && r.date && r.grade)
          onRestoreFromBackup(valid, data.config)
          onComplete(data.config)
        } else if (data.version && data.records) {
          setRestoreMsg({ text: '이 백업 파일에는 설정 정보가 없습니다. 설정을 먼저 완료해주세요.', type: 'error' })
        } else {
          setRestoreMsg({ text: '올바른 백업 파일이 아닙니다.', type: 'error' })
        }
      } catch {
        setRestoreMsg({ text: '파일을 읽을 수 없습니다.', type: 'error' })
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

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
      const currentHas = Object.values(config.timetable).some((d) => d.length > 0)
      const otherHas = Object.values(config.timetables || {}).some(
        (tt) => tt && Object.values(tt).some((d) => d?.length > 0)
      )
      return currentHas || otherHas
    }
    if (step === 1) {
      return config.grades.every((g) => g.curriculumRevision && g.textbook?.trim())
    }
    return true
  }

  const handleFinish = () => {
    const cleanSubjects = subjects.filter(Boolean)
    const timetables = { ...(config.timetables || {}), [config.semester]: config.timetable }
    const grades = gradesFromTimetables(timetables, cleanSubjects, config.grades)
    onComplete({ ...config, subjects: cleanSubjects, timetables, grades })
  }

  return (
    <div className="setup-wizard">
      <div className="setup-header">
        <h1>진도 관리 프로그램 설정</h1>
        <p className="setup-desc">아래 단계를 따라 설정해주세요.</p>
        {onRestoreFromBackup && !initialConfig && (
          <div className="setup-restore">
            <input ref={restoreRef} type="file" accept=".json" onChange={handleRestoreFile} style={{ display: 'none' }} />
            <button className="btn-setup-restore" onClick={() => restoreRef.current.click()}>
              📂 백업 파일에서 복원하기
            </button>
            {restoreMsg && <p className={`setup-restore-msg ${restoreMsg.type}`}>{restoreMsg.text}</p>}
          </div>
        )}
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
        {step === 0 && <StepTimetableGrid key={config.semester} config={config} setConfig={setConfig} update={update} subjects={subjects} updateSubject={updateSubject} />}
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

    const { timetable } = parseTimetableGrid(newGrid, newGridSubjects, subjects)

    setConfig((prev) => {
      const timetables = { ...(prev.timetables || {}), [prev.semester]: timetable }
      const grades = gradesFromTimetables(timetables, subjects, prev.grades)
      return { ...prev, timetable, timetables, grades }
    })
  }

  // 학기 전환: 현재 학기 시간표를 저장하고 새 학기 시간표를 불러온다 (key 변경으로 그리드 재초기화)
  const changeSemester = (newSem) => {
    if (newSem === config.semester) return
    setConfig((prev) => {
      const timetables = { ...(prev.timetables || {}), [prev.semester]: prev.timetable }
      const nextTt = timetables[newSem] || EMPTY_TIMETABLE()
      let semester2Start = prev.semester2Start
      if (newSem === 2 && !semester2Start) {
        const d = new Date()
        semester2Start = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      }
      return { ...prev, semester: newSem, timetables, timetable: nextTt, semester2Start }
    })
  }

  // 시간표 객체를 그리드에 한 번에 반영 (붙여넣기/복사용)
  const applyTimetable = (tt) => {
    const newGrid = {}
    const newGridSubjects = {}
    Object.entries(tt).forEach(([day, lessons]) => {
      ;(lessons || []).forEach((l) => {
        newGrid[`${day}-${l.period}`] = `${l.grade}-${l.classNum}`
        newGridSubjects[`${day}-${l.period}`] = l.subjectIdx ?? 0
      })
    })
    setGrid(newGrid)
    setGridSubjects(newGridSubjects)
    setConfig((prev) => {
      const timetables = { ...(prev.timetables || {}), [prev.semester]: tt }
      const grades = gradesFromTimetables(timetables, subjects, prev.grades)
      return { ...prev, timetable: tt, timetables, grades }
    })
  }

  // 붙여넣기 입력
  const [showPaste, setShowPaste] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const [pasteMsg, setPasteMsg] = useState(null)

  const handlePasteApply = () => {
    const { timetable, count } = parsePastedTimetable(pasteText, subjects[activeSubjectIdx], activeSubjectIdx)
    if (count === 0) {
      setPasteMsg({ type: 'error', text: '수업을 인식하지 못했습니다. 컴시간알리미나 엑셀에서 시간표 표를 그대로 복사해 붙여넣어주세요.' })
      return
    }
    applyTimetable(timetable)
    setPasteMsg({ type: 'success', text: `${count}개 수업을 인식해서 입력했습니다. 아래 그리드에서 확인 후 필요하면 수정하세요.` })
    setPasteText('')
  }

  // 다른 학기 시간표 복사
  const otherSem = config.semester === 1 ? 2 : 1
  const otherTimetable = config.timetables?.[otherSem]
  const otherHasLessons = otherTimetable && Object.values(otherTimetable).some((d) => d?.length > 0)

  const handleCopyOther = () => {
    if (!otherHasLessons) return
    // 깊은 복사 후 현재 학기로 반영
    applyTimetable(JSON.parse(JSON.stringify(otherTimetable)))
    setPasteMsg({ type: 'success', text: `${otherSem}학기 시간표를 복사했습니다. 바뀐 수업만 수정하면 됩니다.` })
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
          <select value={config.semester} onChange={(e) => changeSemester(Number(e.target.value))}>
            <option value={1}>1학기</option>
            <option value={2}>2학기</option>
          </select>
        </div>
        {(config.semester === 2 || config.semester2Start) && (
          <div className="setup-field compact">
            <label>2학기 시작일</label>
            <input
              type="date"
              value={config.semester2Start || ''}
              onChange={(e) => update('semester2Start', e.target.value)}
            />
          </div>
        )}
      </div>

      <p className="setup-hint">
        학기별 시간표는 따로 저장됩니다. 위에서 학기를 전환하면 해당 학기의 시간표를 입력·수정할 수 있고,
        달력과 수업 기록 화면에는 날짜에 맞는 학기의 시간표가 자동으로 적용됩니다.
      </p>

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

      <div className="tt-quick-input" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <button type="button" className="btn-secondary btn-sm" onClick={() => { setShowPaste(!showPaste); setPasteMsg(null) }}>
          📋 {showPaste ? '붙여넣기 입력 닫기' : '붙여넣기로 한 번에 입력'}
        </button>
        {otherHasLessons && (
          <button type="button" className="btn-secondary btn-sm" onClick={handleCopyOther}>
            📄 {otherSem}학기 시간표 복사해오기
          </button>
        )}
      </div>

      {showPaste && (
        <div className="tt-paste-box" style={{ marginBottom: 12 }}>
          <p className="setup-hint" style={{ marginBottom: 6 }}>
            컴시간알리미 화면이나 엑셀에서 시간표 표를 그대로 복사(Ctrl+C)해서 아래에 붙여넣고 "시간표 인식"을 누르세요.
            "107도덕"(1학년 7반), "311도덕"(3학년 11반), "1-7" 형식을 인식하며, 다른 과목·창체는 자동으로 제외됩니다.
          </p>
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder={'예)\n1(09:00)\t\t107도덕\t\t108도덕\t106도덕\n2(09:55)\t\t109도덕\t101도덕\t102도덕\t'}
            rows={6}
            style={{ width: '100%', fontFamily: 'monospace', fontSize: 13, padding: 8, border: '1px solid #d1d5db', borderRadius: 8, boxSizing: 'border-box' }}
          />
          <button type="button" className="btn-primary btn-sm" style={{ marginTop: 6 }} onClick={handlePasteApply} disabled={!pasteText.trim()}>
            ✔ 시간표 인식
          </button>
        </div>
      )}

      {pasteMsg && (
        <p className="setup-hint" style={{ color: pasteMsg.type === 'error' ? '#dc2626' : '#059669', fontWeight: 600, marginBottom: 10 }}>
          {pasteMsg.text}
        </p>
      )}

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
