import { useState, useCallback } from 'react'
import Header from './components/Header'
import DailyInput from './components/DailyInput'
import Dashboard from './components/Dashboard'
import Calendar from './components/Calendar'
import CurriculumView from './components/CurriculumView'
import ProgressChart from './components/ProgressChart'
import Settings from './components/Settings'
import { getRecords, saveRecord, deleteRecord } from './utils/storage'
import { exportToExcel } from './utils/exportExcel'

export default function App() {
  const [activeTab, setActiveTab] = useState('input')
  const [records, setRecords] = useState(() => getRecords())

  const handleSave = useCallback((record) => {
    const updated = saveRecord(record)
    setRecords(updated)
  }, [])

  const handleDelete = useCallback((id) => {
    const updated = deleteRecord(id)
    setRecords(updated)
  }, [])

  const handleExport = useCallback(
    (grade) => {
      exportToExcel(records, grade)
    },
    [records]
  )

  const handleRestore = useCallback((restoredRecords) => {
    localStorage.setItem('moral-progress-records', JSON.stringify(restoredRecords))
    setRecords(restoredRecords)
  }, [])

  return (
    <div className="app">
      <Header activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="main-content">
        {activeTab === 'input' && (
          <DailyInput
            records={records}
            onSave={handleSave}
            onDelete={handleDelete}
          />
        )}
        {activeTab === 'dashboard' && (
          <Dashboard records={records} />
        )}
        {activeTab === 'calendar' && (
          <Calendar records={records} />
        )}
        {activeTab === 'curriculum' && (
          <CurriculumView records={records} onExport={handleExport} />
        )}
        {activeTab === 'chart' && (
          <ProgressChart records={records} />
        )}
        {activeTab === 'settings' && (
          <Settings records={records} onRestore={handleRestore} />
        )}
      </main>
    </div>
  )
}
