import {
  Chart as ChartJS, ArcElement, BarElement,
  CategoryScale, LinearScale, Tooltip, Legend, Title,
} from 'chart.js'
import { Doughnut, Bar } from 'react-chartjs-2'
import { useState } from 'react'
import { getCurriculumForGrade, getTotalSubunits } from '../data/curriculum'
import { getClassLabel } from '../data/timetable'

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend, Title)

const COLORS = ['#4f46e5','#0891b2','#059669','#d97706','#dc2626','#7c3aed','#db2777','#0d9488','#ea580c']

export default function ProgressChart({ records }) {
  const [viewGrade, setViewGrade] = useState(1)

  const curriculum = getCurriculumForGrade(viewGrade)
  const totalSubunits = getTotalSubunits(curriculum)
  const gradeRecords = records.filter((r) => r.grade === viewGrade)
  const classes = viewGrade === 1 ? [1,2,3,4,5,6,7,8,9] : [11]

  // 반별 진도 비교
  const classBarData = {
    labels: classes.map((c) => viewGrade === 1 ? `${c}반` : `${c}반`),
    datasets: [{
      label: '완료 단원',
      data: classes.map((cn) => {
        const subs = new Set()
        gradeRecords.filter((r) => r.classNum === cn && r.subunitId).forEach((r) => subs.add(r.subunitId))
        return subs.size
      }),
      backgroundColor: COLORS.slice(0, classes.length),
      borderRadius: 6,
    }],
  }

  const classBarOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { title: { display: true, text: '반별 진도 비교', font: { size: 16 } }, legend: { display: false } },
    scales: { y: { beginAtZero: true, max: totalSubunits, ticks: { stepSize: 1 }, title: { display: true, text: '완료 단원' } } },
  }

  // 대단원별 (도넛)
  const unitData = curriculum.map((unit) => {
    const subs = new Set()
    gradeRecords.forEach((r) => { if (unit.subunits.some((s) => s.id === r.subunitId)) subs.add(r.subunitId) })
    return { label: unit.title.replace(/^[ⅠⅡⅢⅣⅤⅥ]+\.\s*/, ''), completed: subs.size, total: unit.subunits.length }
  })

  const doughnutData = {
    labels: unitData.map((u) => u.label),
    datasets: [
      { label: '완료', data: unitData.map((u) => u.completed), backgroundColor: COLORS.slice(0, unitData.length), borderWidth: 2, borderColor: '#fff' },
      { label: '미완료', data: unitData.map((u) => u.total - u.completed), backgroundColor: ['#c7d2fe','#a5f3fc','#a7f3d0','#fde68a'].slice(0, unitData.length), borderWidth: 2, borderColor: '#fff' },
    ],
  }

  const doughnutOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { title: { display: true, text: '대단원별 진도', font: { size: 16 } } },
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
          <h2>진도율 그래프</h2>
        </div>
        <select value={viewGrade} onChange={(e) => setViewGrade(Number(e.target.value))} className="filter-select">
          <option value={1}>1학년 도덕①</option>
          <option value={3}>3학년 도덕②</option>
        </select>
      </div>

      {gradeRecords.length === 0 ? (
        <div className="no-record-box">
          <span className="no-record-icon">📈</span>
          <p>수업 기록을 추가하면 그래프가 표시됩니다.</p>
        </div>
      ) : (
        <div className="charts-grid">
          {viewGrade === 1 && (
            <div className="chart-card chart-card-wide">
              <div className="chart-container bar-container"><Bar data={classBarData} options={classBarOpts} /></div>
            </div>
          )}
          <div className="chart-card">
            <div className="chart-container doughnut-container"><Doughnut data={doughnutData} options={doughnutOpts} /></div>
            <div className="chart-legend-custom">
              {unitData.map((u, i) => (
                <div key={i} className="legend-item">
                  <span className="legend-label">{u.label}</span>
                  <span className="legend-value">{u.completed}/{u.total}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="chart-card">
            <div className="chart-container bar-container"><Bar data={barData} options={barOpts} /></div>
          </div>
        </div>
      )}
    </div>
  )
}
