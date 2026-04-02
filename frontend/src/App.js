
import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./components/Login";
import CitizenDashboard from "./components/CitizenDashboard";
import PoliceDashboard from "./components/PoliceDashboard";
import GovtDashboard from "./components/GovtDashboard";
import BusinessDashboard from "./components/BusinessDashboard";
import DebugPage from "./components/DebugPage";
import "./App.css";

function AppContent() {
    const { user, logout, loading } = useAuth();

    if (loading) {
        return (
            <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '100vh',
                fontSize: '1.5em'
            }}>
                Loading...
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    const renderDashboard = () => {
        switch(user.role) {
            case 'CITIZEN':
                return <CitizenDashboard user={user} />;
            case 'POLICE':
                return <PoliceDashboard user={user} />;
            case 'GOVERNMENT':
                return <GovtDashboard user={user} />;
            case 'BUSINESS':
                return <BusinessDashboard user={user} />;
            default:
                return <CitizenDashboard user={user} />;
        }
    };

    return (
        <div className="app">
            <header className="app-header-new">
                <div className="header-content">
                    <div className="header-left">
                        <h1>🛡️ SafeGuard AI</h1>
                        <p className="role-badge">{user.role}</p>
                    </div>
                    <div className="header-right">
                        <span className="user-name">👤 {user.name}</span>
                        <button className="logout-btn" onClick={logout}>
                            Logout
                        </button>
                    </div>
                </div>
            </header>
            {renderDashboard()}
        </div>
    );
}

function LoginRoute() {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                fontSize: '1.5em'
            }}>
                Loading...
            </div>
        );
    }

    if (user) {
        return <Navigate to="/" replace />;
    }

    return <Login />;
}

function App() {
    return (
        <AuthProvider>
            <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <Routes>
                    <Route path="/login" element={<LoginRoute />} />
                    <Route path="/debug" element={<DebugPage />} />
                    <Route path="*" element={<AppContent />} />
                </Routes>
            </Router>
        </AuthProvider>
    );
}

export default App;
