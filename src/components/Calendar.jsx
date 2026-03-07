import { useState } from 'react'
import { getLessonsForDate, getClassLabel, DAY_NAMES, getLocalDateStr } from '../data/timetable'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

export default function Calendar({ records, overrides = {} }) {
  const [currentDate, setCurrentDate] = useState(new Date())

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1))
  const goToday = () => setCurrentDate(new Date())

  const monthRecords = records.filter((r) => {
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}`
    return r.date.startsWith(prefix)
  })

  const recordsByDate = {}
  monthRecords.forEach((r) => {
    if (!recordsByDate[r.date]) recordsByDate[r.date] = []
    recordsByDate[r.date].push(r)
  })

  const days = []
  for (let i = 0; i < firstDay; i++) days.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const lessons = getLessonsForDate(dateStr, overrides)
    const dayRecords = recordsByDate[dateStr] || []
    days.push({ day: d, date: dateStr, lessons, records: dayRecords })
  }

  const [selectedDay, setSelectedDay] = useState(null)

  return (
    <div className="calendar">
      <div className="calendar-top-bar">
        <button className="cal-nav-btn" onClick={prevMonth}>◀</button>
        <h2>{year}년 {month + 1}월</h2>
        <button className="cal-nav-btn" onClick={nextMonth}>▶</button>
        <button className="btn-today-cal" onClick={goToday}>오늘</button>
      </div>

      <div className="calendar-stats-row">
        <div className="cal-stat">
          <span className="cal-stat-icon">📅</span>
          <span className="cal-stat-num">{monthRecords.length}</span>
          <span className="cal-stat-label">이번 달 기록</span>
        </div>
        <div className="cal-stat">
          <span className="cal-stat-icon">📆</span>
          <span className="cal-stat-num">{Object.keys(recordsByDate).length}</span>
          <span className="cal-stat-label">수업 일수</span>
        </div>
      </div>

      <div className="calendar-grid">
        {WEEKDAYS.map((day) => (
          <div key={day} className={`cal-weekday ${day === '일' ? 'sunday' : ''} ${day === '토' ? 'saturday' : ''}`}>
            {day}
          </div>
        ))}

        {days.map((dayData, i) =>
          dayData ? (
            <div
              key={dayData.date}
              className={`cal-day ${dayData.date === getLocalDateStr() ? 'today' : ''} ${dayData.records.length > 0 ? 'has-records' : ''} ${new Date(dayData.date).getDay() === 0 ? 'sunday' : ''} ${new Date(dayData.date).getDay() === 6 ? 'saturday' : ''}`}
              onClick={() => setSelectedDay(selectedDay === dayData.date ? null : dayData.date)}
            >
              <span className="day-number">{dayData.day}</span>
              {dayData.lessons.length > 0 && (
                <div className="day-lesson-count">
                  {dayData.records.length}/{dayData.lessons.length}
                </div>
              )}
            </div>
          ) : (
            <div key={`empty-${i}`} className="cal-day empty" />
          )
        )}
      </div>

      {/* 선택한 날짜의 상세 */}
      {selectedDay && (
        <DayDetail
          date={selectedDay}
          records={recordsByDate[selectedDay] || []}
          lessons={getLessonsForDate(selectedDay, overrides)}
        />
      )}
    </div>
  )
}

function DayDetail({ date, records, lessons }) {
  const dayOfWeek = new Date(date).getDay()

  return (
    <div className="day-detail">
      <h3>{date} ({DAY_NAMES[dayOfWeek]})</h3>
      {lessons.length === 0 ? (
        <p className="no-record">수업 없음</p>
      ) : (
        <table className="records-table">
          <thead>
            <tr>
              <th>교시</th>
              <th>반</th>
              <th>단원</th>
              <th>수업내용</th>
              <th>상태</th>
            </tr>
          </thead>
          <tbody>
            {lessons.map((l) => {
              const rec = records.find(
                (r) => r.grade === l.grade && r.classNum === l.classNum
              )
              return (
                <tr key={`${l.grade}-${l.classNum}`}>
                  <td>{l.period}교시</td>
                  <td><span className="table-class-badge">{getClassLabel(l.grade, l.classNum)}</span></td>
                  <td>{rec?.unit || '-'}</td>
                  <td>{rec?.content || '-'}</td>
                  <td>{rec ? <span className="saved-badge">완료</span> : <span className="pending-badge">미입력</span>}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
