import { useState, useEffect } from 'react';
import { Shield, Users, RefreshCw, Crown, Stethoscope, User } from 'lucide-react';
import { apiService } from '../services/api';

const ROLE_LABELS: Record<string, { label: string; color: string; bg: string; icon: any }> = {
    admin: { label: 'Admin', color: '#c62828', bg: '#fef2f2', icon: Crown },
    doctor: { label: 'Bác sĩ', color: '#16a34a', bg: '#f0fdf4', icon: Stethoscope },
    nurse: { label: 'Điều dưỡng', color: '#2563eb', bg: '#eff6ff', icon: User },
};

export function AdminPage() {
    const [users, setUsers] = useState<any[]>([]);
    const [myRole, setMyRole] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState<number | null>(null);
    const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

    const load = async () => {
        setLoading(true);
        try {
            const [r, u] = await Promise.allSettled([
                apiService.getMyRole(),
                apiService.getAdminUsers(),
            ]);
            if (r.status === 'fulfilled') setMyRole(r.value.role);
            if (u.status === 'fulfilled') setUsers(u.value);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const updateRole = async (userId: number, newRole: string) => {
        setUpdating(userId);
        try {
            await apiService.updateUserRole(userId, newRole);
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
            setMsg({ text: 'Cập nhật role thành công!', ok: true });
        } catch (e: any) {
            setMsg({ text: e.message || 'Lỗi cập nhật role', ok: false });
        } finally {
            setUpdating(null);
            setTimeout(() => setMsg(null), 3000);
        }
    };

    if (myRole && myRole !== 'admin') {
        return (
            <div style={{ padding: 48, textAlign: 'center' }}>
                <Shield size={48} color="#e5e7eb" style={{ marginBottom: 16 }} />
                <h2 style={{ color: '#374151', fontSize: 18 }}>Không có quyền truy cập</h2>
                <p style={{ color: '#9ca3af', fontSize: 14 }}>Trang này chỉ dành cho Admin. Role hiện tại của bạn: <strong>{myRole}</strong></p>
            </div>
        );
    }

    return (
        <div style={{ padding: '28px 32px', maxWidth: 900, margin: '0 auto' }} className="anim-page-enter">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <div>
                    <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: 0 }}>Quản lý người dùng</h2>
                    <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0' }}>Phân quyền RBAC — Admin Panel</p>
                </div>
                <button onClick={load} style={{ padding: '8px 14px', borderRadius: 8, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
                    <RefreshCw size={13} />Tải lại
                </button>
            </div>

            {msg && (
                <div style={{ padding: '10px 16px', borderRadius: 8, marginBottom: 16, fontSize: 13,
                    background: msg.ok ? '#f0fdf4' : '#fef2f2', border: `1px solid ${msg.ok ? '#bbf7d0' : '#fecaca'}`,
                    color: msg.ok ? '#15803d' : '#dc2626' }}>
                    {msg.text}
                </div>
            )}

            {/* Role legend */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
                {Object.entries(ROLE_LABELS).map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, background: v.bg, border: `1px solid ${v.color}30`, fontSize: 12 }}>
                        <v.icon size={13} color={v.color} />
                        <span style={{ color: v.color, fontWeight: 600 }}>{v.label}</span>
                        <span style={{ color: '#9ca3af' }}>— {k === 'admin' ? 'Toàn quyền hệ thống' : k === 'doctor' ? 'Dự đoán + lịch sử' : 'Xem kết quả'}</span>
                    </div>
                ))}
            </div>

            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                {loading ? (
                    <div style={{ padding: 32, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>Đang tải...</div>
                ) : users.length === 0 ? (
                    <div style={{ padding: 32, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
                        <Users size={32} color="#e5e7eb" style={{ marginBottom: 8 }} />
                        <p>Chưa có user nào (hoặc không có quyền admin)</p>
                    </div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                            <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                                {['#', 'Họ tên', 'Email', 'Role hiện tại', 'Thay đổi role', 'Ngày tạo'].map(h => (
                                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: '#6b7280', fontWeight: 600, fontSize: 11 }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((u, i) => {
                                const roleInfo = ROLE_LABELS[u.role] || ROLE_LABELS.doctor;
                                const RoleIcon = roleInfo.icon;
                                return (
                                    <tr key={u.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                        <td style={{ padding: '10px 14px', color: '#9ca3af' }}>{i + 1}</td>
                                        <td style={{ padding: '10px 14px', fontWeight: 600, color: '#111827' }}>{u.fullName}</td>
                                        <td style={{ padding: '10px 14px', color: '#6b7280' }}>{u.email}</td>
                                        <td style={{ padding: '10px 14px' }}>
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 6, background: roleInfo.bg, color: roleInfo.color, fontSize: 11, fontWeight: 600 }}>
                                                <RoleIcon size={11} />
                                                {roleInfo.label}
                                            </span>
                                        </td>
                                        <td style={{ padding: '10px 14px' }}>
                                            <select
                                                value={u.role}
                                                disabled={updating === u.id}
                                                onChange={e => updateRole(u.id, e.target.value)}
                                                style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #e5e7eb', fontSize: 12, cursor: 'pointer', background: '#fff' }}
                                            >
                                                <option value="admin">Admin</option>
                                                <option value="doctor">Bác sĩ</option>
                                                <option value="nurse">Điều dưỡng</option>
                                            </select>
                                        </td>
                                        <td style={{ padding: '10px 14px', color: '#9ca3af', fontSize: 11 }}>
                                            {u.createdDate ? new Date(u.createdDate).toLocaleDateString('vi-VN') : '—'}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
