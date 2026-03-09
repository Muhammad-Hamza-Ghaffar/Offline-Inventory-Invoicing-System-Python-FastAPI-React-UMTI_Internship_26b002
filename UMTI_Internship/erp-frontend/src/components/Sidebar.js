// src/components/Sidebar.js
import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

function Sidebar({ isMobile, isOpen, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [hovered, setHovered] = useState(null);

  const menuItems = [
    { path: "/dashboard", label: "Dashboard", icon: "📊" },
    { path: "/products", label: "Products", icon: "📦" },
    { path: "/customers", label: "Customers", icon: "👥" },
    { path: "/orders", label: "Orders", icon: "🛒" },
  ];

  const styles = {
    sidebar: {
      width: "250px",
      background: "#4e73df",
      color: "#fff",
      padding: "20px",
      display: "flex",
      flexDirection: "column",
      position: isMobile ? "fixed" : "fixed",
      left: isMobile ? (isOpen ? "0" : "-250px") : "0",
      top: 0,
      bottom: 0,
      transition: "left 0.3s ease",
      zIndex: 999,
      boxShadow: isMobile && isOpen ? "2px 0 10px rgba(0,0,0,0.3)" : "none",
      overflowY: "auto",
    },

    logo: {
      fontSize: isMobile ? "18px" : "20px",
      fontWeight: "bold",
      marginBottom: "30px",
      textAlign: "center",
      whiteSpace: "nowrap",
      color: "#fff",
      padding: "10px 0",
      borderBottom: "1px solid rgba(255,255,255,0.2)",
    },

    navItem: (path) => ({
      padding: isMobile ? "10px 12px" : "12px 15px",
      marginBottom: "8px",
      borderRadius: "8px",
      cursor: "pointer",
      transition: "all 0.3s ease",
      display: "flex",
      alignItems: "center",
      gap: "10px",
      backgroundColor:
        location.pathname === path
          ? "#2e59d9"
          : hovered === path
          ? "rgba(255,255,255,0.2)"
          : "transparent",
      ':hover': {
        backgroundColor: "rgba(255,255,255,0.2)",
      }
    }),

    icon: {
      fontSize: "18px",
    },

    label: {
      fontSize: isMobile ? "14px" : "16px",
      whiteSpace: "nowrap",
    },

    closeButton: {
      display: isMobile ? "block" : "none",
      position: "absolute",
      top: "15px",
      right: "15px",
      background: "none",
      border: "none",
      color: "#fff",
      fontSize: "24px",
      cursor: "pointer",
      padding: "5px",
    },
  };

  const handleNavigation = (path) => {
    navigate(path);
    if (isMobile && onClose) {
      onClose();
    }
  };

  return (
    <div style={styles.sidebar}>
      {isMobile && (
        <button style={styles.closeButton} onClick={onClose}>
          ×
        </button>
      )}
      
      <div style={styles.logo}>
        {isMobile ? "ERP System" : "Invoice & Inventory ERP"}
      </div>

      {menuItems.map((item) => (
        <div
          key={item.path}
          style={styles.navItem(item.path)}
          onMouseEnter={() => setHovered(item.path)}
          onMouseLeave={() => setHovered(null)}
          onClick={() => handleNavigation(item.path)}
        >
          <span style={styles.icon}>{item.icon}</span>
          <span style={styles.label}>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

export default Sidebar;