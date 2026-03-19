import { useState, useEffect } from 'react';
import {
  Heart, Activity, Users, FileText, BarChart3,
  User, LogOut, House, ChevronRight, Wifi, SlidersHorizontal
} from 'lucide-react';
import { DashboardPage } from './pages/DashboardPage';
import { PatientsPage } from './pages/PatientsPage';
import { ReportsPage } from './pages/ReportsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { PersonalizationPage } from './pages/PersonalizationPage';
import { applyUiPreferences, readUiPreferences, UI_PREFS_UPDATED_EVENT, type UiPreferences } from './utils/uiPreferences';

export default function App() {
  const initialPrefs = readUiPreferences();
  const [uiPrefs, setUiPrefs] = useState<UiPreferences>(initialPrefs);
  const [activeNav, setActiveNav] = useState(initialPrefs.defaultPage);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hoveredNav, setHoveredNav] = useState<string | null>(null);

  useEffect(() => {
    applyUiPreferences(uiPrefs);
  }, [uiPrefs]);

  useEffect(() => {
    const onPrefsUpdated = () => {
      const next = readUiPreferences();
      setUiPrefs(next);
    };

    window.addEventListener(UI_PREFS_UPDATED_EVENT, onPrefsUpdated as EventListener);
    return () => {
      window.removeEventListener(UI_PREFS_UPDATED_EVENT, onPrefsUpdated as EventListener);
    };
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('daivid_auth_token');
    if (!token) {
      window.location.href = '/CongCuDuDoanBenhTim/landing.html';
      return;
    }
    setIsAuthenticated(true);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('daivid_auth_token');
    localStorage.removeItem('daivid_user');
    window.location.href = '/CongCuDuDoanBenhTim/landing.html';
  };

  const handleGoToLanding = () => {
    window.location.href = '/CongCuDuDoanBenhTim/landing.html';
  };

  const getUserName = (): string => {
    if (uiPrefs.displayName.trim()) {
      return uiPrefs.displayName.trim();
    }

    try {
      const userStr = localStorage.getItem('daivid_user');
      if (userStr) {
        const user = JSON.parse(userStr);
        return user.fullName || user.name || user.username || 'Người dùng';
      }
    } catch { /* ignore */ }
    return 'Người dùng';
  };

  const getUserRoleLabel = (): string => {
    try {
      const userStr = localStorage.getItem('daivid_user');
      if (!userStr) return 'Người dùng';

      const user = JSON.parse(userStr);
      const rawRole = String(user.role || user.userRole || '').trim().toLowerCase();

      const roleMap: Record<string, string> = {
        admin: 'Quản trị viên',
        doctor: 'Bác sĩ',
        specialist: 'Chuyên gia',
        nurse: 'Điều dưỡng',
        staff: 'Nhân viên y tế',
        user: 'Người dùng',
      };

      return roleMap[rawRole] || 'Người dùng';
    } catch {
      return 'Người dùng';
    }
  };

  const getUserInitials = (): string => {
    const name = getUserName();
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  if (!isAuthenticated) return null;

  const getPageTitle = () => {
    switch (activeNav) {
      case 'dashboard': return { title: 'Bảng điều khiển', subtitle: 'Tổng quan hệ thống dự đoán nguy cơ tim mạch' };
      case 'patients': return { title: 'Lịch sử chẩn đoán', subtitle: 'Xem lại các kết quả chẩn đoán AI' };
      case 'reports': return { title: 'Báo cáo', subtitle: 'Thống kê tổng hợp dữ liệu chẩn đoán' };
      case 'analytics': return { title: 'Phân tích sức khỏe tim mạch', subtitle: 'Thống kê và đánh giá nguy cơ dựa trên dữ liệu' };
      case 'personalization': return { title: 'Cá nhân hóa', subtitle: 'Tùy chỉnh trải nghiệm theo sở thích của bạn' };
      default: return { title: 'AI Dự đoán bệnh tim mạch', subtitle: 'Hệ thống dự đoán nguy cơ' };
    }
  };

  const pageInfo = getPageTitle();

  const navItems = [
    { key: 'dashboard', label: 'Bảng điều khiển', icon: Activity, desc: 'Tổng quan & dự đoán' },
    { key: 'patients', label: 'Lịch sử', icon: Users, desc: 'Chẩn đoán đã lưu' },
    { key: 'reports', label: 'Báo cáo', icon: FileText, desc: 'Thống kê tổng hợp' },
    { key: 'analytics', label: 'Phân tích', icon: BarChart3, desc: 'Biểu đồ & xu hướng' },
    { key: 'personalization', label: 'Cá nhân hóa', icon: SlidersHorizontal, desc: 'Thiết lập theo sở thích' },
  ];

  return (
    <div className="h-screen w-screen flex overflow-hidden" style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif", background: '#f0f2f7' }}>

      {/* ── LEFT SIDEBAR ── */}
      <aside
        className="flex flex-col overflow-hidden"
        style={{
          width: '260px',
          minWidth: '260px',
          background: 'linear-gradient(160deg, #1a0505 0%, #2d0a0a 40%, #0d0505 100%)',
          boxShadow: '4px 0 24px rgba(0,0,0,0.35)',
          borderRight: '1px solid rgba(255,100,100,0.08)',
          position: 'relative',
        }}
      >
        {/* Decorative blobs */}
        <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '180px', height: '180px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(198,40,40,0.18) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '80px', left: '-60px', width: '200px', height: '200px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(198,40,40,0.10) 0%, transparent 70%)', pointerEvents: 'none' }} />

        {/* Brand */}
        <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px', height: '42px', borderRadius: '12px',
              background: 'linear-gradient(135deg, #ff4d4f, #c62828)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(255,77,79,0.45)',
              flexShrink: 0,
            }}>
              <Heart size={22} fill="white" color="white" style={{ animation: 'heartbeat 1.6s ease-in-out infinite' }} />
            </div>
            <div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: '15px', letterSpacing: '-0.2px' }}>CardioPredict AI</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 6px #4ade80', animation: 'pulse-beacon 2s ease-in-out infinite' }} />
                <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '11px' }}>Phiên bản 1.0 • Online</span>
              </div>
            </div>
          </div>
        </div>

        {/* Label */}
        <div style={{ padding: '16px 20px 8px' }}>
          <span style={{ color: 'rgba(255,255,255,0.28)', fontSize: '10px', fontWeight: 600, letterSpacing: '1.2px', textTransform: 'uppercase' }}>Điều hướng</span>
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, padding: '0 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {navItems.map((item) => {
            const isActive = activeNav === item.key;
            const isHovered = hoveredNav === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setActiveNav(item.key)}
                onMouseEnter={() => setHoveredNav(item.key)}
                onMouseLeave={() => setHoveredNav(null)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '10px 14px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                  transition: 'all 0.22s cubic-bezier(.4,0,.2,1)',
                  background: isActive
                    ? 'linear-gradient(135deg, rgba(255,77,79,0.25), rgba(255,77,79,0.12))'
                    : isHovered ? 'rgba(255,255,255,0.06)' : 'transparent',
                  boxShadow: isActive ? 'inset 0 0 0 1px rgba(255,77,79,0.35), 0 4px 12px rgba(198,40,40,0.2)' : 'none',
                  position: 'relative', textAlign: 'left',
                }}
              >
                {/* Active bar */}
                {isActive && (
                  <div style={{
                    position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
                    width: '3px', height: '24px', borderRadius: '0 4px 4px 0',
                    background: 'linear-gradient(180deg, #ff7875, #ff4d4f)',
                    boxShadow: '0 0 8px rgba(255,77,79,0.8)',
                  }} />
                )}

                {/* Icon */}
                <div style={{
                  width: '34px', height: '34px', borderRadius: '10px', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  background: isActive ? 'rgba(255,77,79,0.25)' : 'rgba(255,255,255,0.06)',
                  transition: 'all 0.22s cubic-bezier(.4,0,.2,1)',
                  transform: isHovered && !isActive ? 'rotate(5deg) scale(1.12)' : 'none',
                }}>
                  <item.icon size={16} color={isActive ? '#ff7875' : 'rgba(255,255,255,0.55)'} />
                </div>

                {/* Label + desc */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: isActive ? '#fff' : 'rgba(255,255,255,0.65)', fontWeight: isActive ? 600 : 500, fontSize: '13.5px', lineHeight: 1.2 }}>
                    {item.label}
                  </div>
                  <div style={{ color: isActive ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.28)', fontSize: '10.5px', marginTop: '2px' }}>
                    {item.desc}
                  </div>
                </div>

                {isActive && <ChevronRight size={14} color="rgba(255,120,117,0.7)" />}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{
            background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '12px',
            border: '1px solid rgba(255,255,255,0.08)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg, #1677ff, #0958d9)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontSize: '12px', fontWeight: 700,
                boxShadow: '0 2px 8px rgba(22,119,255,0.4)',
              }}>
                {getUserInitials()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: '12.5px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {getUserName()}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '10.5px' }}>{getUserRoleLabel()}</div>
              </div>
              <button
                onClick={handleLogout}
                title="Đăng xuất"
                style={{
                  width: '30px', height: '30px', borderRadius: '8px', border: 'none',
                  background: 'rgba(255,77,79,0.12)', cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,77,79,0.3)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,77,79,0.12)'; }}
              >
                <LogOut size={13} color="#ff7875" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        {/* TOP HEADER */}
        <header style={{
          height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 28px', flexShrink: 0,
          background: 'rgba(255,255,255,0.82)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(0,0,0,0.06)',
          boxShadow: '0 1px 16px rgba(0,0,0,0.06)',
          position: 'relative', zIndex: 10,
        }}>
          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              onClick={handleGoToLanding}
              style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#6b7280', fontSize: '13px', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', borderRadius: '6px', transition: 'all 0.18s ease' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(198,40,40,0.07)'; (e.currentTarget as HTMLButtonElement).style.color = '#c62828'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = '#6b7280'; }}
            >
              <House size={14} /> <span>Trang chủ</span>
            </button>
            <ChevronRight size={13} color="#d1d5db" />
            <span style={{ color: '#111827', fontSize: '13px', fontWeight: 600 }}>{pageInfo.title}</span>
          </div>

          {/* Right actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {/* Online status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 10px', borderRadius: '20px', background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
              <Wifi size={12} color="#16a34a" />
              <span style={{ fontSize: '11.5px', color: '#16a34a', fontWeight: 600 }}>API Online</span>
            </div>

            {/* User info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>{getUserName()}</div>
                <div style={{ fontSize: '10.5px', color: '#9ca3af' }}>AI Tim mạch · Phiên bản 1.0</div>
              </div>
              <div style={{
                width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg, #1677ff, #0958d9)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontSize: '12px', fontWeight: 700,
                boxShadow: '0 2px 10px rgba(22,119,255,0.35)',
                cursor: 'pointer',
              }}>
                {getUserInitials()}
              </div>
            </div>
          </div>
        </header>

        {/* MAIN CONTENT AREA */}
        <div style={{ flex: 1, overflow: 'auto', background: 'linear-gradient(135deg, #f0f2f7 0%, #f5f0f0 100%)' }}>
          <div key={activeNav} className="anim-page-enter">
            {activeNav === 'dashboard' && <DashboardPage />}
            {activeNav === 'patients' && <PatientsPage />}
            {activeNav === 'reports' && <ReportsPage />}
            {activeNav === 'analytics' && <AnalyticsPage />}
            {activeNav === 'personalization' && <PersonalizationPage />}
          </div>
        </div>
      </div>
    </div>
  );
}
