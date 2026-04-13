const BACKUP_DIR_KEY = 'auto-backup-dir-handle'
const BACKUP_ENABLED_KEY = 'auto-backup-enabled'
const BACKUP_LAST_KEY = 'auto-backup-last-date'
const BACKUP_TIME_KEY = 'auto-backup-time'

let dirHandle = null
let intervalId = null

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

/** 마지막 백업 날짜 */
export function getLastBackupDate() {
  return localStorage.getItem(BACKUP_LAST_KEY) || null
}

/** 백업 폴더 선택 (사용자가 직접 iCloud 폴더 선택) */
export async function pickBackupDirectory() {
  if (!isFileSystemAccessSupported()) {
    throw new Error('이 브라우저는 폴더 선택 기능을 지원하지 않습니다. Chrome 또는 Edge를 사용해주세요.')
  }
  const handle = await window.showDirectoryPicker({ mode: 'readwrite' })
  dirHandle = handle
  // IndexedDB에 핸들 저장 (localStorage는 핸들 저장 불가)
  await saveDirHandle(handle)
  return handle.name
}

/** 저장된 백업 폴더 핸들 복원 */
export async function restoreDirHandle() {
  if (dirHandle) return dirHandle
  const handle = await loadDirHandle()
  if (handle) {
    // 권한 확인
    const perm = await handle.queryPermission({ mode: 'readwrite' })
    if (perm === 'granted') {
      dirHandle = handle
      return handle
    }
    // 권한 재요청이 필요하면 null 반환
  }
  return null
}

/** 권한 재요청 */
export async function requestPermission() {
  const handle = await loadDirHandle()
  if (!handle) return false
  const perm = await handle.requestPermission({ mode: 'readwrite' })
  if (perm === 'granted') {
    dirHandle = handle
    return true
  }
  return false
}

/** 백업 실행 */
export async function performBackup(records, config) {
  const handle = dirHandle || await restoreDirHandle()
  if (!handle) throw new Error('백업 폴더가 설정되지 않았습니다.')

  const data = {
    version: 2,
    exportDate: new Date().toISOString(),
    app: config ? `${config.year}학년도 ${(config.subjects || []).filter(Boolean).join('·')}과 진도 관리 프로그램` : '진도 관리 프로그램',
    config,
    records,
  }

  const date = new Date().toISOString().slice(0, 10)
  const subjectStr = (config?.subjects || []).filter(Boolean).join('·') || '진도'
  const fileName = `${subjectStr}_백업_${date}.json`

  const fileHandle = await handle.getFileHandle(fileName, { create: true })
  const writable = await fileHandle.createWritable()
  await writable.write(JSON.stringify(data, null, 2))
  await writable.close()

  localStorage.setItem(BACKUP_LAST_KEY, date)
  return fileName
}

/** 자동 백업 타이머 시작 - 매분 체크 */
export function startAutoBackupTimer(getRecords, getConfig, onBackupDone) {
  if (intervalId) clearInterval(intervalId)

  intervalId = setInterval(async () => {
    if (!isAutoBackupEnabled()) return

    const now = new Date()
    const targetTime = getBackupTime()
    const [targetH, targetM] = targetTime.split(':').map(Number)
    const currentH = now.getHours()
    const currentM = now.getMinutes()

    if (currentH === targetH && currentM === targetM) {
      const today = now.toISOString().slice(0, 10)
      if (getLastBackupDate() === today) return // 오늘 이미 백업함

      try {
        const handle = await restoreDirHandle()
        if (!handle) return
        const fileName = await performBackup(getRecords(), getConfig())
        if (onBackupDone) onBackupDone(fileName, null)
      } catch (err) {
        if (onBackupDone) onBackupDone(null, err.message)
      }
    }
  }, 60000) // 1분마다 체크

  return () => clearInterval(intervalId)
}

export function stopAutoBackupTimer() {
  if (intervalId) {
    clearInterval(intervalId)
    intervalId = null
  }
}

/** 저장된 폴더 이름 가져오기 */
export async function getSavedDirName() {
  const handle = await loadDirHandle()
  return handle ? handle.name : null
}

// --- IndexedDB 헬퍼 (디렉토리 핸들 저장용) ---

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
