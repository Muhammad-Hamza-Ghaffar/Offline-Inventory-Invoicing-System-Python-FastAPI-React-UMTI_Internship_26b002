// src/pages/Login.js
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

 // src/pages/Login.js - Update the handleLogin function
const handleLogin = async (e) => {
  e.preventDefault();
  setError("");
  setLoading(true);

  try {
    console.log('Attempting login with:', { username });
    const response = await login(username, password);
    console.log('Login response:', response);
    toast.success("Login successful! Welcome to ERP-Lite");
    navigate("/dashboard");
  } catch (err) {
    console.error('Login error:', err);
    console.error('Error response:', err.response?.data);
    
    const errorMessage = err.response?.data?.detail || 
                         "Login failed. Please check your credentials.";
    
    setError(errorMessage);
    toast.error(errorMessage);
  } finally {
    setLoading(false);
  }
};

  const styles = {
    page: {
      minHeight: "100vh",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      background: "linear-gradient(135deg, #4e73df, #1cc88a)",
      padding: "15px",
    },
    card: {
      backdropFilter: "blur(15px)",
      background: "rgba(255, 255, 255, 0.15)",
      borderRadius: "20px",
      padding: "35px 25px",
      width: "100%",
      maxWidth: "420px",
      boxShadow: "0 15px 40px rgba(0,0,0,0.3)",
      color: "#fff",
    },
    title: {
      textAlign: "center",
      marginBottom: "25px",
      fontSize: "clamp(20px, 5vw, 28px)",
      fontWeight: "600",
    },
    inputGroup: { 
      marginBottom: "18px", 
      position: "relative", 
      width: "100%" 
    },
    input: {
      width: "100%",
      padding: "12px 45px 12px 15px",
      borderRadius: "10px",
      border: "none",
      outline: "none",
      fontSize: "14px",
      background: "rgba(255,255,255,0.2)",
      color: "#fff",
      boxSizing: "border-box",
    },
    inputPlaceholder: {
      color: "rgba(255,255,255,0.7)",
    },
    toggleBtn: {
      position: "absolute",
      right: "12px",
      top: "50%",
      transform: "translateY(-50%)",
      background: "none",
      border: "none",
      cursor: "pointer",
      color: "#fff",
      fontSize: "13px",
    },
    button: {
      width: "100%",
      padding: "12px",
      borderRadius: "10px",
      border: "none",
      backgroundColor: "#ffffff",
      color: "#4e73df",
      fontWeight: "600",
      fontSize: "15px",
      cursor: "pointer",
      boxSizing: "border-box",
      opacity: loading ? 0.7 : 1,
    },
    footer: {
      textAlign: "center",
      marginTop: "15px",
      fontSize: "12px",
      opacity: "0.8",
    },
    error: {
      color: "#ffbaba",
      backgroundColor: "#ff4d4d33",
      padding: "8px",
      borderRadius: "6px",
      marginBottom: "15px",
      textAlign: "center",
      border: "1px solid #ffbaba",
    },
    loadingSpinner: {
      display: "inline-block",
      width: "16px",
      height: "16px",
      border: "2px solid #4e73df",
      borderTop: "2px solid transparent",
      borderRadius: "50%",
      animation: "spin 1s linear infinite",
      marginRight: "8px",
    },
  };

  // Add keyframes for spinner animation
  const styleSheet = document.styleSheets[0];
  const keyframes = 
    `@keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }`;
  
  if (!styleSheet) {
    const style = document.createElement('style');
    style.textContent = keyframes;
    document.head.appendChild(style);
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h2 style={styles.title}>Invoice & Inventory ERP</h2>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleLogin}>
          <div style={styles.inputGroup}>
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={loading}
              style={styles.input}
            />
          </div>

          <div style={styles.inputGroup}>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              style={styles.input}
            />
            <button
              type="button"
              style={styles.toggleBtn}
              onClick={() => setShowPassword(!showPassword)}
              disabled={loading}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          <button 
            type="submit" 
            style={styles.button}
            disabled={loading}
          >
            {loading ? (
              <>
                <span style={styles.loadingSpinner}></span>
                Logging in...
              </>
            ) : (
              "Login"
            )}
          </button>
        </form>

        <div style={styles.footer}>© 2026 Invoice & Inventory ERP</div>
      </div>
    </div>
  );
}

export default Login;