// src/pages/Invoices.js
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { orderService } from "../services/orders";
import { customerService } from "../services/customers";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

function Invoices() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const [hovered, setHovered] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [search, setSearch] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRange, setDateRange] = useState("all");
  const [salesOrders, setSalesOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [selectedOrderForInvoice, setSelectedOrderForInvoice] = useState(null);
  const [invoiceForm, setInvoiceForm] = useState({
    orderId: "",
    dueDate: "",
    taxRate: 10,
    notes: "",
    discount: 0
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

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [orders, cust] = await Promise.all([
        orderService.getSalesOrders(),
        customerService.getAll()
      ]);
      
      setSalesOrders(orders);
      setCustomers(cust);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      toast.error("Failed to load invoices");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Convert sales orders to invoices
  const invoices = salesOrders.map(order => {
    const customer = customers.find(c => c.id === order.customer_id);
    const orderDate = new Date(order.created_at);
    const dueDate = new Date(orderDate);
    dueDate.setDate(dueDate.getDate() + 30); // Net 30 terms
    
    // Generate invoice items from order items
    const items = order.items?.map(item => ({
      name: `Product #${item.product_id}`,
      quantity: item.quantity,
      price: item.price
    })) || [];

    const subtotal = order.total_amount || 0;
    const tax = subtotal * 0.1; // 10% tax
    const total = subtotal + tax;

    return {
      id: `INV-${order.id.toString().padStart(6, '0')}`,
      orderId: order.id,
      customer: customer?.name || `Customer #${order.customer_id}`,
      customerId: order.customer_id,
      customerEmail: customer?.email || '',
      date: orderDate.toISOString().split('T')[0],
      dueDate: dueDate.toISOString().split('T')[0],
      amount: subtotal,
      tax: tax,
      total: total,
      status: order.status || 'pending',
      items: items,
      paymentMethod: 'Bank Transfer',
      notes: order.notes || '',
      createdAt: order.created_at
    };
  }).sort((a, b) => new Date(b.date) - new Date(a.date));

  // Filter invoices based on search, status, and date range
  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch = 
      invoice.id.toLowerCase().includes(search.toLowerCase()) ||
      invoice.customer.toLowerCase().includes(search.toLowerCase()) ||
      (invoice.customerEmail && invoice.customerEmail.toLowerCase().includes(search.toLowerCase()));
    
    const matchesStatus = statusFilter === "all" || invoice.status === statusFilter;
    
    // Date range filtering
    let matchesDate = true;
    const invoiceDate = new Date(invoice.date);
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sixtyDaysAgo = new Date(today);
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    
    switch(dateRange) {
      case "30days":
        matchesDate = invoiceDate >= thirtyDaysAgo;
        break;
      case "60days":
        matchesDate = invoiceDate >= sixtyDaysAgo;
        break;
      case "thisMonth":
        matchesDate = invoiceDate.getMonth() === new Date().getMonth() &&
                      invoiceDate.getFullYear() === new Date().getFullYear();
        break;
      default:
        matchesDate = true;
    }
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  // Get orders that don't have invoices yet (you can customize this logic)
  const ordersWithoutInvoice = salesOrders.filter(order => {
    // Add logic to determine if order already has an invoice
    // For now, we'll show all orders that are not cancelled
    return order.status !== 'cancelled';
  });

  const handleViewInvoice = (invoice) => {
    setSelectedInvoice(invoice);
    setShowModal(true);
  };

  const handleGenerateInvoice = async () => {
    if (!selectedOrderForInvoice) {
      toast.error('Please select an order');
      return;
    }

    setGenerating(true);
    try {
      // Calculate dates
      const orderDate = new Date();
      const dueDate = invoiceForm.dueDate ? new Date(invoiceForm.dueDate) : new Date(orderDate.setDate(orderDate.getDate() + 30));
      
      // Format invoice data
      const invoiceData = {
        orderId: selectedOrderForInvoice.id,
        dueDate: dueDate.toISOString().split('T')[0],
        taxRate: invoiceForm.taxRate,
        discount: invoiceForm.discount,
        notes: invoiceForm.notes,
        items: selectedOrderForInvoice.items.map(item => ({
          productId: item.product_id,
          quantity: item.quantity,
          price: item.price,
          name: `Product #${item.product_id}`
        }))
      };

      // Call API to generate invoice
      // await orderService.generateInvoice(invoiceData);
      
      toast.success('Invoice generated successfully');
      setShowGenerateModal(false);
      resetInvoiceForm();
      fetchData(); // Refresh data
    } catch (error) {
      console.error('Error generating invoice:', error);
      toast.error('Failed to generate invoice');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadInvoice = async (invoice) => {
    setDownloading(true);
    try {
      await orderService.downloadInvoice('sales', invoice.orderId);
      toast.success('Invoice downloaded successfully');
    } catch (error) {
      console.error('Error downloading invoice:', error);
      toast.error('Failed to download invoice');
    } finally {
      setDownloading(false);
    }
  };

  const handleMarkAsPaid = async (invoice) => {
    try {
      // Update order status
      // await orderService.updateSalesStatus(invoice.orderId, 'paid');
      toast.success('Invoice marked as paid');
      fetchData();
      setShowModal(false);
    } catch (error) {
      console.error('Error updating invoice:', error);
      toast.error('Failed to update invoice');
    }
  };

  const handleSendEmail = async (invoice) => {
    try {
      // await orderService.sendInvoiceEmail(invoice.orderId);
      toast.success('Invoice sent to customer');
    } catch (error) {
      console.error('Error sending invoice:', error);
      toast.error('Failed to send invoice');
    }
  };

  const handlePrintInvoice = (invoice) => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Invoice ${invoice.id}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .invoice-details { margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #4e73df; color: white; }
            .total { text-align: right; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>INVOICE</h1>
            <h2>${invoice.id}</h2>
          </div>
          <div class="invoice-details">
            <p><strong>Customer:</strong> ${invoice.customer}</p>
            <p><strong>Email:</strong> ${invoice.customerEmail}</p>
            <p><strong>Date:</strong> ${invoice.date}</p>
            <p><strong>Due Date:</strong> ${invoice.dueDate}</p>
            <p><strong>Status:</strong> ${invoice.status}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Quantity</th>
                <th>Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${invoice.items.map(item => `
                <tr>
                  <td>${item.name}</td>
                  <td>${item.quantity}</td>
                  <td>$${item.price.toFixed(2)}</td>
                  <td>$${(item.quantity * item.price).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="total">
            <p>Subtotal: $${invoice.amount.toFixed(2)}</p>
            <p>Tax: $${invoice.tax.toFixed(2)}</p>
            <p><strong>Total: $${invoice.total.toFixed(2)}</strong></p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const resetInvoiceForm = () => {
    setInvoiceForm({
      orderId: "",
      dueDate: "",
      taxRate: 10,
      notes: "",
      discount: 0
    });
    setSelectedOrderForInvoice(null);
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
  const totalInvoices = invoices.length;
  const totalPaid = invoices.filter(i => i.status === "paid" || i.status === "delivered" || i.status === "completed").length;
  const totalPending = invoices.filter(i => i.status === "pending" || i.status === "processing").length;
  const totalOverdue = invoices.filter(i => {
    if (i.status === "paid" || i.status === "completed") return false;
    const dueDate = new Date(i.dueDate);
    const today = new Date();
    return dueDate < today;
  }).length;
  
  const totalRevenue = invoices.reduce((sum, i) => sum + i.total, 0);
  const outstandingAmount = invoices
    .filter(i => i.status !== "paid" && i.status !== "completed" && i.status !== "delivered")
    .reduce((sum, i) => sum + i.total, 0);

  const getStatusColor = (status) => {
    const colors = {
      paid: "#1cc88a",
      completed: "#1cc88a",
      delivered: "#1cc88a",
      pending: "#f6c23e",
      processing: "#36b9cc",
      overdue: "#e74a3b",
      shipped: "#36b9cc",
      cancelled: "#858796"
    };
    return colors[status?.toLowerCase()] || "#858796";
  };

  const getStatusIcon = (status) => {
    const icons = {
      paid: "✅",
      completed: "✅",
      delivered: "✅",
      pending: "⏳",
      processing: "🔄",
      overdue: "⚠️",
      shipped: "📦",
      cancelled: "❌"
    };
    return icons[status?.toLowerCase()] || "📄";
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

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

    statSmall: {
      fontSize: "12px",
      color: "#888",
      marginTop: "5px",
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
      width: isMobile ? "100%" : "250px",
      borderRadius: "8px",
      border: "1px solid #ddd",
      fontSize: "14px",
      outline: "none",
    },

    filterGroup: {
      display: "flex",
      gap: "10px",
      flexWrap: "wrap",
    },

    filterSelect: {
      padding: "8px 12px",
      borderRadius: "8px",
      border: "1px solid #ddd",
      fontSize: "13px",
      backgroundColor: "#fff",
      cursor: "pointer",
      outline: "none",
    },

    filterButtons: {
      display: "flex",
      gap: "10px",
      flexWrap: "wrap",
    },

    filterButton: (status) => ({
      padding: "8px 15px",
      borderRadius: "20px",
      border: "none",
      cursor: "pointer",
      fontSize: "13px",
      fontWeight: "500",
      backgroundColor: statusFilter === status ? "#4e73df" : "#fff",
      color: statusFilter === status ? "#fff" : "#666",
      boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
    }),

    actionButtons: {
      display: "flex",
      gap: "10px",
    },

    generateButton: {
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
    },

    cardContainer: {
      display: "grid",
      gridTemplateColumns: "1fr",
      gap: "15px",
    },

    invoiceCard: {
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

    cardInvoiceId: {
      fontSize: "16px",
      fontWeight: "600",
      color: "#4e73df",
    },

    statusBadge: (status) => ({
      padding: "4px 8px",
      borderRadius: "20px",
      fontSize: "11px",
      fontWeight: "500",
      backgroundColor: getStatusColor(status),
      color: "#fff",
      display: "flex",
      alignItems: "center",
      gap: "4px",
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

    cardAmount: {
      fontSize: "18px",
      fontWeight: "700",
      color: "#333",
    },

    cardItems: {
      marginTop: "10px",
      padding: "10px",
      backgroundColor: "#f8f9fc",
      borderRadius: "8px",
    },

    cardItem: {
      display: "flex",
      justifyContent: "space-between",
      fontSize: "12px",
      marginBottom: "5px",
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

    downloadBtn: {
      backgroundColor: "#1cc88a",
      color: "#fff",
    },

    printBtn: {
      backgroundColor: "#36b9cc",
      color: "#fff",
    },

    emailBtn: {
      backgroundColor: "#f6c23e",
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

    statusBadgeTable: (status) => ({
      padding: "4px 8px",
      borderRadius: "20px",
      fontSize: "11px",
      fontWeight: "500",
      backgroundColor: getStatusColor(status),
      color: "#fff",
      display: "inline-flex",
      alignItems: "center",
      gap: "4px",
    }),

    amountCell: {
      fontWeight: "600",
      color: "#333",
    },

    dueDateCell: (dueDate) => {
      const today = new Date();
      const due = new Date(dueDate);
      const isOverdue = due < today;
      return {
        color: isOverdue ? "#e74a3b" : "#333",
        fontWeight: isOverdue ? "600" : "400",
      };
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

    modalSection: {
      marginBottom: "20px",
      padding: "15px",
      backgroundColor: "#f8f9fc",
      borderRadius: "8px",
    },

    modalSectionTitle: {
      fontSize: "16px",
      fontWeight: "600",
      color: "#4e73df",
      marginBottom: "10px",
    },

    modalRow: {
      display: "flex",
      justifyContent: "space-between",
      marginBottom: "8px",
      fontSize: "14px",
    },

    modalLabel: {
      color: "#666",
      fontWeight: "500",
    },

    modalValue: {
      color: "#333",
      fontWeight: "600",
    },

    modalInput: {
      width: "100%",
      padding: "8px 12px",
      border: "1px solid #ddd",
      borderRadius: "6px",
      fontSize: "14px",
      marginTop: "5px",
    },

    modalSelect: {
      width: "100%",
      padding: "8px 12px",
      border: "1px solid #ddd",
      borderRadius: "6px",
      fontSize: "14px",
      marginTop: "5px",
      backgroundColor: "#fff",
    },

    modalTextarea: {
      width: "100%",
      padding: "8px 12px",
      border: "1px solid #ddd",
      borderRadius: "6px",
      fontSize: "14px",
      marginTop: "5px",
      minHeight: "80px",
      resize: "vertical",
    },

    modalItems: {
      marginTop: "10px",
    },

    modalItem: {
      display: "flex",
      justifyContent: "space-between",
      padding: "8px 0",
      borderBottom: "1px solid #eee",
      fontSize: "14px",
    },

    modalTotal: {
      display: "flex",
      justifyContent: "space-between",
      marginTop: "10px",
      paddingTop: "10px",
      borderTop: "2px solid #ddd",
      fontSize: "16px",
      fontWeight: "700",
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

    modalBtnWarning: {
      backgroundColor: "#f6c23e",
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
              <h3 style={styles.navbarTitle}>Invoices</h3>
            </div>
            <button style={styles.logoutBtn} onClick={handleLogout}>
              Logout
            </button>
          </div>

          {/* Content */}
          <div style={styles.content}>
            <h2 style={styles.welcomeText}>Invoice Management 📄</h2>
            <p style={styles.subText}>Create, manage, and send invoices to customers.</p>

            {/* Stats Cards */}
            <div style={styles.statsContainer}>
              <div style={styles.statCard}>
                <div style={styles.statLabel}>Total Invoices</div>
                <div style={styles.statValue}>{totalInvoices}</div>
                <div style={styles.statSmall}>
                  <span style={{ color: "#1cc88a" }}>✓ {totalPaid} paid</span>
                </div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statLabel}>Total Revenue</div>
                <div style={styles.statValue}>{formatCurrency(totalRevenue)}</div>
                <div style={styles.statSmall}>All time</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statLabel}>Outstanding</div>
                <div style={styles.statValue}>{formatCurrency(outstandingAmount)}</div>
                <div style={styles.statSmall}>
                  <span style={{ color: "#e74a3b" }}>⚠ {totalOverdue} overdue</span>
                </div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statLabel}>Pending</div>
                <div style={styles.statValue}>{totalPending}</div>
                <div style={styles.statSmall}>
                  <span style={{ color: "#f6c23e" }}>⏳ Awaiting payment</span>
                </div>
              </div>
            </div>

            {/* Filter Bar */}
            <div style={styles.filterBar}>
              <input
                type="text"
                placeholder="Search by invoice ID or customer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={styles.searchInput}
              />
              
              <div style={styles.filterGroup}>
                <select 
                  style={styles.filterSelect}
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                >
                  <option value="all">All Time</option>
                  <option value="30days">Last 30 Days</option>
                  <option value="60days">Last 60 Days</option>
                  <option value="thisMonth">This Month</option>
                </select>

                <div style={styles.filterButtons}>
                  <button
                    style={styles.filterButton("all")}
                    onClick={() => setStatusFilter("all")}
                  >
                    All
                  </button>
                  <button
                    style={styles.filterButton("paid")}
                    onClick={() => setStatusFilter("paid")}
                  >
                    Paid
                  </button>
                  <button
                    style={styles.filterButton("pending")}
                    onClick={() => setStatusFilter("pending")}
                  >
                    Pending
                  </button>
                  <button
                    style={styles.filterButton("overdue")}
                    onClick={() => setStatusFilter("overdue")}
                  >
                    Overdue
                  </button>
                </div>

                <div style={styles.actionButtons}>
                  <button 
                    style={styles.generateButton}
                    onClick={() => setShowGenerateModal(true)}
                  >
                    + Generate Invoice
                  </button>
                  <button 
                    style={styles.refreshButton}
                    onClick={fetchData}
                  >
                    ↻ Refresh
                  </button>
                </div>
              </div>
            </div>

            {/* Loading State */}
            {loading && (
              <div style={styles.loadingSpinner}>Loading invoices...</div>
            )}

            {/* Mobile Card View */}
            {!loading && isMobile && (
              <div style={styles.cardContainer}>
                {filteredInvoices.length > 0 ? (
                  filteredInvoices.map((invoice) => (
                    <div key={invoice.id} style={styles.invoiceCard}>
                      <div style={styles.cardHeader}>
                        <span style={styles.cardInvoiceId}>{invoice.id}</span>
                        <span style={styles.statusBadge(invoice.status)}>
                          {getStatusIcon(invoice.status)} {invoice.status}
                        </span>
                      </div>
                      
                      <div style={styles.cardRow}>
                        <span style={styles.cardLabel}>Customer:</span>
                        <span style={styles.cardValue}>{invoice.customer}</span>
                      </div>
                      
                      <div style={styles.cardRow}>
                        <span style={styles.cardLabel}>Date:</span>
                        <span style={styles.cardValue}>{invoice.date}</span>
                      </div>
                      
                      <div style={styles.cardRow}>
                        <span style={styles.cardLabel}>Due Date:</span>
                        <span style={styles.cardValue}>{invoice.dueDate}</span>
                      </div>
                      
                      <div style={styles.cardRow}>
                        <span style={styles.cardLabel}>Amount:</span>
                        <span style={styles.cardAmount}>{formatCurrency(invoice.total)}</span>
                      </div>
                      
                      <div style={styles.cardItems}>
                        {invoice.items.slice(0, 2).map((item, idx) => (
                          <div key={idx} style={styles.cardItem}>
                            <span>{item.name} x{item.quantity}</span>
                            <span>{formatCurrency(item.price * item.quantity)}</span>
                          </div>
                        ))}
                        {invoice.items.length > 2 && (
                          <div style={styles.cardItem}>
                            <span>...and {invoice.items.length - 2} more items</span>
                          </div>
                        )}
                      </div>
                      
                      <div style={styles.cardActions}>
                        <button 
                          style={{ ...styles.actionBtn, ...styles.viewBtn }}
                          onClick={() => handleViewInvoice(invoice)}
                        >
                          View
                        </button>
                        <button 
                          style={{ ...styles.actionBtn, ...styles.downloadBtn }}
                          onClick={() => handleDownloadInvoice(invoice)}
                          disabled={downloading}
                        >
                          {downloading ? '...' : 'PDF'}
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={styles.noData}>No invoices found matching your criteria.</div>
                )}
              </div>
            )}

            {/* Desktop Table View */}
            {!loading && !isMobile && (
              <div style={styles.tableContainer}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Invoice ID</th>
                      <th style={styles.th}>Customer</th>
                      <th style={styles.th}>Date</th>
                      <th style={styles.th}>Due Date</th>
                      <th style={styles.th}>Amount</th>
                      <th style={styles.th}>Status</th>
                      <th style={styles.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInvoices.length > 0 ? (
                      filteredInvoices.map((invoice) => (
                        <tr key={invoice.id}>
                          <td style={styles.td}>
                            <strong>{invoice.id}</strong>
                          </td>
                          <td style={styles.td}>
                            {invoice.customer}
                            {invoice.customerEmail && (
                              <div style={{ fontSize: "12px", color: "#666" }}>{invoice.customerEmail}</div>
                            )}
                          </td>
                          <td style={styles.td}>{invoice.date}</td>
                          <td style={styles.td}>
                            <span style={styles.dueDateCell(invoice.dueDate)}>
                              {invoice.dueDate}
                            </span>
                          </td>
                          <td style={styles.td}>
                            <span style={styles.amountCell}>{formatCurrency(invoice.total)}</span>
                          </td>
                          <td style={styles.td}>
                            <span style={styles.statusBadgeTable(invoice.status)}>
                              {getStatusIcon(invoice.status)} {invoice.status}
                            </span>
                          </td>
                          <td style={styles.td}>
                            <button 
                              style={{ ...styles.actionBtn, ...styles.viewBtn, marginRight: "5px" }}
                              onClick={() => handleViewInvoice(invoice)}
                            >
                              View
                            </button>
                            <button 
                              style={{ ...styles.actionBtn, ...styles.downloadBtn, marginRight: "5px" }}
                              onClick={() => handleDownloadInvoice(invoice)}
                              disabled={downloading}
                            >
                              {downloading ? '...' : 'PDF'}
                            </button>
                            <button 
                              style={{ ...styles.actionBtn, ...styles.emailBtn, marginRight: "5px" }}
                              onClick={() => handleSendEmail(invoice)}
                            >
                              📧
                            </button>
                            <button 
                              style={{ ...styles.actionBtn, ...styles.printBtn }}
                              onClick={() => handlePrintInvoice(invoice)}
                            >
                              🖨️
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td style={styles.td} colSpan="7">
                          <div style={styles.noData}>No invoices found matching your criteria.</div>
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

      {/* Generate Invoice Modal */}
      {showGenerateModal && (
        <div style={styles.modalOverlay} onClick={() => setShowGenerateModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Generate Invoice</h2>
              <button style={styles.modalClose} onClick={() => setShowGenerateModal(false)}>×</button>
            </div>
            
            <div style={styles.modalBody}>
              <div style={styles.modalSection}>
                <div style={styles.modalSectionTitle}>Select Order</div>
                <div style={styles.modalRow}>
                  <label style={styles.modalLabel}>Order *</label>
                  <select 
                    style={styles.modalSelect}
                    value={selectedOrderForInvoice?.id || ''}
                    onChange={(e) => {
                      const order = salesOrders.find(o => o.id === parseInt(e.target.value));
                      setSelectedOrderForInvoice(order);
                      if (order) {
                        const orderDate = new Date(order.created_at);
                        const dueDate = new Date(orderDate);
                        dueDate.setDate(dueDate.getDate() + 30);
                        setInvoiceForm({
                          ...invoiceForm,
                          orderId: order.id,
                          dueDate: dueDate.toISOString().split('T')[0]
                        });
                      }
                    }}
                  >
                    <option value="">Select an order</option>
                    {ordersWithoutInvoice.map(order => {
                      const customer = customers.find(c => c.id === order.customer_id);
                      return (
                        <option key={order.id} value={order.id}>
                          Order #{order.id} - {customer?.name || `Customer #${order.customer_id}`} - ${order.total_amount}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {selectedOrderForInvoice && (
                <>
                  <div style={styles.modalSection}>
                    <div style={styles.modalSectionTitle}>Order Items</div>
                    {selectedOrderForInvoice.items?.map((item, index) => (
                      <div key={index} style={styles.modalItem}>
                        <span>Product #{item.product_id} x{item.quantity}</span>
                        <span>${(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                    <div style={styles.modalTotal}>
                      <span>Subtotal</span>
                      <span>${selectedOrderForInvoice.total_amount?.toFixed(2)}</span>
                    </div>
                  </div>

                  <div style={styles.modalSection}>
                    <div style={styles.modalSectionTitle}>Invoice Details</div>
                    
                    <div style={styles.modalRow}>
                      <label style={styles.modalLabel}>Due Date</label>
                      <input
                        type="date"
                        style={styles.modalInput}
                        value={invoiceForm.dueDate}
                        onChange={(e) => setInvoiceForm({...invoiceForm, dueDate: e.target.value})}
                      />
                    </div>

                    <div style={styles.modalRow}>
                      <label style={styles.modalLabel}>Tax Rate (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        style={styles.modalInput}
                        value={invoiceForm.taxRate}
                        onChange={(e) => setInvoiceForm({...invoiceForm, taxRate: parseFloat(e.target.value) || 0})}
                      />
                    </div>

                    <div style={styles.modalRow}>
                      <label style={styles.modalLabel}>Discount ($)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        style={styles.modalInput}
                        value={invoiceForm.discount}
                        onChange={(e) => setInvoiceForm({...invoiceForm, discount: parseFloat(e.target.value) || 0})}
                      />
                    </div>

                    <div style={styles.modalRow}>
                      <label style={styles.modalLabel}>Notes</label>
                      <textarea
                        style={styles.modalTextarea}
                        value={invoiceForm.notes}
                        onChange={(e) => setInvoiceForm({...invoiceForm, notes: e.target.value})}
                        placeholder="Additional notes for the invoice..."
                      />
                    </div>

                    <div style={styles.modalTotal}>
                      <span>Total Amount</span>
                      <span>
                        ${(
                          (selectedOrderForInvoice.total_amount || 0) + 
                          ((selectedOrderForInvoice.total_amount || 0) * (invoiceForm.taxRate / 100)) - 
                          invoiceForm.discount
                        ).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
            
            <div style={styles.modalFooter}>
              <button 
                style={{...styles.modalBtn, ...styles.modalBtnSecondary}}
                onClick={() => {
                  setShowGenerateModal(false);
                  resetInvoiceForm();
                }}
              >
                Cancel
              </button>
              <button 
                style={{...styles.modalBtn, ...styles.modalBtnSuccess}}
                onClick={handleGenerateInvoice}
                disabled={!selectedOrderForInvoice || generating}
              >
                {generating ? 'Generating...' : 'Generate Invoice'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Detail Modal */}
      {showModal && selectedInvoice && (
        <div style={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Invoice Details</h2>
              <button style={styles.modalClose} onClick={() => setShowModal(false)}>×</button>
            </div>
            
            <div style={styles.modalBody}>
              <div style={styles.modalSection}>
                <div style={styles.modalSectionTitle}>Invoice Information</div>
                <div style={styles.modalRow}>
                  <span style={styles.modalLabel}>Invoice Number:</span>
                  <span style={styles.modalValue}>{selectedInvoice.id}</span>
                </div>
                <div style={styles.modalRow}>
                  <span style={styles.modalLabel}>Order ID:</span>
                  <span style={styles.modalValue}>ORD-{selectedInvoice.orderId}</span>
                </div>
                <div style={styles.modalRow}>
                  <span style={styles.modalLabel}>Date:</span>
                  <span style={styles.modalValue}>{selectedInvoice.date}</span>
                </div>
                <div style={styles.modalRow}>
                  <span style={styles.modalLabel}>Due Date:</span>
                  <span style={styles.modalValue}>{selectedInvoice.dueDate}</span>
                </div>
                <div style={styles.modalRow}>
                  <span style={styles.modalLabel}>Status:</span>
                  <span style={styles.statusBadge(selectedInvoice.status)}>
                    {getStatusIcon(selectedInvoice.status)} {selectedInvoice.status}
                  </span>
                </div>
              </div>

              <div style={styles.modalSection}>
                <div style={styles.modalSectionTitle}>Customer Information</div>
                <div style={styles.modalRow}>
                  <span style={styles.modalLabel}>Name:</span>
                  <span style={styles.modalValue}>{selectedInvoice.customer}</span>
                </div>
                {selectedInvoice.customerEmail && (
                  <div style={styles.modalRow}>
                    <span style={styles.modalLabel}>Email:</span>
                    <span style={styles.modalValue}>{selectedInvoice.customerEmail}</span>
                  </div>
                )}
              </div>

              <div style={styles.modalSection}>
                <div style={styles.modalSectionTitle}>Items</div>
                <div style={styles.modalItems}>
                  {selectedInvoice.items.map((item, index) => (
                    <div key={index} style={styles.modalItem}>
                      <span>{item.name} x {item.quantity}</span>
                      <span>{formatCurrency(item.price * item.quantity)}</span>
                    </div>
                  ))}
                  <div style={styles.modalItem}>
                    <span>Subtotal</span>
                    <span>{formatCurrency(selectedInvoice.amount)}</span>
                  </div>
                  <div style={styles.modalItem}>
                    <span>Tax (10%)</span>
                    <span>{formatCurrency(selectedInvoice.tax)}</span>
                  </div>
                  <div style={styles.modalTotal}>
                    <span>Total</span>
                    <span>{formatCurrency(selectedInvoice.total)}</span>
                  </div>
                </div>
              </div>

              <div style={styles.modalSection}>
                <div style={styles.modalSectionTitle}>Payment Information</div>
                <div style={styles.modalRow}>
                  <span style={styles.modalLabel}>Payment Method:</span>
                  <span style={styles.modalValue}>{selectedInvoice.paymentMethod}</span>
                </div>
                {selectedInvoice.notes && (
                  <div style={styles.modalRow}>
                    <span style={styles.modalLabel}>Notes:</span>
                    <span style={styles.modalValue}>{selectedInvoice.notes}</span>
                  </div>
                )}
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
                style={{...styles.modalBtn, ...styles.modalBtnWarning}}
                onClick={() => handleSendEmail(selectedInvoice)}
              >
                Send Email
              </button>
              <button 
                style={{...styles.modalBtn, ...styles.modalBtnPrimary}}
                onClick={() => handlePrintInvoice(selectedInvoice)}
              >
                Print
              </button>
              <button 
                style={{...styles.modalBtn, ...styles.modalBtnSuccess}}
                onClick={() => handleMarkAsPaid(selectedInvoice)}
              >
                Mark Paid
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Invoices;