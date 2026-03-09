// src/pages/Customers.js
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { customerService } from "../services/customers";
import { orderService } from "../services/orders";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

function Customers() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const [hovered, setHovered] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [customerOrders, setCustomerOrders] = useState({});
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
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

  // Fetch customer orders
  const fetchCustomerOrders = useCallback(async (customersList) => {
    try {
      const orders = await orderService.getSalesOrders();
      const ordersByCustomer = {};
      
      customersList.forEach(customer => {
        const customerOrdersList = orders.filter(order => order.customer_id === customer.id);
        const totalSpent = customerOrdersList.reduce((sum, order) => sum + (order.total_amount || 0), 0);
        
        ordersByCustomer[customer.id] = {
          count: customerOrdersList.length,
          spent: totalSpent
        };
      });
      
      setCustomerOrders(ordersByCustomer);
    } catch (error) {
      console.error("Error fetching customer orders:", error);
    }
  }, []);

  // Fetch customers
  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await customerService.getAll();
      setCustomers(data);
      
      // Fetch orders for each customer to calculate stats
      await fetchCustomerOrders(data);
    } catch (error) {
      console.error("Error fetching customers:", error);
      toast.error("Failed to load customers");
    } finally {
      setLoading(false);
    }
  }, [fetchCustomerOrders]);

  // Fetch customers on component mount
  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const filteredCustomers = customers.filter((customer) =>
    customer.name?.toLowerCase().includes(search.toLowerCase()) ||
    customer.email?.toLowerCase().includes(search.toLowerCase()) ||
    (customer.phone && customer.phone.includes(search))
  );

  const handleEdit = (customer) => {
    setSelectedCustomer(customer);
    setFormData({
      name: customer.name || "",
      email: customer.email || "",
      phone: customer.phone || "",
      address: customer.address || "",
    });
    setShowEditModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this customer?')) {
      try {
        await customerService.delete(id);
        toast.success('Customer deleted successfully');
        fetchCustomers(); // Refresh the list
      } catch (error) {
        console.error('Error deleting customer:', error);
        toast.error(error.response?.data?.detail || 'Failed to delete customer');
      }
    }
  };

  const handleAddCustomer = async () => {
    try {
      // Validate form
      if (!formData.name) {
        toast.error('Customer name is required');
        return;
      }

      await customerService.create(formData);
      toast.success('Customer added successfully');
      setShowAddModal(false);
      resetForm();
      fetchCustomers(); // Refresh the list
    } catch (error) {
      console.error('Error adding customer:', error);
      toast.error(error.response?.data?.detail || 'Failed to add customer');
    }
  };

  const handleUpdateCustomer = async () => {
    try {
      await customerService.update(selectedCustomer.id, formData);
      toast.success('Customer updated successfully');
      setShowEditModal(false);
      resetForm();
      fetchCustomers(); // Refresh the list
    } catch (error) {
      console.error('Error updating customer:', error);
      toast.error(error.response?.data?.detail || 'Failed to update customer');
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      address: "",
    });
    setSelectedCustomer(null);
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

  // Calculate stats from real data
  const totalCustomers = customers.length;
  const activeCustomers = customers.length; // You can add an 'active' field to your model if needed
  const totalOrders = Object.values(customerOrders).reduce((sum, data) => sum + data.count, 0);
  const totalRevenue = Object.values(customerOrders).reduce((sum, data) => sum + data.spent, 0);

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

    actionBar: {
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

    addButton: {
      padding: "10px 20px",
      backgroundColor: "#1cc88a",
      color: "#fff",
      border: "none",
      borderRadius: "8px",
      cursor: "pointer",
      fontSize: "14px",
      fontWeight: "500",
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
      marginLeft: "10px",
    },

    cardContainer: {
      display: "grid",
      gridTemplateColumns: isMobile ? "1fr" : isTablet ? "repeat(2, 1fr)" : "none",
      gap: "15px",
    },

    customerCard: {
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

    cardName: {
      fontSize: "16px",
      fontWeight: "600",
      color: "#333",
    },

    statusBadge: () => ({
      padding: "4px 8px",
      borderRadius: "20px",
      fontSize: "11px",
      fontWeight: "500",
      backgroundColor: "#1cc88a",
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

    editBtn: {
      backgroundColor: "#36b9cc",
      color: "#fff",
    },

    deleteBtn: {
      backgroundColor: "#e74a3b",
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

    statusBadgeTable: () => ({
      padding: "4px 8px",
      borderRadius: "20px",
      fontSize: "11px",
      fontWeight: "500",
      backgroundColor: "#1cc88a",
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
      maxWidth: "500px",
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

    modalInput: {
      width: "100%",
      padding: "8px 12px",
      border: "1px solid #ddd",
      borderRadius: "6px",
      fontSize: "14px",
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
              <h3 style={styles.navbarTitle}>Customers</h3>
            </div>
            <button style={styles.logoutBtn} onClick={handleLogout}>
              Logout
            </button>
          </div>

          {/* Content */}
          <div style={styles.content}>
            <h2 style={styles.welcomeText}>Customer Management 👥</h2>
            <p style={styles.subText}>Manage your customer relationships and view their details.</p>

            {/* Stats Cards */}
            <div style={styles.statsContainer}>
              <div style={styles.statCard}>
                <div style={styles.statLabel}>Total Customers</div>
                <div style={styles.statValue}>{totalCustomers}</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statLabel}>Active Customers</div>
                <div style={styles.statValue}>{activeCustomers}</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statLabel}>Total Orders</div>
                <div style={styles.statValue}>{totalOrders}</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statLabel}>Total Revenue</div>
                <div style={styles.statValue}>${totalRevenue.toLocaleString()}</div>
              </div>
            </div>

            {/* Action Bar */}
            <div style={styles.actionBar}>
              <input
                type="text"
                placeholder="Search customers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={styles.searchInput}
              />
              <div>
                <button 
                  style={styles.addButton}
                  onClick={() => {
                    resetForm();
                    setShowAddModal(true);
                  }}
                >
                  + Add Customer
                </button>
                <button 
                  style={styles.refreshButton}
                  onClick={fetchCustomers}
                >
                  ↻ Refresh
                </button>
              </div>
            </div>

            {/* Loading State */}
            {loading && (
              <div style={styles.loadingSpinner}>Loading customers...</div>
            )}

            {/* Mobile Card View */}
            {!loading && isMobile && (
              <div style={styles.cardContainer}>
                {filteredCustomers.length > 0 ? (
                  filteredCustomers.map((customer) => (
                    <div key={customer.id} style={styles.customerCard}>
                      <div style={styles.cardHeader}>
                        <span style={styles.cardName}>{customer.name}</span>
                        <span style={styles.statusBadge()}>
                          Active
                        </span>
                      </div>
                      
                      <div style={styles.cardRow}>
                        <span style={styles.cardLabel}>Email:</span>
                        <span style={styles.cardValue}>{customer.email || 'N/A'}</span>
                      </div>
                      
                      <div style={styles.cardRow}>
                        <span style={styles.cardLabel}>Phone:</span>
                        <span style={styles.cardValue}>{customer.phone || 'N/A'}</span>
                      </div>
                      
                      <div style={styles.cardRow}>
                        <span style={styles.cardLabel}>Orders:</span>
                        <span style={styles.cardValue}>{customerOrders[customer.id]?.count || 0}</span>
                      </div>
                      
                      <div style={styles.cardRow}>
                        <span style={styles.cardLabel}>Spent:</span>
                        <span style={styles.cardValue}>
                          ${(customerOrders[customer.id]?.spent || 0).toLocaleString()}
                        </span>
                      </div>
                      
                      <div style={styles.cardRow}>
                        <span style={styles.cardLabel}>Address:</span>
                        <span style={styles.cardValue}>{customer.address || 'N/A'}</span>
                      </div>
                      
                      <div style={styles.cardActions}>
                        <button 
                          style={{ ...styles.actionBtn, ...styles.editBtn }}
                          onClick={() => handleEdit(customer)}
                        >
                          Edit
                        </button>
                        <button 
                          style={{ ...styles.actionBtn, ...styles.deleteBtn }}
                          onClick={() => handleDelete(customer.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={styles.noData}>No customers found matching your search.</div>
                )}
              </div>
            )}

            {/* Desktop Table View */}
            {!loading && !isMobile && (
              <div style={styles.tableContainer}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Name</th>
                      <th style={styles.th}>Email</th>
                      <th style={styles.th}>Phone</th>
                      <th style={styles.th}>Address</th>
                      <th style={styles.th}>Orders</th>
                      <th style={styles.th}>Spent</th>
                      <th style={styles.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCustomers.length > 0 ? (
                      filteredCustomers.map((customer) => (
                        <tr key={customer.id}>
                          <td style={styles.td}>{customer.name}</td>
                          <td style={styles.td}>{customer.email || '-'}</td>
                          <td style={styles.td}>{customer.phone || '-'}</td>
                          <td style={styles.td}>{customer.address || '-'}</td>
                          <td style={styles.td}>{customerOrders[customer.id]?.count || 0}</td>
                          <td style={styles.td}>
                            ${(customerOrders[customer.id]?.spent || 0).toLocaleString()}
                          </td>
                          <td style={styles.td}>
                            <button 
                              style={{ ...styles.actionBtn, ...styles.editBtn, marginRight: "5px" }}
                              onClick={() => handleEdit(customer)}
                            >
                              Edit
                            </button>
                            <button 
                              style={{ ...styles.actionBtn, ...styles.deleteBtn }}
                              onClick={() => handleDelete(customer.id)}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td style={styles.td} colSpan="7">
                          <div style={styles.noData}>No customers found matching your search.</div>
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

      {/* Add Customer Modal */}
      {showAddModal && (
        <div style={styles.modalOverlay} onClick={() => setShowAddModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Add New Customer</h2>
              <button style={styles.modalClose} onClick={() => setShowAddModal(false)}>×</button>
            </div>
            
            <div style={styles.modalBody}>
              <div style={styles.modalRow}>
                <label style={styles.modalLabel}>Name *</label>
                <input
                  type="text"
                  style={styles.modalInput}
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Enter customer name"
                />
              </div>
              
              <div style={styles.modalRow}>
                <label style={styles.modalLabel}>Email</label>
                <input
                  type="email"
                  style={styles.modalInput}
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="Enter email address"
                />
              </div>
              
              <div style={styles.modalRow}>
                <label style={styles.modalLabel}>Phone</label>
                <input
                  type="text"
                  style={styles.modalInput}
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  placeholder="Enter phone number"
                />
              </div>
              
              <div style={styles.modalRow}>
                <label style={styles.modalLabel}>Address</label>
                <textarea
                  style={styles.modalInput}
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  placeholder="Enter address"
                  rows="3"
                />
              </div>
            </div>
            
            <div style={styles.modalFooter}>
              <button 
                style={{...styles.modalBtn, ...styles.modalBtnSecondary}}
                onClick={() => setShowAddModal(false)}
              >
                Cancel
              </button>
              <button 
                style={{...styles.modalBtn, ...styles.modalBtnSuccess}}
                onClick={handleAddCustomer}
              >
                Add Customer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Customer Modal */}
      {showEditModal && (
        <div style={styles.modalOverlay} onClick={() => setShowEditModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Edit Customer</h2>
              <button style={styles.modalClose} onClick={() => setShowEditModal(false)}>×</button>
            </div>
            
            <div style={styles.modalBody}>
              <div style={styles.modalRow}>
                <label style={styles.modalLabel}>Name</label>
                <input
                  type="text"
                  style={styles.modalInput}
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
              
              <div style={styles.modalRow}>
                <label style={styles.modalLabel}>Email</label>
                <input
                  type="email"
                  style={styles.modalInput}
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
              
              <div style={styles.modalRow}>
                <label style={styles.modalLabel}>Phone</label>
                <input
                  type="text"
                  style={styles.modalInput}
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                />
              </div>
              
              <div style={styles.modalRow}>
                <label style={styles.modalLabel}>Address</label>
                <textarea
                  style={styles.modalInput}
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  rows="3"
                />
              </div>
            </div>
            
            <div style={styles.modalFooter}>
              <button 
                style={{...styles.modalBtn, ...styles.modalBtnSecondary}}
                onClick={() => setShowEditModal(false)}
              >
                Cancel
              </button>
              <button 
                style={{...styles.modalBtn, ...styles.modalBtnPrimary}}
                onClick={handleUpdateCustomer}
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Detail Modal */}
      {showModal && selectedCustomer && (
        <div style={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Customer Details</h2>
              <button style={styles.modalClose} onClick={() => setShowModal(false)}>×</button>
            </div>
            
            <div style={styles.modalBody}>
              <div style={styles.modalRow}>
                <div style={styles.modalLabel}>Name</div>
                <div style={styles.modalValue}>{selectedCustomer.name}</div>
              </div>
              
              <div style={styles.modalRow}>
                <div style={styles.modalLabel}>Email</div>
                <div style={styles.modalValue}>{selectedCustomer.email || 'N/A'}</div>
              </div>
              
              <div style={styles.modalRow}>
                <div style={styles.modalLabel}>Phone</div>
                <div style={styles.modalValue}>{selectedCustomer.phone || 'N/A'}</div>
              </div>
              
              <div style={styles.modalRow}>
                <div style={styles.modalLabel}>Address</div>
                <div style={styles.modalValue}>{selectedCustomer.address || 'N/A'}</div>
              </div>
              
              <div style={styles.modalRow}>
                <div style={styles.modalLabel}>Total Orders</div>
                <div style={styles.modalValue}>{customerOrders[selectedCustomer.id]?.count || 0}</div>
              </div>
              
              <div style={styles.modalRow}>
                <div style={styles.modalLabel}>Total Spent</div>
                <div style={styles.modalValue}>
                  ${(customerOrders[selectedCustomer.id]?.spent || 0).toLocaleString()}
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
                style={{...styles.modalBtn, ...styles.modalBtnPrimary}}
                onClick={() => {
                  setShowModal(false);
                  handleEdit(selectedCustomer);
                }}
              >
                Edit Customer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Customers;