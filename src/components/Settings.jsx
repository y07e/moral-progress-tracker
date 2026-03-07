import { useState, useRef } from 'react'

export default function Settings({ records, onRestore, config, onEditSetup }) {
  const [message, setMessage] = useState(null)
  const fileRef = useRef()

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 4000)
  }

  // 백업 내보내기
  const handleExport = () => {
    const data = {
      version: 1,
      exportDate: new Date().toISOString(),
      app: config ? `${config.year}학년도 ${(config.subjects || []).filter(Boolean).join('·')}과 진도 관리 프로그램` : '진도 관리 프로그램',
      records,
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const date = new Date().toISOString().slice(0, 10)
    a.download = `${(config?.subjects || []).filter(Boolean).join('·') || '진도'}_백업_${date}.json`
    a.click()
    URL.revokeObjectURL(url)
    showMessage(`백업 파일이 다운로드되었습니다. (${records.length}건)`)
  }

  // 백업 불러오기
  const handleImport = (e) => {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result)
        let importRecords = []

        if (data.version && data.records) {
          // 앱에서 내보낸 백업 파일
          importRecords = data.records
        } else if (Array.isArray(data)) {
          // 배열 형태의 레코드
          importRecords = data
        } else {
          showMessage('올바른 백업 파일이 아닙니다.', 'error')
          return
        }

        // 유효성 검사
        const valid = importRecords.filter((r) => r.id && r.date && r.grade)
        if (valid.length === 0) {
          showMessage('가져올 수 있는 기록이 없습니다.', 'error')
          return
        }

        onRestore(valid)
        showMessage(`${valid.length}건의 기록을 불러왔습니다.`)
      } catch {
        showMessage('파일을 읽을 수 없습니다. JSON 형식을 확인해주세요.', 'error')
      }
    }
    reader.readAsText(file)
    // 같은 파일 다시 선택 가능하도록
    e.target.value = ''
  }

  // 데이터 초기화
  const [confirmReset, setConfirmReset] = useState(false)
  const handleReset = () => {
    if (!confirmReset) {
      setConfirmReset(true)
      return
    }
    localStorage.removeItem('moral-progress-records')
    onRestore([])
    setConfirmReset(false)
    showMessage('모든 데이터가 초기화되었습니다.')
  }

  return (
    <div className="settings">
      <div className="settings-title-row">
        <span className="settings-icon">⚙️</span>
        <h2>설정</h2>
      </div>

      {message && (
        <div className={`settings-message ${message.type}`}>
          {message.text}
        </div>
      )}

      {/* 프로그램 설정 - 상단 강조 */}
      <div className="settings-card settings-card-highlight">
        <div className="settings-card-title">
          <span className="sc-icon">🔧</span>
          <h3>프로그램 설정</h3>
        </div>
        <p className="settings-desc">
          학교, 과목, 학년/반, 시간표, 교과서 등을 수정합니다.
        </p>
        <div className="app-info" style={{ marginBottom: 12 }}>
          <div className="info-row"><span>학교</span><span>{config?.schoolName || '-'}</span></div>
          <div className="info-row"><span>과목</span><span>{(config?.subjects || []).filter(Boolean).join(', ') || '-'}</span></div>
          <div className="info-row">
            <span>담당</span>
            <span>{config?.grades?.map((g) => `${g.grade}학년 ${g.classes.length}개반`).join(' + ') || '-'}</span>
          </div>
          {config?.grades?.map((g) => (
            <div key={`${g.grade}-${g.subjectIdx ?? 0}`} className="info-row">
              <span>{g.grade}학년 교과서</span>
              <span>{[g.curriculumRevision && `${g.curriculumRevision}개정`, g.publisher, g.textbook].filter(Boolean).join(' · ') || '-'}</span>
            </div>
          ))}
        </div>
        <button className="btn-primary btn-lg" onClick={onEditSetup}>
          ✏️ 설정 편집
        </button>
      </div>

      {/* 데이터 백업 */}
      <div className="settings-card">
        <div className="settings-card-title">
          <span className="sc-icon">💾</span>
          <h3>데이터 백업</h3>
        </div>
        <p className="settings-desc">
          현재 저장된 수업 기록을 JSON 파일로 다운로드합니다.
          다른 기기로 옮기거나 브라우저 데이터 삭제 전에 백업하세요.
        </p>
        <div className="settings-info">
          <span>현재 저장된 기록: <strong>{records.length}건</strong></span>
        </div>
        <button className="btn-primary" onClick={handleExport} disabled={records.length === 0}>
          📥 백업 파일 다운로드
        </button>
      </div>

      {/* 데이터 복원 */}
      <div className="settings-card">
        <div className="settings-card-title">
          <span className="sc-icon">📤</span>
          <h3>데이터 복원</h3>
        </div>
        <p className="settings-desc">
          이전에 백업한 JSON 파일을 불러와 데이터를 복원합니다.
          기존 데이터에 덮어씌워집니다.
        </p>
        <input
          ref={fileRef}
          type="file"
          accept=".json"
          onChange={handleImport}
          style={{ display: 'none' }}
        />
        <button className="btn-secondary" onClick={() => fileRef.current.click()}>
          📂 백업 파일 불러오기
        </button>
      </div>

      {/* 데이터 초기화 */}
      <div className="settings-card settings-card-danger">
        <div className="settings-card-title">
          <span className="sc-icon">⚠️</span>
          <h3>데이터 초기화</h3>
        </div>
        <p className="settings-desc">
          모든 수업 기록을 삭제합니다. 이 작업은 되돌릴 수 없으니
          반드시 백업 후 진행하세요.
        </p>
        {confirmReset ? (
          <div className="confirm-reset">
            <span className="confirm-text">정말 모든 데이터를 삭제하시겠습니까?</span>
            <div className="confirm-actions">
              <button className="btn-danger" onClick={handleReset}>삭제 확인</button>
              <button className="btn-secondary" onClick={() => setConfirmReset(false)}>취소</button>
            </div>
          </div>
        ) : (
          <button className="btn-danger" onClick={handleReset}>🗑️ 전체 데이터 초기화</button>
        )}
      </div>

      {/* 앱 정보 */}
      <div className="settings-card">
        <div className="settings-card-title">
          <span className="sc-icon">ℹ️</span>
          <h3>앱 정보</h3>
        </div>
        <div className="app-info">
          <div className="info-row"><span>프로그램</span><span>{config ? `${config.year}학년도 ${(config.subjects || []).filter(Boolean).join('·')}과 진도 관리` : '진도 관리 프로그램'}</span></div>
          <div className="info-row"><span>저장 방식</span><span>브라우저 localStorage</span></div>
        </div>
      </div>
    </div>
  )
}
