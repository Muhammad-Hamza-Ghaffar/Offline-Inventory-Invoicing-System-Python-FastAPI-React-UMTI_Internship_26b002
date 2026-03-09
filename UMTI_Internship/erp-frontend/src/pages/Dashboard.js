// src/pages/Dashboard.js
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { productService } from "../services/products";
import { customerService } from "../services/customers";
import { supplierService } from "../services/suppliers";
import { orderService } from "../services/orders";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const [hovered, setHovered] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  
  // State for real data
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalCustomers: 0,
    totalSuppliers: 0,
    totalPurchaseOrders: 0,
    totalSalesOrders: 0,
    monthlyRevenue: 0,
    lowStockProducts: 0
  });
  const [loading, setLoading] = useState(true);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      if (window.innerWidth > 768) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch real data from backend
  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch all data in parallel
      const [
        products,
        customers,
        suppliers,
        purchaseOrders,
        salesOrders
      ] = await Promise.all([
        productService.getAll().catch(() => []),
        customerService.getAll().catch(() => []),
        supplierService.getAll().catch(() => []),
        orderService.getPurchaseOrders().catch(() => []),
        orderService.getSalesOrders().catch(() => [])
      ]);

      // Calculate stats
      const totalProducts = products.length;
      const totalCustomers = customers.length;
      const totalSuppliers = suppliers.length;
      const totalPurchaseOrders = purchaseOrders.length;
      const totalSalesOrders = salesOrders.length;
      
      // Calculate monthly revenue (current month)
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const monthlyRevenue = salesOrders
        .filter(order => {
          const orderDate = new Date(order.created_at);
          return orderDate.getMonth() === currentMonth && 
                 orderDate.getFullYear() === currentYear;
        })
        .reduce((sum, order) => sum + (order.total_amount || 0), 0);

      // Count low stock products (stock < 10)
      const lowStockProducts = products.filter(p => p.stock < 10).length;

      setStats({
        totalProducts,
        totalCustomers,
        totalSuppliers,
        totalPurchaseOrders,
        totalSalesOrders,
        monthlyRevenue,
        lowStockProducts
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const isMobile = windowWidth <= 768;

  const styles = {
    container: {
      display: "flex",
      minHeight: "100vh",
      width: "100%",
      backgroundColor: "#f4f6f9",
      position: "relative",
    },

    sidebar: {
      width: isMobile ? (isMobileMenuOpen ? "240px" : "0") : "240px",
      background: "#4e73df",
      color: "#fff",
      padding: isMobile ? (isMobileMenuOpen ? "20px" : "0") : "20px",
      display: "flex",
      flexDirection: "column",
      transition: "all 0.3s ease",
      overflow: "hidden",
      position: isMobile ? "fixed" : "relative",
      height: isMobile ? "100vh" : "auto",
      zIndex: 1000,
      boxShadow: isMobile && isMobileMenuOpen ? "2px 0 10px rgba(0,0,0,0.3)" : "none",
    },

    overlay: {
      display: isMobile && isMobileMenuOpen ? "block" : "none",
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0,0,0,0.5)",
      zIndex: 999,
    },

    logo: {
      fontSize: isMobile ? "18px" : "20px",
      fontWeight: "bold",
      marginBottom: "30px",
      textAlign: "center",
      whiteSpace: "nowrap",
      display: isMobile && !isMobileMenuOpen ? "none" : "block",
    },

    navItem: (path) => ({
      padding: isMobile ? "10px 12px" : "12px 15px",
      marginBottom: "8px",
      borderRadius: "8px",
      cursor: "pointer",
      transition: "0.3s",
      whiteSpace: "nowrap",
      backgroundColor:
        location.pathname === path
          ? "#2e59d9"
          : hovered === path
          ? "rgba(255,255,255,0.2)"
          : "transparent",
      display: isMobile && !isMobileMenuOpen ? "none" : "block",
    }),

    main: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      width: isMobile ? "100%" : `calc(100% - 240px)`,
      marginLeft: isMobile ? 0 : "auto",
      transition: "all 0.3s ease",
    },

    navbar: {
      height: "60px",
      background: "#fff",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "0 15px",
      boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
      position: "relative",
      width: "100%",
    },

    menuButton: {
      display: isMobile ? "block" : "none",
      background: "none",
      border: "none",
      fontSize: "24px",
      cursor: "pointer",
      color: "#4e73df",
      marginRight: "10px",
    },

    navbarTitle: {
      fontSize: isMobile ? "16px" : "20px",
      margin: 0,
      flex: 1,
    },

    content: {
      padding: isMobile ? "15px" : "20px",
      backgroundColor: "#f4f6f9",
      minHeight: "calc(100vh - 60px)",
    },

    cardContainer: {
      display: "grid",
      gridTemplateColumns: isMobile 
        ? "1fr" 
        : windowWidth <= 1024 
          ? "repeat(2, 1fr)" 
          : "repeat(4, 1fr)",
      gap: isMobile ? "15px" : "20px",
      marginTop: "20px",
    },

    card: {
      background: "#fff",
      padding: isMobile ? "15px" : "20px",
      borderRadius: "12px",
      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
      transition: "0.3s",
      width: "100%",
      boxSizing: "border-box",
      position: "relative",
    },

    cardTitle: {
      fontSize: isMobile ? "13px" : "14px",
      color: "#777",
    },

    cardValue: {
      fontSize: isMobile ? "20px" : "22px",
      fontWeight: "bold",
      marginTop: "8px",
    },

    cardSubtext: {
      fontSize: "12px",
      color: "#999",
      marginTop: "5px",
    },

    logoutBtn: {
      background: "#e74a3b",
      border: "none",
      padding: isMobile ? "6px 12px" : "8px 15px",
      color: "#fff",
      borderRadius: "6px",
      cursor: "pointer",
      fontSize: isMobile ? "14px" : "16px",
      whiteSpace: "nowrap",
    },

    refreshBtn: {
      background: "#4e73df",
      border: "none",
      padding: "6px 12px",
      color: "#fff",
      borderRadius: "6px",
      cursor: "pointer",
      fontSize: "14px",
      marginLeft: "10px",
    },

    welcomeText: {
      fontSize: isMobile ? "20px" : "24px",
      marginBottom: "10px",
    },

    subText: {
      fontSize: isMobile ? "14px" : "16px",
    },

    loadingOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(255,255,255,0.8)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 100,
    },

    warningCard: {
      background: "#fff3cd",
      border: "1px solid #ffeeba",
    },

    successCard: {
      background: "#d4edda",
      border: "1px solid #c3e6cb",
    },
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleNavClick = (path) => {
    navigate(path);
    if (isMobile) {
      setIsMobileMenuOpen(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleRefresh = () => {
    fetchDashboardData();
    toast.success("Dashboard refreshed!");
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <>
      <div style={styles.overlay} onClick={() => setIsMobileMenuOpen(false)} />
      
      <div style={styles.container}>
        {/* Sidebar */}
        <div style={styles.sidebar}>
          <div style={styles.logo}>Invoice & Inventory ERP</div>

          {["/dashboard", "/products", "/customers", "/suppliers", "/orders", "/invoice"].map((path) => (
            <div
              key={path}
              style={styles.navItem(path)}
              onMouseEnter={() => setHovered(path)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => handleNavClick(path)}
            >
              {path.replace("/", "").charAt(0).toUpperCase() +
                path.replace("/", "").slice(1)}
            </div>
          ))}
        </div>

        {/* Main Area */}
        <div style={styles.main}>
          {/* Navbar */}
          <div style={styles.navbar}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <button style={styles.menuButton} onClick={toggleMobileMenu}>
                ☰
              </button>
              <h3 style={styles.navbarTitle}>Dashboard</h3>
            </div>
            <div>
              <button style={styles.refreshBtn} onClick={handleRefresh}>
                ↻ Refresh
              </button>
              <button style={styles.logoutBtn} onClick={handleLogout}>
                Logout
              </button>
            </div>
          </div>

          {/* Content */}
          <div style={styles.content}>
            {loading ? (
              <div style={{ textAlign: "center", padding: "50px" }}>
                <div>Loading dashboard data...</div>
              </div>
            ) : (
              <>
                <h2 style={styles.welcomeText}>Welcome Back 👋</h2>
                <p style={styles.subText}>
                  Here's an overview of your Inventory. 
                  <span style={{ color: "#4e73df", marginLeft: "10px" }}>
                    Last updated: {new Date().toLocaleTimeString()}
                  </span>
                </p>

                {/* Summary Cards */}
                <div style={styles.cardContainer}>
                  <div style={styles.card}>
                    <div style={styles.cardTitle}>Total Products</div>
                    <div style={styles.cardValue}>{stats.totalProducts}</div>
                    <div style={styles.cardSubtext}>
                      {stats.lowStockProducts} low in stock
                    </div>
                  </div>

                  <div style={styles.card}>
                    <div style={styles.cardTitle}>Total Customers</div>
                    <div style={styles.cardValue}>{stats.totalCustomers}</div>
                  </div>

                  <div style={styles.card}>
                    <div style={styles.cardTitle}>Total Suppliers</div>
                    <div style={styles.cardValue}>{stats.totalSuppliers}</div>
                  </div>

                  <div style={styles.card}>
                    <div style={styles.cardTitle}>Purchase Orders</div>
                    <div style={styles.cardValue}>{stats.totalPurchaseOrders}</div>
                  </div>

                  <div style={styles.card}>
                    <div style={styles.cardTitle}>Sales Orders</div>
                    <div style={styles.cardValue}>{stats.totalSalesOrders}</div>
                  </div>

                  <div style={{...styles.card, ...styles.successCard}}>
                    <div style={styles.cardTitle}>Monthly Revenue</div>
                    <div style={styles.cardValue}>{formatCurrency(stats.monthlyRevenue)}</div>
                  </div>

                  <div style={{...styles.card, ...styles.warningCard}}>
                    <div style={styles.cardTitle}>Low Stock Alert</div>
                    <div style={styles.cardValue}>{stats.lowStockProducts}</div>
                    <div style={styles.cardSubtext}>Products below 10 units</div>
                  </div>

                  <div style={styles.card}>
                    <div style={styles.cardTitle}>Total Orders</div>
                    <div style={styles.cardValue}>
                      {stats.totalPurchaseOrders + stats.totalSalesOrders}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default Dashboard;