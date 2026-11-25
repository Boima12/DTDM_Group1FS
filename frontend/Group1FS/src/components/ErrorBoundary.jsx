import { Component } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, errorMessage: '' };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, errorMessage: error?.message || 'Unexpected UI error.' };
    }

    componentDidCatch(error, info) {
        console.error('[Group1FS ErrorBoundary]', error, info);
    }

    handleReset = () => {
        this.setState({ hasError: false, errorMessage: '' });
        window.location.href = '/';
    };

    render() {
        if (this.state.hasError) {
            return (
                <div
                    style={{
                        minHeight: '100vh',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 24,
                        background: 'var(--bg-app)',
                        color: 'var(--text-primary)',
                    }}
                >
                    <div
                        className="g1-card"
                        style={{ maxWidth: 460, width: '100%', padding: 28, textAlign: 'center' }}
                    >
                        <div
                            style={{
                                width: 52,
                                height: 52,
                                margin: '0 auto 16px',
                                borderRadius: 14,
                                background: 'var(--danger-soft)',
                                color: 'var(--danger)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <AlertTriangle size={26} />
                        </div>
                        <h2 style={{ margin: '0 0 8px', fontSize: 19, fontWeight: 700 }}>
                            Something went wrong
                        </h2>
                        <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--text-secondary)' }}>
                            {this.state.errorMessage}
                        </p>
                        <button type="button" className="g1-btn g1-btn-primary" onClick={this.handleReset}>
                            <RotateCcw size={15} />
                            Reload Group1FS
                        </button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

export default ErrorBoundary;
