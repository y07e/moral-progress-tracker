const BACKUP_DIR_KEY = 'auto-backup-dir-handle'
const BACKUP_ENABLED_KEY = 'auto-backup-enabled'
const BACKUP_LAST_KEY = 'auto-backup-last-date'
const BACKUP_TIME_KEY = 'auto-backup-time'
const BACKUP_MODE_KEY = 'auto-backup-mode' // 'folder' | 'download'

let dirHandle = null
let timerId = null

/** File System Access API 지원 여부 */
export function isFileSystemAccessSupported() {
  return typeof window.showDirectoryPicker === 'function'
}

/** 자동 백업 활성화 여부 */
export function isAutoBackupEnabled() {
  return localStorage.getItem(BACKUP_ENABLED_KEY) === 'true'
}

export function setAutoBackupEnabled(enabled) {
  localStorage.setItem(BACKUP_ENABLED_KEY, enabled ? 'true' : 'false')
}

/** 백업 시간 (기본 16:30) */
export function getBackupTime() {
  return localStorage.getItem(BACKUP_TIME_KEY) || '16:30'
}

export function setBackupTime(time) {
  localStorage.setItem(BACKUP_TIME_KEY, time)
}

/** 백업 모드 */
export function getBackupMode() {
  return localStorage.getItem(BACKUP_MODE_KEY) || 'download'
}

export function setBackupMode(mode) {
  localStorage.setItem(BACKUP_MODE_KEY, mode)
}

/** 마지막 백업 날짜 */
export function getLastBackupDate() {
  return localStorage.getItem(BACKUP_LAST_KEY) || null
}

/** 백업 폴더 선택 (사용자가 직접 iCloud 폴더 선택) */
export async function pickBackupDirectory() {
  if (!isFileSystemAccessSupported()) {
    throw new Error('이 브라우저는 폴더 선택 기능을 지원하지 않습니다.')
  }
  const handle = await window.showDirectoryPicker({ mode: 'readwrite' })
  dirHandle = handle
  await saveDirHandle(handle)
  return handle.name
}

/** 저장된 백업 폴더 핸들 복원 (권한 자동 확인) */
export async function restoreDirHandle() {
  if (dirHandle) {
    try {
      const perm = await dirHandle.queryPermission({ mode: 'readwrite' })
      if (perm === 'granted') return dirHandle
    } catch { /* 핸들 유효하지 않음 */ }
  }
  try {
    const handle = await loadDirHandle()
    if (handle) {
      const perm = await handle.queryPermission({ mode: 'readwrite' })
      if (perm === 'granted') {
        dirHandle = handle
        return handle
      }
    }
  } catch { /* IndexedDB 실패 */ }
  return null
}

/** 권한 재요청 (사용자 클릭 컨텍스트에서 호출해야 함) */
export async function requestPermission() {
  try {
    const handle = await loadDirHandle()
    if (!handle) return false
    const perm = await handle.requestPermission({ mode: 'readwrite' })
    if (perm === 'granted') {
      dirHandle = handle
      return true
    }
  } catch { /* 실패 */ }
  return false
}

/** 백업 데이터 생성 */
function createBackupData(records, config) {
  return {
    version: 2,
    exportDate: new Date().toISOString(),
    app: config ? `${config.year}학년도 ${(config.subjects || []).filter(Boolean).join('·')}과 진도 관리 프로그램` : '진도 관리 프로그램',
    config,
    records,
  }
}

/** 백업 파일명 생성 */
function createFileName(config) {
  const date = new Date().toISOString().slice(0, 10)
  const subjectStr = (config?.subjects || []).filter(Boolean).join('·') || '진도'
  return `${subjectStr}_백업_${date}.json`
}

/** 폴더 직접 저장 방식 백업 */
export async function performFolderBackup(records, config) {
  const handle = dirHandle || await restoreDirHandle()
  if (!handle) throw new Error('백업 폴더 권한이 없습니다.')

  const data = createBackupData(records, config)
  const fileName = createFileName(config)

  const fileHandle = await handle.getFileHandle(fileName, { create: true })
  const writable = await fileHandle.createWritable()
  await writable.write(JSON.stringify(data, null, 2))
  await writable.close()

  const date = new Date().toISOString().slice(0, 10)
  localStorage.setItem(BACKUP_LAST_KEY, date)
  return fileName
}

/** 다운로드 방식 백업 */
export function performDownloadBackup(records, config) {
  const data = createBackupData(records, config)
  const fileName = createFileName(config)

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)

  const date = new Date().toISOString().slice(0, 10)
  localStorage.setItem(BACKUP_LAST_KEY, date)
  return fileName
}

/** 자동 백업 실행 (모드에 따라 분기) */
export async function performBackup(records, config) {
  const mode = getBackupMode()

  if (mode === 'folder') {
    // 폴더 모드: 권한이 있으면 직접 저장, 없으면 다운로드 fallback
    try {
      return await performFolderBackup(records, config)
    } catch {
      // 폴더 저장 실패 시 다운로드 fallback
      return performDownloadBackup(records, config)
    }
  }

  // 다운로드 모드
  return performDownloadBackup(records, config)
}

/** 자동 백업 타이머 시작 */
export function startAutoBackupTimer(getRecords, getConfig, onBackupDone) {
  stopAutoBackupTimer()

  // 매 30초마다 체크 (비활성 탭에서도 더 안정적)
  function tick() {
    timerId = setTimeout(async () => {
      try {
        if (isAutoBackupEnabled()) {
          const now = new Date()
          const targetTime = getBackupTime()
          const [targetH, targetM] = targetTime.split(':').map(Number)

          if (now.getHours() === targetH && now.getMinutes() === targetM) {
            const today = now.toISOString().slice(0, 10)
            if (getLastBackupDate() !== today) {
              try {
                const fileName = await performBackup(getRecords(), getConfig())
                if (onBackupDone) onBackupDone(fileName, null)
              } catch (err) {
                if (onBackupDone) onBackupDone(null, err.message)
              }
            }
          }
        }
      } catch { /* 무시 */ }
      tick() // 다음 틱 예약
    }, 30000)
  }

  tick()
  return () => stopAutoBackupTimer()
}

export function stopAutoBackupTimer() {
  if (timerId) {
    clearTimeout(timerId)
    timerId = null
  }
}

/** 저장된 폴더 이름 가져오기 */
export async function getSavedDirName() {
  try {
    const handle = await loadDirHandle()
    return handle ? handle.name : null
  } catch {
    return null
  }
}

/** 폴더 권한 상태 확인 */
export async function checkFolderPermission() {
  try {
    const handle = await loadDirHandle()
    if (!handle) return 'none' // 폴더 미설정
    const perm = await handle.queryPermission({ mode: 'readwrite' })
    return perm // 'granted' | 'prompt' | 'denied'
  } catch {
    return 'none'
  }
}

// --- IndexedDB 헬퍼 ---

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('auto-backup-db', 1)
    req.onupgradeneeded = () => {
      req.result.createObjectStore('handles')
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function saveDirHandle(handle) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('handles', 'readwrite')
    tx.objectStore('handles').put(handle, BACKUP_DIR_KEY)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

async function loadDirHandle() {
  try {
    const db = await openDB()
    return new Promise((resolve) => {
      const tx = db.transaction('handles', 'readonly')
      const req = tx.objectStore('handles').get(BACKUP_DIR_KEY)
      req.onsuccess = () => resolve(req.result || null)
      req.onerror = () => resolve(null)
    })
  } catch {
    return null
  }
}
