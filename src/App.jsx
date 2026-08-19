import { useState, useCallback, useEffect } from 'react'
import Header from './components/Header'
import DailyInput from './components/DailyInput'
import Dashboard from './components/Dashboard'
import Calendar from './components/Calendar'
import CurriculumView from './components/CurriculumView'
import ProgressChart from './components/ProgressChart'
import Settings from './components/Settings'
import SetupWizard from './components/SetupWizard'
import { getRecords, saveRecord, deleteRecord, getOverrides, addLessonOverride, removeLessonOverride, restoreLessonOverride } from './utils/storage'
import { exportToExcel } from './utils/exportExcel'
import { getConfig, saveConfig, hasConfig } from './utils/config'
import { setActiveTimetable, setActiveTimetables } from './data/timetable'
import { startAutoBackupTimer, stopAutoBackupTimer } from './utils/autoBackup'
function applyConfig(config) {
  if (config?.timetables && Object.keys(config.timetables).length > 0) {
    setActiveTimetables(config.timetables, config.semester2Start)
  } else if (config?.timetable) {
    setActiveTimetable(config.timetable)
  }
}

export default function App() {
  const [config, setConfigState] = useState(() => {
    const c = getConfig()
    applyConfig(c) // 첫 렌더 전에 시간표 적용 (useEffect는 렌더 후 실행되어 반영이 늦음)
    return c
  })
  const [showSetup, setShowSetup] = useState(() => !hasConfig())
  const [activeTab, setActiveTab] = useState('input')
  const [records, setRecords] = useState(() => getRecords())
  const [overrides, setOverrides] = useState(() => getOverrides())

  // config가 있으면 시간표/교육과정 적용
  useEffect(() => {
    if (config) applyConfig(config)
  }, [config])

  // 자동 백업 타이머
  useEffect(() => {
    const cleanup = startAutoBackupTimer(
      () => getRecords(),
      () => getConfig(),
      (fileName, error) => {
        if (fileName) {
          console.log(`[자동 백업] 완료: ${fileName}`)
        } else {
          console.warn(`[자동 백업] 실패: ${error}`)
        }
      }
    )
    return () => {
      cleanup()
      stopAutoBackupTimer()
    }
  }, [])

  const handleSetupComplete = (newConfig) => {
    saveConfig(newConfig)
    setConfigState(newConfig)
    applyConfig(newConfig)
    setShowSetup(false)
  }

  const handleEditSetup = () => {
    setShowSetup(true)
  }

  const handleRestore = (restoredRecords, restoredConfig) => {
    localStorage.setItem('moral-progress-records', JSON.stringify(restoredRecords))
    setRecords(restoredRecords)
    if (restoredConfig) {
      saveConfig(restoredConfig)
      setConfigState(restoredConfig)
      applyConfig(restoredConfig)
    }
  }

  // 마법사 표시
  if (showSetup) {
    return (
      <div className="app">
        <SetupWizard initialConfig={config} onComplete={handleSetupComplete} onRestoreFromBackup={handleRestore} />
      </div>
    )
  }

  const handleSave = (record) => {
    const updated = saveRecord(record)
    setRecords(updated)
  }

  const handleDelete = (id) => {
    const updated = deleteRecord(id)
    setRecords(updated)
  }

  const handleExport = (grade, subjectIdx = 0) => {
    exportToExcel(records, grade, subjectIdx)
  }

  const handleAddLesson = (date, lesson) => {
    const updated = addLessonOverride(date, lesson)
    setOverrides({ ...updated })
  }

  const handleRemoveLesson = (date, grade, classNum) => {
    const updated = removeLessonOverride(date, grade, classNum)
    setOverrides({ ...updated })
  }

  const handleRestoreLesson = (date, grade, classNum) => {
    const updated = restoreLessonOverride(date, grade, classNum)
    setOverrides({ ...updated })
  }

  return (
    <div className="app">
      <Header activeTab={activeTab} onTabChange={setActiveTab} config={config} />

      <main className="main-content">
        {activeTab === 'input' && (
          <DailyInput
            records={records}
            overrides={overrides}
            config={config}
            onSave={handleSave}
            onDelete={handleDelete}
            onAddLesson={handleAddLesson}
            onRemoveLesson={handleRemoveLesson}
            onRestoreLesson={handleRestoreLesson}
          />
        )}
        {activeTab === 'dashboard' && (
          <Dashboard records={records} overrides={overrides} config={config} />
        )}
        {activeTab === 'calendar' && (
          <Calendar records={records} overrides={overrides} />
        )}
        {activeTab === 'curriculum' && (
          <CurriculumView records={records} onExport={handleExport} config={config} />
        )}
        {activeTab === 'chart' && (
          <ProgressChart records={records} config={config} />
        )}
        {activeTab === 'settings' && (
          <Settings records={records} onRestore={handleRestore} config={config} onEditSetup={handleEditSetup} />
        )}
      </main>
    </div>
  )
}
