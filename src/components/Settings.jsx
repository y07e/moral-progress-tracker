import { useState, useRef, useEffect } from 'react'
import {
  isFileSystemAccessSupported,
  isAutoBackupEnabled,
  setAutoBackupEnabled,
  getBackupTime,
  setBackupTime,
  getBackupMode,
  setBackupMode,
  getLastBackupDate,
  pickBackupDirectory,
  getSavedDirName,
  performBackup,
  requestPermission,
  checkFolderPermission,
} from '../utils/autoBackup'

export default function Settings({ records, onRestore, config, onEditSetup }) {
  const [message, setMessage] = useState(null)
  const fileRef = useRef()

  // 자동 백업 상태
  const [autoEnabled, setAutoEnabled] = useState(isAutoBackupEnabled)
  const [backupTime, setBackupTimeState] = useState(getBackupTime)
  const [backupModeState, setBackupModeState] = useState(getBackupMode)
  const [backupDirName, setBackupDirName] = useState(null)
  const [folderPerm, setFolderPerm] = useState(null) // 'granted' | 'prompt' | 'denied' | 'none'
  const [lastBackup, setLastBackup] = useState(getLastBackupDate)

  useEffect(() => {
    getSavedDirName().then((name) => setBackupDirName(name))
    checkFolderPermission().then((perm) => setFolderPerm(perm))
  }, [])

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 4000)
  }

  // 자동 백업 폴더 선택
  const handlePickFolder = async () => {
    try {
      const name = await pickBackupDirectory()
      setBackupDirName(name)
      setFolderPerm('granted')
      setBackupModeState('folder')
      setBackupMode('folder')
      showMessage(`백업 폴더가 '${name}'으로 설정되었습니다.`)
    } catch (err) {
      if (err.name !== 'AbortError') {
        showMessage(err.message, 'error')
      }
    }
  }

  // 폴더 권한 재승인
  const handleReauthorize = async () => {
    const granted = await requestPermission()
    if (granted) {
      setFolderPerm('granted')
      showMessage('폴더 접근 권한이 복원되었습니다.')
    } else {
      showMessage('권한 승인이 필요합니다. 폴더를 다시 선택해주세요.', 'error')
    }
  }

  // 수동으로 백업 실행
  const handleManualAutoBackup = async () => {
    try {
      const fileName = await performBackup(records, config)
      setLastBackup(getLastBackupDate())
      showMessage(`백업 완료: ${fileName}`)
    } catch (err) {
      showMessage(`백업 실패: ${err.message}`, 'error')
    }
  }

  // 백업 내보내기
  const handleExport = () => {
    const data = {
      version: 2,
      exportDate: new Date().toISOString(),
      app: config ? `${config.year}학년도 ${(config.subjects || []).filter(Boolean).join('·')}과 진도 관리 프로그램` : '진도 관리 프로그램',
      config,
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
          // v2: config도 함께 복원
          if (data.config) {
            onRestore(importRecords.filter((r) => r.id && r.date && r.grade), data.config)
            showMessage(`${importRecords.length}건의 기록과 설정을 불러왔습니다.`)
            return
          }
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

      {/* 자동 백업 */}
      <div className="settings-card">
        <div className="settings-card-title">
          <span className="sc-icon">🔄</span>
          <h3>자동 백업</h3>
        </div>
        <p className="settings-desc">
          매일 지정된 시간에 자동으로 백업합니다. 앱이 열려있어야 작동합니다.
        </p>

        <div className="auto-backup-controls">
          <div className="auto-backup-row">
            <span>자동 백업</span>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={autoEnabled}
                onChange={(e) => {
                  const val = e.target.checked
                  setAutoEnabled(val)
                  setAutoBackupEnabled(val)
                }}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          <div className="auto-backup-row">
            <span>백업 시간</span>
            <input
              type="time"
              value={backupTime}
              onChange={(e) => {
                setBackupTimeState(e.target.value)
                setBackupTime(e.target.value)
              }}
              className="backup-time-input"
            />
          </div>

          <div className="auto-backup-row">
            <span>백업 방식</span>
            <select
              value={backupModeState}
              onChange={(e) => {
                setBackupModeState(e.target.value)
                setBackupMode(e.target.value)
                if (e.target.value === 'folder' && !backupDirName) {
                  handlePickFolder()
                }
              }}
              className="backup-time-input"
            >
              <option value="download">다운로드 (기본)</option>
              {isFileSystemAccessSupported() && (
                <option value="folder">폴더 직접 저장</option>
              )}
            </select>
          </div>

          {backupModeState === 'download' && (
            <div className="backup-hint">
              백업 시간에 JSON 파일이 자동 다운로드됩니다.
              Chrome 설정에서 다운로드 위치를 iCloud 폴더로 지정하면 자동 백업됩니다.
            </div>
          )}

          {backupModeState === 'folder' && isFileSystemAccessSupported() && (
            <>
              <div className="auto-backup-row">
                <span>백업 폴더</span>
                <button className="btn-secondary btn-sm" onClick={handlePickFolder}>
                  {backupDirName ? `📁 ${backupDirName}` : '📁 폴더 선택'}
                </button>
              </div>
              {folderPerm === 'prompt' && backupDirName && (
                <div className="backup-warning">
                  ⚠️ 폴더 접근 권한이 만료되었습니다.
                  <button className="btn-secondary btn-sm" onClick={handleReauthorize} style={{ marginLeft: 8 }}>
                    권한 재승인
                  </button>
                </div>
              )}
            </>
          )}

          {lastBackup && (
            <div className="auto-backup-row">
              <span>마지막 백업</span>
              <span className="backup-last-date">{lastBackup}</span>
            </div>
          )}

          {autoEnabled && (
            <button
              className="btn-primary btn-sm"
              style={{ marginTop: 8 }}
              onClick={handleManualAutoBackup}
            >
              ▶ 지금 백업 실행
            </button>
          )}
        </div>
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
