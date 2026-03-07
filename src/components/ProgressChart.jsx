import {
  Chart as ChartJS, BarElement,
  CategoryScale, LinearScale, Tooltip, Legend, Title,
} from 'chart.js'
import { Bar } from 'react-chartjs-2'
import { useState } from 'react'
import { getClassLabel } from '../data/timetable'

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend, Title)

const COLORS = ['#4f46e5','#0891b2','#059669','#d97706','#dc2626','#7c3aed','#db2777','#0d9488','#ea580c']

export default function ProgressChart({ records, config }) {
  const grades = config?.grades || []
  const [viewGradeKey, setViewGradeKey] = useState(() => {
    const g = grades[0]
    return g ? `${g.grade}-${g.subjectIdx ?? 0}` : '1-0'
  })

  const [vGrade, vSubjectIdx] = viewGradeKey.split('-').map(Number)
  const gradeRecords = records.filter((r) => r.grade === vGrade && (r.subjectIdx ?? 0) === vSubjectIdx)
  const gradeConfig = grades.find((g) => g.grade === vGrade && (g.subjectIdx ?? 0) === vSubjectIdx)
  const classes = gradeConfig?.classes || []

  // 반별 수업 횟수 비교
  const classBarData = {
    labels: classes.map((c) => `${c}반`),
    datasets: [{
      label: '수업 횟수',
      data: classes.map((cn) => gradeRecords.filter((r) => r.classNum === cn).length),
      backgroundColor: COLORS.slice(0, classes.length),
      borderRadius: 6,
    }],
  }

  const classBarOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { title: { display: true, text: '반별 수업 횟수', font: { size: 16 } }, legend: { display: false } },
    scales: { y: { beginAtZero: true, ticks: { stepSize: 1 }, title: { display: true, text: '수업 횟수' } } },
  }

  // 단원별 수업 횟수
  const unitCounts = {}
  gradeRecords.forEach((r) => {
    const unit = r.unit || '(미입력)'
    unitCounts[unit] = (unitCounts[unit] || 0) + 1
  })
  const unitEntries = Object.entries(unitCounts).sort(([, a], [, b]) => b - a)

  const unitBarData = {
    labels: unitEntries.map(([u]) => u.length > 12 ? u.substring(0, 12) + '…' : u),
    datasets: [{
      label: '수업 횟수',
      data: unitEntries.map(([, c]) => c),
      backgroundColor: COLORS.slice(0, unitEntries.length),
      borderRadius: 6,
    }],
  }

  const unitBarOpts = {
    responsive: true, maintainAspectRatio: false,
    indexAxis: 'y',
    plugins: { title: { display: true, text: '단원별 수업 현황', font: { size: 16 } }, legend: { display: false } },
    scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } } },
  }

  // 월별 수업
  const monthCounts = {}
  gradeRecords.forEach((r) => { const m = r.date.substring(0, 7); monthCounts[m] = (monthCounts[m] || 0) + 1 })
  const sortedMonths = Object.keys(monthCounts).sort()

  const barData = {
    labels: sortedMonths.map((m) => `${m.split('-')[1]}월`),
    datasets: [{ label: '수업 횟수', data: sortedMonths.map((m) => monthCounts[m]), backgroundColor: '#4f46e5', borderRadius: 6 }],
  }

  const barOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { title: { display: true, text: '월별 수업 현황', font: { size: 16 } }, legend: { display: false } },
    scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
  }

  return (
    <div className="progress-chart">
      <div className="chart-top-bar">
        <div className="chart-title-area">
          <span className="chart-icon">📈</span>
          <h2>수업 통계</h2>
        </div>
        <select value={viewGradeKey} onChange={(e) => setViewGradeKey(e.target.value)} className="filter-select">
          {grades.map((g) => (
            <option key={`${g.grade}-${g.subjectIdx}`} value={`${g.grade}-${g.subjectIdx ?? 0}`}>{g.grade}학년 {g.textbook || ''}</option>
          ))}
        </select>
      </div>

      {gradeRecords.length === 0 ? (
        <div className="no-record-box">
          <span className="no-record-icon">📈</span>
          <p>수업 기록을 추가하면 그래프가 표시됩니다.</p>
        </div>
      ) : (
        <div className="charts-grid">
          {classes.length > 1 && (
            <div className="chart-card chart-card-wide">
              <div className="chart-container bar-container"><Bar data={classBarData} options={classBarOpts} /></div>
            </div>
          )}
          {unitEntries.length > 0 && (
            <div className="chart-card">
              <div className="chart-container bar-container"><Bar data={unitBarData} options={unitBarOpts} /></div>
            </div>
          )}
          <div className="chart-card">
            <div className="chart-container bar-container"><Bar data={barData} options={barOpts} /></div>
          </div>
        </div>
      )}
    </div>
  )
}
