import { getHeaderTitle, getHeaderSubtitle } from '../utils/config'

export default function Header({ activeTab, onTabChange, config }) {
  const tabs = [
    { id: 'input', label: '진도 입력', icon: '🖊️' },
    { id: 'dashboard', label: '현황', icon: '📊' },
    { id: 'calendar', label: '달력', icon: '🗓️' },
    { id: 'curriculum', label: '수업기록', icon: '📒' },
    { id: 'chart', label: '그래프', icon: '📉' },
    { id: 'settings', label: '설정', icon: '⚙️' },
  ]

  return (
    <header className="header">
      <div className="header-top">
        <div className="header-title">
          <h1>{getHeaderTitle(config)}</h1>
          <p className="header-subtitle">{getHeaderSubtitle(config)}</p>
        </div>
      </div>
      <nav className="header-nav">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`nav-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            <span className="nav-icon">{tab.icon}</span>
            <span className="nav-label">{tab.label}</span>
          </button>
        ))}
      </nav>
    </header>
  )
}
