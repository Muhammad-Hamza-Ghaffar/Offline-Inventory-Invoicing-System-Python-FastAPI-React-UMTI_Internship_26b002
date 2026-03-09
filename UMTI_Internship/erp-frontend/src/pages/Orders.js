import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { orderService } from "../services/orders";
import { customerService } from "../services/customers";
import { supplierService } from "../services/suppliers";
import { productService } from "../services/products";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

function Orders() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  // Removed unused 'hovered' state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [orderType, setOrderType] = useState("sales");
  const [statusFilter, setStatusFilter] = useState("all");
  const [salesOrders, setSalesOrders] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  
  const [newOrder, setNewOrder] = useState({
    customer_id: "",
    supplier_id: "",
    items: [{ product_id: "", quantity: 1, price: 0 }]
  });

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

  const isMobile = windowWidth <= 768;
  const isTablet = windowWidth > 768 && windowWidth <= 1024;

  // Fetch all data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [sales, purchases, cust, supp, prods] = await Promise.all([
        orderService.getSalesOrders().catch(() => []),
        orderService.getPurchaseOrders().catch(() => []),
        customerService.getAll().catch(() => []),
        supplierService.getAll().catch(() => []),
        productService.getAll().catch(() => [])
      ]);

      setSalesOrders(sales);
      setPurchaseOrders(purchases);
      setCustomers(cust);
      setSuppliers(supp);
      setProducts(prods);
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Combine and format orders for display
  const getAllOrders = () => {
    const sales = salesOrders.map(order => ({
      id: `SALES-${order.id}`,
      originalId: order.id,
      type: 'sales',
      customer: customers.find(c => c.id === order.customer_id)?.name || `Customer #${order.customer_id}`,
      date: new Date(order.created_at).toLocaleDateString(),
      total: order.total_amount,
      status: order.status || 'completed',
      items: order.items?.length || 0,
      payment: 'paid'
    }));

    const purchases = purchaseOrders.map(order => ({
      id: `PUR-${order.id}`,
      originalId: order.id,
      type: 'purchase',
      supplier: suppliers.find(s => s.id === order.supplier_id)?.name || `Supplier #${order.supplier_id}`,
      date: new Date(order.created_at).toLocaleDateString(),
      total: order.total_amount,
      status: order.status || 'completed',
      items: order.items?.length || 0,
      payment: 'paid'
    }));

    return [...sales, ...purchases].sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  const allOrders = getAllOrders();

  const filteredOrders = allOrders.filter((order) => {
    const matchesSearch = 
      order.id.toLowerCase().includes(search.toLowerCase()) ||
      (order.customer?.toLowerCase().includes(search.toLowerCase())) ||
      (order.supplier?.toLowerCase().includes(search.toLowerCase()));
    
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    const matchesType = orderType === "all" || order.type === orderType;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const handleCreateSalesOrder = async () => {
    if (!newOrder.customer_id) {
      toast.error('Please select a customer');
      return;
    }

    if (newOrder.items.length === 0 || !newOrder.items[0].product_id) {
      toast.error('Please add at least one item');
      return;
    }

    setCreating(true);
    try {
      const orderData = {
        customer_id: parseInt(newOrder.customer_id),
        items: newOrder.items.map(item => ({
          product_id: parseInt(item.product_id),
          quantity: item.quantity,
          price: parseFloat(item.price)
        }))
      };

      await orderService.createSales(orderData);
      toast.success('Sales order created successfully');
      setShowCreateModal(false);
      resetNewOrder();
      fetchData();
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error(error.response?.data?.detail || 'Failed to create order');
    } finally {
      setCreating(false);
    }
  };

  const handleCreatePurchaseOrder = async () => {
    if (!newOrder.supplier_id) {
      toast.error('Please select a supplier');
      return;
    }

    if (newOrder.items.length === 0 || !newOrder.items[0].product_id) {
      toast.error('Please add at least one item');
      return;
    }

    setCreating(true);
    try {
      const orderData = {
        supplier_id: parseInt(newOrder.supplier_id),
        items: newOrder.items.map(item => ({
          product_id: parseInt(item.product_id),
          quantity: item.quantity,
          price: parseFloat(item.price)
        }))
      };

      await orderService.createPurchase(orderData);
      toast.success('Purchase order created successfully');
      setShowCreateModal(false);
      resetNewOrder();
      fetchData();
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error(error.response?.data?.detail || 'Failed to create order');
    } finally {
      setCreating(false);
    }
  };

  const addOrderItem = () => {
    setNewOrder({
      ...newOrder,
      items: [...newOrder.items, { product_id: "", quantity: 1, price: 0 }]
    });
  };

  const removeOrderItem = (index) => {
    const updatedItems = newOrder.items.filter((_, i) => i !== index);
    setNewOrder({ ...newOrder, items: updatedItems });
  };

  const updateOrderItem = (index, field, value) => {
    const updatedItems = [...newOrder.items];
    
    if (field === 'product_id') {
      const selectedProduct = products.find(p => p.id === parseInt(value));
      updatedItems[index] = {
        ...updatedItems[index],
        product_id: value,
        price: selectedProduct?.price || 0
      };
    } else {
      updatedItems[index] = { ...updatedItems[index], [field]: value };
    }
    
    setNewOrder({ ...newOrder, items: updatedItems });
  };

  const resetNewOrder = () => {
    setNewOrder({
      customer_id: "",
      supplier_id: "",
      items: [{ product_id: "", quantity: 1, price: 0 }]
    });
  };

  const handleViewOrder = (order) => {
    setSelectedOrder(order);
    setShowModal(true);
  };

  const handleDownloadInvoice = async (order) => {
    try {
      const [type, originalId] = order.id.split('-');
      const orderType = type === 'SALES' ? 'sales' : 'purchase';
      await orderService.downloadInvoice(orderType, parseInt(originalId));
      toast.success('Invoice downloaded successfully');
    } catch (error) {
      console.error('Error downloading invoice:', error);
      toast.error('Failed to download invoice');
    }
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

  // Calculate stats
  const totalOrders = allOrders.length;
  const pendingOrders = allOrders.filter(o => o.status === "pending").length;
  const completedOrders = allOrders.filter(o => o.status === "completed" || o.status === "delivered").length;
  const totalRevenue = salesOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
  // Removed unused totalPurchases variable

  const getStatusColor = (status) => {
    const colors = {
      completed: "#1cc88a",
      delivered: "#1cc88a",
      processing: "#36b9cc",
      shipped: "#f6c23e",
      pending: "#e74a3b",
      cancelled: "#858796"
    };
    return colors[status?.toLowerCase()] || "#858796";
  };

  // Styles object
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

    navItem: (isActive) => ({
      padding: isMobile ? "10px 12px" : "12px 15px",
      marginBottom: "8px",
      borderRadius: "8px",
      cursor: "pointer",
      transition: "0.3s",
      whiteSpace: "nowrap",
      backgroundColor: isActive ? "#2e59d9" : "transparent",
      color: "#fff",
      '&:hover': {
        backgroundColor: "rgba(255,255,255,0.2)",
      },
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

    welcomeText: {
      fontSize: isMobile ? "20px" : "24px",
      marginBottom: "5px",
    },

    subText: {
      fontSize: isMobile ? "14px" : "16px",
      marginBottom: "20px",
      color: "#666",
    },

    statsContainer: {
      display: "grid",
      gridTemplateColumns: isMobile ? "1fr" : isTablet ? "repeat(2, 1fr)" : "repeat(4, 1fr)",
      gap: "15px",
      marginBottom: "25px",
    },

    statCard: {
      background: "#fff",
      padding: "15px",
      borderRadius: "10px",
      boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    },

    statLabel: {
      fontSize: "13px",
      color: "#666",
      marginBottom: "5px",
    },

    statValue: {
      fontSize: "20px",
      fontWeight: "600",
      color: "#333",
    },

    filterBar: {
      display: "flex",
      flexDirection: isMobile ? "column" : "row",
      justifyContent: "space-between",
      alignItems: isMobile ? "stretch" : "center",
      gap: "15px",
      marginBottom: "20px",
    },

    searchInput: {
      padding: "10px 15px",
      width: isMobile ? "100%" : "300px",
      borderRadius: "8px",
      border: "1px solid #ddd",
      fontSize: "14px",
      outline: "none",
    },

    filterButtons: {
      display: "flex",
      gap: "10px",
      flexWrap: "wrap",
      marginBottom: "20px",
    },

    filterButton: (isActive) => ({
      padding: "8px 15px",
      borderRadius: "20px",
      border: "none",
      cursor: "pointer",
      fontSize: "13px",
      fontWeight: "500",
      backgroundColor: isActive ? "#4e73df" : "#fff",
      color: isActive ? "#fff" : "#666",
      boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
    }),

    typeButtons: {
      display: "flex",
      gap: "10px",
      marginRight: "15px",
    },

    refreshButton: {
      padding: "10px 20px",
      backgroundColor: "#4e73df",
      color: "#fff",
      border: "none",
      borderRadius: "8px",
      cursor: "pointer",
      fontSize: "14px",
      fontWeight: "500",
    },

    createSalesButton: {
      padding: "10px 20px",
      backgroundColor: "#4e73df",
      color: "#fff",
      border: "none",
      borderRadius: "8px",
      cursor: "pointer",
      fontSize: "14px",
      fontWeight: "500",
      marginLeft: "10px",
    },

    createPurchaseButton: {
      padding: "10px 20px",
      backgroundColor: "#f6c23e",
      color: "#fff",
      border: "none",
      borderRadius: "8px",
      cursor: "pointer",
      fontSize: "14px",
      fontWeight: "500",
      marginLeft: "10px",
    },

    addItemButton: {
      padding: "8px 12px",
      backgroundColor: "#36b9cc",
      color: "#fff",
      border: "none",
      borderRadius: "6px",
      cursor: "pointer",
      fontSize: "13px",
      marginTop: "10px",
    },

    removeItemButton: {
      padding: "4px 8px",
      backgroundColor: "#e74a3b",
      color: "#fff",
      border: "none",
      borderRadius: "4px",
      cursor: "pointer",
      fontSize: "11px",
      marginLeft: "10px",
    },

    selectInput: {
      padding: "8px 12px",
      borderRadius: "6px",
      border: "1px solid #ddd",
      fontSize: "14px",
      width: "100%",
      marginBottom: "10px",
    },

    itemRow: {
      display: "flex",
      gap: "10px",
      marginBottom: "10px",
      alignItems: "center",
    },

    itemSelect: {
      flex: 2,
      padding: "8px",
      borderRadius: "6px",
      border: "1px solid #ddd",
    },

    itemInput: {
      flex: 1,
      padding: "8px",
      borderRadius: "6px",
      border: "1px solid #ddd",
    },

    cardContainer: {
      display: "grid",
      gridTemplateColumns: "1fr",
      gap: "15px",
    },

    orderCard: {
      background: "#fff",
      borderRadius: "12px",
      padding: "15px",
      boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    },

    cardHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "12px",
      paddingBottom: "10px",
      borderBottom: "1px solid #eee",
    },

    orderId: {
      fontSize: "16px",
      fontWeight: "600",
      color: "#4e73df",
    },

    orderType: {
      fontSize: "12px",
      padding: "3px 8px",
      borderRadius: "4px",
      backgroundColor: "#eef2f9",
      color: "#4e73df",
      marginLeft: "8px",
    },

    statusBadge: (status) => ({
      padding: "4px 8px",
      borderRadius: "20px",
      fontSize: "11px",
      fontWeight: "500",
      backgroundColor: getStatusColor(status),
      color: "#fff",
    }),

    cardRow: {
      display: "flex",
      justifyContent: "space-between",
      marginBottom: "8px",
      fontSize: "13px",
    },

    cardLabel: {
      color: "#666",
    },

    cardValue: {
      color: "#333",
      fontWeight: "500",
    },

    cardActions: {
      display: "flex",
      gap: "10px",
      marginTop: "12px",
      paddingTop: "10px",
      borderTop: "1px solid #eee",
    },

    actionBtn: {
      padding: "6px 12px",
      border: "none",
      borderRadius: "5px",
      cursor: "pointer",
      fontSize: "12px",
      fontWeight: "500",
      flex: 1,
    },

    viewBtn: {
      backgroundColor: "#4e73df",
      color: "#fff",
    },

    invoiceBtn: {
      backgroundColor: "#1cc88a",
      color: "#fff",
    },

    tableContainer: {
      marginTop: "20px",
      background: "#fff",
      borderRadius: "12px",
      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
      overflow: "hidden",
      display: isMobile ? "none" : "block",
    },

    table: {
      width: "100%",
      borderCollapse: "collapse",
    },

    th: {
      textAlign: "left",
      padding: "15px 12px",
      background: "#4e73df",
      color: "#fff",
      fontSize: "14px",
      fontWeight: "500",
      whiteSpace: "nowrap",
    },

    td: {
      padding: "12px",
      borderBottom: "1px solid #eee",
      fontSize: "14px",
      color: "#333",
    },

    typeBadge: (type) => ({
      padding: "3px 8px",
      borderRadius: "4px",
      fontSize: "11px",
      fontWeight: "500",
      backgroundColor: type === 'sales' ? '#e3f2fd' : '#fff3e0',
      color: type === 'sales' ? '#1976d2' : '#f57c00',
      display: "inline-block",
    }),

    statusBadgeTable: (status) => ({
      padding: "4px 8px",
      borderRadius: "20px",
      fontSize: "11px",
      fontWeight: "500",
      backgroundColor: getStatusColor(status),
      color: "#fff",
      display: "inline-block",
    }),

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

    modalOverlay: {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0,0,0,0.5)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 2000,
      padding: "20px",
    },

    modal: {
      background: "#fff",
      borderRadius: "12px",
      padding: "20px",
      width: "100%",
      maxWidth: "600px",
      maxHeight: "90vh",
      overflow: "auto",
    },

    modalHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "20px",
      paddingBottom: "10px",
      borderBottom: "1px solid #eee",
    },

    modalTitle: {
      fontSize: "20px",
      fontWeight: "600",
      color: "#333",
    },

    modalClose: {
      background: "none",
      border: "none",
      fontSize: "24px",
      cursor: "pointer",
      color: "#666",
    },

    modalBody: {
      marginBottom: "20px",
    },

    modalRow: {
      marginBottom: "15px",
    },

    modalLabel: {
      display: "block",
      fontSize: "14px",
      color: "#666",
      marginBottom: "5px",
    },

    modalValue: {
      fontSize: "16px",
      color: "#333",
      fontWeight: "500",
    },

    modalFooter: {
      display: "flex",
      justifyContent: "flex-end",
      gap: "10px",
      paddingTop: "15px",
      borderTop: "1px solid #eee",
    },

    modalBtn: {
      padding: "8px 16px",
      border: "none",
      borderRadius: "6px",
      cursor: "pointer",
      fontSize: "14px",
    },

    modalBtnPrimary: {
      backgroundColor: "#4e73df",
      color: "#fff",
    },

    modalBtnSecondary: {
      backgroundColor: "#e74a3b",
      color: "#fff",
    },

    modalBtnSuccess: {
      backgroundColor: "#1cc88a",
      color: "#fff",
    },

    loadingSpinner: {
      textAlign: "center",
      padding: "40px",
      color: "#666",
    },

    noData: {
      textAlign: "center",
      padding: "40px",
      color: "#666",
      fontSize: "16px",
    },

    createButton: {
      display: "block",
      margin: "20px auto 0",
      padding: "10px 20px",
      backgroundColor: "#4e73df",
      color: "#fff",
      border: "none",
      borderRadius: "8px",
      cursor: "pointer",
      fontSize: "14px",
    },
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
              style={styles.navItem(location.pathname === path)}
              onClick={() => handleNavClick(path)}
            >
              {path.replace("/", "").charAt(0).toUpperCase() + path.replace("/", "").slice(1)}
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
              <h3 style={styles.navbarTitle}>Orders</h3>
            </div>
            <button style={styles.logoutBtn} onClick={handleLogout}>
              Logout
            </button>
          </div>

          {/* Content */}
          <div style={styles.content}>
            <h2 style={styles.welcomeText}>Order Management 🛒</h2>
            <p style={styles.subText}>Track and manage all sales and purchase orders.</p>

            {/* Stats Cards */}
            <div style={styles.statsContainer}>
              <div style={styles.statCard}>
                <div style={styles.statLabel}>Total Orders</div>
                <div style={styles.statValue}>{totalOrders}</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statLabel}>Pending</div>
                <div style={styles.statValue}>{pendingOrders}</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statLabel}>Completed</div>
                <div style={styles.statValue}>{completedOrders}</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statLabel}>Revenue</div>
                <div style={styles.statValue}>${totalRevenue.toLocaleString()}</div>
              </div>
            </div>

            {/* Filter Bar */}
            <div style={styles.filterBar}>
              <input
                type="text"
                placeholder="Search by order ID or customer/supplier..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={styles.searchInput}
              />
              
              <div style={{ display: "flex", gap: "15px", alignItems: "center", flexWrap: "wrap" }}>
                <div style={styles.typeButtons}>
                  <button
                    style={styles.filterButton(orderType === "all")}
                    onClick={() => setOrderType("all")}
                  >
                    All Orders
                  </button>
                  <button
                    style={styles.filterButton(orderType === "sales")}
                    onClick={() => setOrderType("sales")}
                  >
                    Sales
                  </button>
                  <button
                    style={styles.filterButton(orderType === "purchase")}
                    onClick={() => setOrderType("purchase")}
                  >
                    Purchases
                  </button>
                </div>

                <div>
                  <button 
                    style={styles.createSalesButton}
                    onClick={() => {
                      setOrderType("sales");
                      setShowCreateModal(true);
                    }}
                  >
                    + New Sales Order
                  </button>
                  <button 
                    style={styles.createPurchaseButton}
                    onClick={() => {
                      setOrderType("purchase");
                      setShowCreateModal(true);
                    }}
                  >
                    + New Purchase Order
                  </button>
                </div>

                <button 
                  style={styles.refreshButton}
                  onClick={fetchData}
                >
                  ↻ Refresh
                </button>
              </div>
            </div>

            {/* Status Filters */}
            <div style={styles.filterButtons}>
              {["all", "pending", "processing", "shipped", "completed", "delivered", "cancelled"].map((status) => (
                <button
                  key={status}
                  style={styles.filterButton(statusFilter === status)}
                  onClick={() => setStatusFilter(status)}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>

            {/* Loading State */}
            {loading && (
              <div style={styles.loadingSpinner}>Loading orders...</div>
            )}

            {/* Mobile Card View */}
            {!loading && isMobile && (
              <div style={styles.cardContainer}>
                {filteredOrders.length > 0 ? (
                  filteredOrders.map((order) => (
                    <div key={order.id} style={styles.orderCard}>
                      <div style={styles.cardHeader}>
                        <div>
                          <span style={styles.orderId}>{order.id}</span>
                          <span style={styles.orderType}>{order.type}</span>
                        </div>
                        <span style={styles.statusBadge(order.status)}>
                          {order.status}
                        </span>
                      </div>
                      
                      <div style={styles.cardRow}>
                        <span style={styles.cardLabel}>
                          {order.type === 'sales' ? 'Customer:' : 'Supplier:'}
                        </span>
                        <span style={styles.cardValue}>
                          {order.customer || order.supplier}
                        </span>
                      </div>
                      
                      <div style={styles.cardRow}>
                        <span style={styles.cardLabel}>Date:</span>
                        <span style={styles.cardValue}>{order.date}</span>
                      </div>
                      
                      <div style={styles.cardRow}>
                        <span style={styles.cardLabel}>Items:</span>
                        <span style={styles.cardValue}>{order.items}</span>
                      </div>
                      
                      <div style={styles.cardRow}>
                        <span style={styles.cardLabel}>Total:</span>
                        <span style={styles.cardValue}>${order.total}</span>
                      </div>
                      
                      <div style={styles.cardActions}>
                        <button 
                          style={{ ...styles.actionBtn, ...styles.viewBtn }}
                          onClick={() => handleViewOrder(order)}
                        >
                          View
                        </button>
                        <button 
                          style={{ ...styles.actionBtn, ...styles.invoiceBtn }}
                          onClick={() => handleDownloadInvoice(order)}
                        >
                          Invoice
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={styles.noData}>
                    No orders found. 
                    <button 
                      style={styles.createButton}
                      onClick={() => setShowCreateModal(true)}
                    >
                      Create your first order
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Desktop Table View */}
            {!loading && !isMobile && (
              <div style={styles.tableContainer}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Order ID</th>
                      <th style={styles.th}>Type</th>
                      <th style={styles.th}>Customer/Supplier</th>
                      <th style={styles.th}>Date</th>
                      <th style={styles.th}>Items</th>
                      <th style={styles.th}>Total</th>
                      <th style={styles.th}>Status</th>
                      <th style={styles.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.length > 0 ? (
                      filteredOrders.map((order) => (
                        <tr key={order.id}>
                          <td style={styles.td}>{order.id}</td>
                          <td style={styles.td}>
                            <span style={styles.typeBadge(order.type)}>
                              {order.type}
                            </span>
                          </td>
                          <td style={styles.td}>{order.customer || order.supplier}</td>
                          <td style={styles.td}>{order.date}</td>
                          <td style={styles.td}>{order.items}</td>
                          <td style={styles.td}>${order.total}</td>
                          <td style={styles.td}>
                            <span style={styles.statusBadgeTable(order.status)}>
                              {order.status}
                            </span>
                          </td>
                          <td style={styles.td}>
                            <button 
                              style={{ ...styles.actionBtn, ...styles.viewBtn, marginRight: "5px" }}
                              onClick={() => handleViewOrder(order)}
                            >
                              View
                            </button>
                            <button 
                              style={{ ...styles.actionBtn, ...styles.invoiceBtn }}
                              onClick={() => handleDownloadInvoice(order)}
                            >
                              Invoice
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td style={styles.td} colSpan="8">
                          <div style={styles.noData}>No orders found. Click "New Sales Order" to create one.</div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Order Modal */}
      {showCreateModal && (
        <div style={styles.modalOverlay} onClick={() => setShowCreateModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>
                Create New {orderType === 'sales' ? 'Sales' : 'Purchase'} Order
              </h2>
              <button style={styles.modalClose} onClick={() => setShowCreateModal(false)}>×</button>
            </div>
            
            <div style={styles.modalBody}>
              {/* Customer/Supplier Selection */}
              {orderType === 'sales' ? (
                <select
                  style={styles.selectInput}
                  value={newOrder.customer_id}
                  onChange={(e) => setNewOrder({...newOrder, customer_id: e.target.value})}
                >
                  <option value="">Select Customer</option>
                  {customers.map(customer => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} ({customer.email})
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  style={styles.selectInput}
                  value={newOrder.supplier_id}
                  onChange={(e) => setNewOrder({...newOrder, supplier_id: e.target.value})}
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map(supplier => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name} ({supplier.email})
                    </option>
                  ))}
                </select>
              )}

              {/* Order Items */}
              <h3>Order Items</h3>
              {newOrder.items.map((item, index) => (
                <div key={index} style={styles.itemRow}>
                  <select
                    style={styles.itemSelect}
                    value={item.product_id}
                    onChange={(e) => updateOrderItem(index, 'product_id', e.target.value)}
                  >
                    <option value="">Select Product</option>
                    {products.map(product => (
                      <option key={product.id} value={product.id}>
                        {product.name} (${product.price}) - Stock: {product.stock}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    style={styles.itemInput}
                    placeholder="Qty"
                    value={item.quantity}
                    min="1"
                    onChange={(e) => updateOrderItem(index, 'quantity', parseInt(e.target.value))}
                  />
                  <input
                    type="number"
                    style={styles.itemInput}
                    placeholder="Price"
                    value={item.price}
                    step="0.01"
                    onChange={(e) => updateOrderItem(index, 'price', parseFloat(e.target.value))}
                  />
                  {newOrder.items.length > 1 && (
                    <button 
                      style={styles.removeItemButton}
                      onClick={() => removeOrderItem(index)}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}

              <button 
                style={styles.addItemButton}
                onClick={addOrderItem}
              >
                + Add Another Item
              </button>
            </div>
            
            <div style={styles.modalFooter}>
              <button 
                style={{...styles.modalBtn, ...styles.modalBtnSecondary}}
                onClick={() => {
                  setShowCreateModal(false);
                  resetNewOrder();
                }}
              >
                Cancel
              </button>
              <button 
                style={{...styles.modalBtn, ...styles.modalBtnSuccess}}
                onClick={orderType === 'sales' ? handleCreateSalesOrder : handleCreatePurchaseOrder}
                disabled={creating}
              >
                {creating ? 'Creating...' : `Create ${orderType === 'sales' ? 'Sales' : 'Purchase'} Order`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      {showModal && selectedOrder && (
        <div style={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Order Details</h2>
              <button style={styles.modalClose} onClick={() => setShowModal(false)}>×</button>
            </div>
            
            <div style={styles.modalBody}>
              <div style={styles.modalRow}>
                <div style={styles.modalLabel}>Order ID</div>
                <div style={styles.modalValue}>{selectedOrder.id}</div>
              </div>
              
              <div style={styles.modalRow}>
                <div style={styles.modalLabel}>Type</div>
                <div style={styles.modalValue}>
                  <span style={styles.typeBadge(selectedOrder.type)}>
                    {selectedOrder.type}
                  </span>
                </div>
              </div>
              
              <div style={styles.modalRow}>
                <div style={styles.modalLabel}>
                  {selectedOrder.type === 'sales' ? 'Customer' : 'Supplier'}
                </div>
                <div style={styles.modalValue}>
                  {selectedOrder.customer || selectedOrder.supplier}
                </div>
              </div>
              
              <div style={styles.modalRow}>
                <div style={styles.modalLabel}>Date</div>
                <div style={styles.modalValue}>{selectedOrder.date}</div>
              </div>
              
              <div style={styles.modalRow}>
                <div style={styles.modalLabel}>Items</div>
                <div style={styles.modalValue}>{selectedOrder.items}</div>
              </div>
              
              <div style={styles.modalRow}>
                <div style={styles.modalLabel}>Total Amount</div>
                <div style={styles.modalValue}>${selectedOrder.total}</div>
              </div>
              
              <div style={styles.modalRow}>
                <div style={styles.modalLabel}>Payment Status</div>
                <div style={styles.modalValue}>{selectedOrder.payment}</div>
              </div>
              
              <div style={styles.modalRow}>
                <div style={styles.modalLabel}>Order Status</div>
                <div style={styles.modalValue}>
                  <span style={styles.statusBadge(selectedOrder.status)}>
                    {selectedOrder.status}
                  </span>
                </div>
              </div>
            </div>
            
            <div style={styles.modalFooter}>
              <button 
                style={{...styles.modalBtn, ...styles.modalBtnSecondary}}
                onClick={() => setShowModal(false)}
              >
                Close
              </button>
              <button 
                style={{...styles.modalBtn, ...styles.modalBtnSuccess}}
                onClick={() => handleDownloadInvoice(selectedOrder)}
              >
                Download Invoice
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Orders;
