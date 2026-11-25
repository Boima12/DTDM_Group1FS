import { useState } from 'react';
import { Cloud, LoaderCircle, Lock, Mail, Sparkles, User, X } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';

export default function AuthModal({ fullPage = false, onClose }) {
    const { t, lang, loginUser, registerUser, enterDemoWorkspace } = useApp();
    const [tab, setTab] = useState('login');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);
        try {
            if (tab === 'login') {
                await loginUser(email, password);
            } else {
                await registerUser(name, email, password);
            }
            onClose?.();
        } catch (err) {
            setError(err.response?.data?.msg || err.message || 'Authentication failed.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDemo = async () => {
        setError('');
        setSubmitting(true);
        try {
            await enterDemoWorkspace();
            onClose?.();
        } catch (err) {
            setError(err.response?.data?.msg || err.message || 'Could not enter Demo Workspace.');
        } finally {
            setSubmitting(false);
        }
    };

    const card = (
        <div className="g1-modal-box" style={{ maxWidth: 440, padding: 26 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span
                        style={{
                            width: 38,
                            height: 38,
                            borderRadius: 11,
                            background: 'linear-gradient(135deg, #007a5c, #10b981)',
                            color: '#fff',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <Cloud size={20} />
                    </span>
                    <div>
                        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Group1FS v2.0</h2>
                        <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>
                            {lang === 'vi' ? 'Lưu trữ Đám mây MongoDB GridFS' : 'Multi-User MongoDB GridFS Cloud Drive'}
                        </p>
                    </div>
                </div>
                {!fullPage && onClose && (
                    <button type="button" className="g1-icon-btn" onClick={onClose} aria-label="Close">
                        <X size={17} />
                    </button>
                )}
            </div>

            {/* 1-Click Demo Workspace Button */}
            <button
                type="button"
                className="g1-btn g1-btn-primary"
                style={{ width: '100%', height: 42, marginBottom: 16 }}
                disabled={submitting}
                onClick={handleDemo}
            >
                {submitting ? <LoaderCircle size={16} className="g1-spin" /> : <Sparkles size={16} />}
                <span>{t('demoQuickEnter')}</span>
            </button>

            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    marginBottom: 16,
                    color: 'var(--text-muted)',
                    fontSize: 11.5,
                }}
            >
                <span style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
                <span>{lang === 'vi' ? 'HOẶC TÀI KHOẢN RIÊNG (JWT)' : 'OR PRIVATE WORKSPACE (JWT)'}</span>
                <span style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
            </div>

            {/* Tabs */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 6,
                    padding: 4,
                    borderRadius: 10,
                    background: 'var(--bg-subtle)',
                    marginBottom: 16,
                }}
            >
                <button
                    type="button"
                    onClick={() => {
                        setTab('login');
                        setError('');
                    }}
                    className="g1-btn"
                    style={{
                        background: tab === 'login' ? 'var(--bg-surface)' : 'transparent',
                        color: tab === 'login' ? 'var(--text-primary)' : 'var(--text-muted)',
                        boxShadow: tab === 'login' ? 'var(--shadow-sm)' : 'none',
                    }}
                >
                    {t('signIn')}
                </button>
                <button
                    type="button"
                    onClick={() => {
                        setTab('register');
                        setError('');
                    }}
                    className="g1-btn"
                    style={{
                        background: tab === 'register' ? 'var(--bg-surface)' : 'transparent',
                        color: tab === 'register' ? 'var(--text-primary)' : 'var(--text-muted)',
                        boxShadow: tab === 'register' ? 'var(--shadow-sm)' : 'none',
                    }}
                >
                    {t('register')}
                </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12 }}>
                {tab === 'register' && (
                    <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5 }}>
                            {lang === 'vi' ? 'Họ và tên' : 'Full name'}
                        </label>
                        <div style={{ position: 'relative' }}>
                            <User
                                size={15}
                                style={{
                                    position: 'absolute',
                                    left: 11,
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    color: 'var(--text-muted)',
                                }}
                            />
                            <input
                                className="g1-input"
                                style={{ paddingLeft: 34 }}
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Nguyen Van A"
                                required
                            />
                        </div>
                    </div>
                )}

                <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Email</label>
                    <div style={{ position: 'relative' }}>
                        <Mail
                            size={15}
                            style={{
                                position: 'absolute',
                                left: 11,
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: 'var(--text-muted)',
                            }}
                        />
                        <input
                            className="g1-input"
                            style={{ paddingLeft: 34 }}
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@university.edu.vn"
                            required
                        />
                    </div>
                </div>

                <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5 }}>
                        {lang === 'vi' ? 'Mật khẩu' : 'Password'}
                    </label>
                    <div style={{ position: 'relative' }}>
                        <Lock
                            size={15}
                            style={{
                                position: 'absolute',
                                left: 11,
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: 'var(--text-muted)',
                            }}
                        />
                        <input
                            className="g1-input"
                            style={{ paddingLeft: 34 }}
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            minLength={6}
                            required
                        />
                    </div>
                </div>

                {error && (
                    <div
                        role="alert"
                        style={{
                            padding: '9px 12px',
                            borderRadius: 9,
                            background: 'var(--danger-soft)',
                            color: 'var(--danger)',
                            fontSize: 12.5,
                        }}
                    >
                        {error}
                    </div>
                )}

                <button
                    type="submit"
                    className="g1-btn g1-btn-secondary"
                    style={{ width: '100%', height: 40, marginTop: 4 }}
                    disabled={submitting}
                >
                    {submitting ? <LoaderCircle size={15} className="g1-spin" /> : null}
                    <span>{tab === 'login' ? t('signIn') : t('register')}</span>
                </button>
            </form>
        </div>
    );

    if (fullPage) {
        return (
            <div
                style={{
                    minHeight: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 20,
                    background:
                        'radial-gradient(circle at top right, rgba(16, 185, 129, 0.14), transparent 45%), var(--bg-app)',
                }}
            >
                {card}
            </div>
        );
    }

    return (
        <div
            className="g1-modal-overlay"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) onClose?.();
            }}
        >
            {card}
        </div>
    );
}
