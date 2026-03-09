// src/pages/Products.js
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { productService } from "../services/products";
import { csvService } from "../services/csv"; // Add this import
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

function Products() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const [hovered, setHovered] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [stockQuantity, setStockQuantity] = useState(1);
  const [stockAction, setStockAction] = useState("add"); // "add" or "reduce"
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [formData, setFormData] = useState({
    sku: "",
    name: "",
    category: "",
    cost: "",
    price: "",
    stock: "",
    barcode: "",
    description: "",
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

  // Fetch products on component mount
  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const data = await productService.getAll();
      setProducts(data);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  // CSV Export function
  const handleExport = async () => {
    try {
      await csvService.exportProducts();
      toast.success('Products exported successfully');
    } catch (error) {
      console.error('Error exporting products:', error);
      toast.error('Failed to export products');
    }
  };

  // CSV Import function
  const handleImport = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    setImporting(true);
    try {
      const result = await csvService.importProducts(file);
      toast.success(result.message);
      if (result.errors && result.errors.length > 0) {
        console.warn('Import errors:', result.errors);
        // Show first few errors in toast
        const errorMsg = result.errors.slice(0, 3).join(', ');
        toast.error(`Import had ${result.errors.length} errors: ${errorMsg}`);
      }
      fetchProducts(); // Refresh the list
    } catch (error) {
      console.error('Error importing products:', error);
      toast.error(error.response?.data?.detail || 'Failed to import products');
    } finally {
      setImporting(false);
      // Clear the file input
      event.target.value = '';
    }
  };

  const isMobile = windowWidth <= 768;
  const isTablet = windowWidth > 768 && windowWidth <= 1024;

  // Get unique categories from real data
  const categories = ["all", ...new Set(products.map(p => p.category).filter(Boolean))];

  const filteredProducts = products.filter((product) => {
    const matchesSearch = 
      product.name?.toLowerCase().includes(search.toLowerCase()) ||
      product.sku?.toLowerCase().includes(search.toLowerCase()) ||
      product.category?.toLowerCase().includes(search.toLowerCase()) ||
      (product.barcode && product.barcode.includes(search));
    
    const matchesCategory = categoryFilter === "all" || product.category === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  const handleEdit = (product) => {
    setSelectedProduct(product);
    setFormData({
      sku: product.sku || "",
      name: product.name || "",
      category: product.category || "",
      cost: product.cost || "",
      price: product.price || "",
      stock: product.stock || "",
      barcode: product.barcode || "",
      description: product.description || "",
    });
    setShowEditModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await productService.delete(id);
        toast.success('Product deleted successfully');
        fetchProducts(); // Refresh the list
      } catch (error) {
        console.error('Error deleting product:', error);
        toast.error(error.response?.data?.detail || 'Failed to delete product');
      }
    }
  };

  const handleAddProduct = async () => {
    try {
      // Validate form
      if (!formData.sku || !formData.name || !formData.price || !formData.cost) {
        toast.error('Please fill in all required fields');
        return;
      }

      const productData = {
        ...formData,
        cost: parseFloat(formData.cost),
        price: parseFloat(formData.price),
        stock: parseInt(formData.stock) || 0,
      };

      await productService.create(productData);
      toast.success('Product added successfully');
      setShowAddModal(false);
      resetForm();
      fetchProducts(); // Refresh the list
    } catch (error) {
      console.error('Error adding product:', error);
      toast.error(error.response?.data?.detail || 'Failed to add product');
    }
  };

  const handleUpdateProduct = async () => {
    try {
      const productData = {
        ...formData,
        cost: parseFloat(formData.cost),
        price: parseFloat(formData.price),
        stock: parseInt(formData.stock),
      };

      await productService.update(selectedProduct.id, productData);
      toast.success('Product updated successfully');
      setShowEditModal(false);
      resetForm();
      fetchProducts(); // Refresh the list
    } catch (error) {
      console.error('Error updating product:', error);
      toast.error(error.response?.data?.detail || 'Failed to update product');
    }
  };

  const handleStockUpdate = async () => {
    try {
      if (stockAction === "add") {
        await productService.addStock(selectedProduct.id, stockQuantity);
        toast.success(`Added ${stockQuantity} units to stock`);
      } else {
        await productService.reduceStock(selectedProduct.id, stockQuantity);
        toast.success(`Reduced ${stockQuantity} units from stock`);
      }
      setShowStockModal(false);
      setStockQuantity(1);
      fetchProducts(); // Refresh the list
    } catch (error) {
      console.error('Error updating stock:', error);
      toast.error(error.response?.data?.detail || 'Failed to update stock');
    }
  };

  const resetForm = () => {
    setFormData({
      sku: "",
      name: "",
      category: "",
      cost: "",
      price: "",
      stock: "",
      barcode: "",
      description: "",
    });
    setSelectedProduct(null);
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
  const totalProducts = products.length;
  const totalStock = products.reduce((sum, product) => sum + (product.stock || 0), 0);
  const lowStock = products.filter(product => (product.stock || 0) < 10).length;
  const totalValue = products.reduce((sum, product) => sum + ((product.price || 0) * (product.stock || 0)), 0);

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
    },

    filterButton: (category) => ({
      padding: "8px 15px",
      borderRadius: "20px",
      border: "none",
      cursor: "pointer",
      fontSize: "13px",
      fontWeight: "500",
      backgroundColor: categoryFilter === category ? "#4e73df" : "#fff",
      color: categoryFilter === category ? "#fff" : "#666",
      boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
    }),

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

    importButton: {
      padding: "10px 20px",
      backgroundColor: "#36b9cc",
      color: "#fff",
      border: "none",
      borderRadius: "8px",
      cursor: "pointer",
      fontSize: "14px",
      fontWeight: "500",
    },

    exportButton: {
      padding: "10px 20px",
      backgroundColor: "#f6c23e",
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
      gridTemplateColumns: "1fr",
      gap: "15px",
    },

    productCard: {
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

    cardTitle: {
      fontSize: "16px",
      fontWeight: "600",
      color: "#333",
    },

    cardSku: {
      fontSize: "12px",
      color: "#4e73df",
      backgroundColor: "#eef2f9",
      padding: "4px 8px",
      borderRadius: "4px",
      fontWeight: "500",
    },

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

    badgeLow: {
      backgroundColor: "#e74a3b",
      color: "#fff",
      padding: "4px 8px",
      borderRadius: "20px",
      fontSize: "11px",
      fontWeight: "500",
    },

    badgeOk: {
      backgroundColor: "#1cc88a",
      color: "#fff",
      padding: "4px 8px",
      borderRadius: "20px",
      fontSize: "11px",
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

    stockBtn: {
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

    badgeLowTable: {
      backgroundColor: "#e74a3b",
      color: "#fff",
      padding: "4px 8px",
      borderRadius: "20px",
      fontSize: "11px",
      fontWeight: "500",
      display: "inline-block",
    },

    badgeOkTable: {
      backgroundColor: "#1cc88a",
      color: "#fff",
      padding: "4px 8px",
      borderRadius: "20px",
      fontSize: "11px",
      fontWeight: "500",
      display: "inline-block",
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

    // Modal Styles
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
              <h3 style={styles.navbarTitle}>Products</h3>
            </div>
            <button style={styles.logoutBtn} onClick={handleLogout}>
              Logout
            </button>
          </div>

          {/* Content */}
          <div style={styles.content}>
            <h2 style={styles.welcomeText}>Product Management 📦</h2>
            <p style={styles.subText}>Manage your inventory, track stock levels, and update product information.</p>

            {/* Stats Cards */}
            <div style={styles.statsContainer}>
              <div style={styles.statCard}>
                <div style={styles.statLabel}>Total Products</div>
                <div style={styles.statValue}>{totalProducts}</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statLabel}>Total Stock</div>
                <div style={styles.statValue}>{totalStock}</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statLabel}>Low Stock Items</div>
                <div style={styles.statValue}>{lowStock}</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statLabel}>Inventory Value</div>
                <div style={styles.statValue}>${totalValue.toLocaleString()}</div>
              </div>
            </div>

            {/* Filter Bar */}
            <div style={styles.filterBar}>
              <input
                type="text"
                placeholder="Search by name, SKU, or barcode..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={styles.searchInput}
              />
              
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <div style={styles.filterButtons}>
                  {categories.map((category) => (
                    <button
                      key={category}
                      style={styles.filterButton(category)}
                      onClick={() => setCategoryFilter(category)}
                    >
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </button>
                  ))}
                </div>
                
                <button 
                  style={styles.addButton}
                  onClick={() => {
                    resetForm();
                    setShowAddModal(true);
                  }}
                >
                  + Add Product
                </button>

                {/* CSV Import Button */}
                <div>
                  <input
                    type="file"
                    accept=".csv"
                    style={{ display: 'none' }}
                    id="import-file"
                    onChange={handleImport}
                    disabled={importing}
                  />
                  <label htmlFor="import-file">
                    <button 
                      style={styles.importButton}
                      disabled={importing}
                      as="span"
                    >
                      {importing ? '📥 Importing...' : '📥 Import CSV'}
                    </button>
                  </label>
                </div>

                {/* CSV Export Button */}
                <button 
                  style={styles.exportButton}
                  onClick={handleExport}
                >
                  📤 Export CSV
                </button>
                
                <button 
                  style={styles.refreshButton}
                  onClick={fetchProducts}
                >
                  ↻ Refresh
                </button>
              </div>
            </div>

            {/* Loading State */}
            {loading && (
              <div style={styles.loadingSpinner}>Loading products...</div>
            )}

            {/* Mobile Card View */}
            {!loading && isMobile && (
              <div style={styles.cardContainer}>
                {filteredProducts.length > 0 ? (
                  filteredProducts.map((product) => (
                    <div key={product.id} style={styles.productCard}>
                      <div style={styles.cardHeader}>
                        <span style={styles.cardTitle}>{product.name}</span>
                        <span style={styles.cardSku}>{product.sku}</span>
                      </div>
                      
                      <div style={styles.cardRow}>
                        <span style={styles.cardLabel}>Category:</span>
                        <span style={styles.cardValue}>{product.category || 'N/A'}</span>
                      </div>
                      
                      <div style={styles.cardRow}>
                        <span style={styles.cardLabel}>Price:</span>
                        <span style={styles.cardValue}>${product.price}</span>
                      </div>
                      
                      <div style={styles.cardRow}>
                        <span style={styles.cardLabel}>Cost:</span>
                        <span style={styles.cardValue}>${product.cost}</span>
                      </div>
                      
                      <div style={styles.cardRow}>
                        <span style={styles.cardLabel}>Stock:</span>
                        <span>
                          {(product.stock || 0) < 10 ? (
                            <span style={styles.badgeLow}>Low ({product.stock})</span>
                          ) : (
                            <span style={styles.badgeOk}>{product.stock}</span>
                          )}
                        </span>
                      </div>
                      
                      <div style={styles.cardRow}>
                        <span style={styles.cardLabel}>Barcode:</span>
                        <span style={styles.cardValue}>{product.barcode || 'N/A'}</span>
                      </div>
                      
                      <div style={styles.cardActions}>
                        <button 
                          style={{ ...styles.actionBtn, ...styles.stockBtn }}
                          onClick={() => {
                            setSelectedProduct(product);
                            setStockAction("add");
                            setStockQuantity(1);
                            setShowStockModal(true);
                          }}
                        >
                          Add Stock
                        </button>
                        <button 
                          style={{ ...styles.actionBtn, ...styles.editBtn }}
                          onClick={() => handleEdit(product)}
                        >
                          Edit
                        </button>
                        <button 
                          style={{ ...styles.actionBtn, ...styles.deleteBtn }}
                          onClick={() => handleDelete(product.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={styles.noData}>No products found matching your search.</div>
                )}
              </div>
            )}

            {/* Desktop Table View */}
            {!loading && !isMobile && (
              <div style={styles.tableContainer}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>SKU</th>
                      <th style={styles.th}>Name</th>
                      <th style={styles.th}>Category</th>
                      <th style={styles.th}>Cost</th>
                      <th style={styles.th}>Price</th>
                      <th style={styles.th}>Stock</th>
                      <th style={styles.th}>Barcode</th>
                      <th style={styles.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.length > 0 ? (
                      filteredProducts.map((product) => (
                        <tr key={product.id}>
                          <td style={styles.td}>{product.sku}</td>
                          <td style={styles.td}>{product.name}</td>
                          <td style={styles.td}>{product.category || '-'}</td>
                          <td style={styles.td}>${product.cost}</td>
                          <td style={styles.td}>${product.price}</td>
                          <td style={styles.td}>
                            {(product.stock || 0) < 10 ? (
                              <span style={styles.badgeLowTable}>Low ({product.stock})</span>
                            ) : (
                              <span style={styles.badgeOkTable}>{product.stock}</span>
                            )}
                          </td>
                          <td style={styles.td}>{product.barcode || '-'}</td>
                          <td style={styles.td}>
                            <button 
                              style={{ ...styles.actionBtn, ...styles.stockBtn, marginRight: "5px" }}
                              onClick={() => {
                                setSelectedProduct(product);
                                setStockAction("add");
                                setStockQuantity(1);
                                setShowStockModal(true);
                              }}
                            >
                              Stock
                            </button>
                            <button 
                              style={{ ...styles.actionBtn, ...styles.editBtn, marginRight: "5px" }}
                              onClick={() => handleEdit(product)}
                            >
                              Edit
                            </button>
                            <button 
                              style={{ ...styles.actionBtn, ...styles.deleteBtn }}
                              onClick={() => handleDelete(product.id)}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td style={styles.td} colSpan="8">
                          <div style={styles.noData}>No products found matching your search.</div>
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

      {/* Add Product Modal */}
      {showAddModal && (
        <div style={styles.modalOverlay} onClick={() => setShowAddModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Add New Product</h2>
              <button style={styles.modalClose} onClick={() => setShowAddModal(false)}>×</button>
            </div>
            
            <div style={styles.modalBody}>
              <div style={styles.modalRow}>
                <label style={styles.modalLabel}>SKU *</label>
                <input
                  type="text"
                  style={styles.modalInput}
                  value={formData.sku}
                  onChange={(e) => setFormData({...formData, sku: e.target.value})}
                  placeholder="Enter SKU"
                />
              </div>
              
              <div style={styles.modalRow}>
                <label style={styles.modalLabel}>Name *</label>
                <input
                  type="text"
                  style={styles.modalInput}
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Enter product name"
                />
              </div>
              
              <div style={styles.modalRow}>
                <label style={styles.modalLabel}>Category</label>
                <input
                  type="text"
                  style={styles.modalInput}
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  placeholder="Enter category"
                />
              </div>
              
              <div style={styles.modalRow}>
                <label style={styles.modalLabel}>Cost *</label>
                <input
                  type="number"
                  step="0.01"
                  style={styles.modalInput}
                  value={formData.cost}
                  onChange={(e) => setFormData({...formData, cost: e.target.value})}
                  placeholder="Enter cost"
                />
              </div>
              
              <div style={styles.modalRow}>
                <label style={styles.modalLabel}>Price *</label>
                <input
                  type="number"
                  step="0.01"
                  style={styles.modalInput}
                  value={formData.price}
                  onChange={(e) => setFormData({...formData, price: e.target.value})}
                  placeholder="Enter price"
                />
              </div>
              
              <div style={styles.modalRow}>
                <label style={styles.modalLabel}>Initial Stock</label>
                <input
                  type="number"
                  style={styles.modalInput}
                  value={formData.stock}
                  onChange={(e) => setFormData({...formData, stock: e.target.value})}
                  placeholder="Enter initial stock"
                />
              </div>
              
              <div style={styles.modalRow}>
                <label style={styles.modalLabel}>Barcode</label>
                <input
                  type="text"
                  style={styles.modalInput}
                  value={formData.barcode}
                  onChange={(e) => setFormData({...formData, barcode: e.target.value})}
                  placeholder="Enter barcode"
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
                onClick={handleAddProduct}
              >
                Add Product
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {showEditModal && (
        <div style={styles.modalOverlay} onClick={() => setShowEditModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Edit Product</h2>
              <button style={styles.modalClose} onClick={() => setShowEditModal(false)}>×</button>
            </div>
            
            <div style={styles.modalBody}>
              <div style={styles.modalRow}>
                <label style={styles.modalLabel}>SKU</label>
                <input
                  type="text"
                  style={styles.modalInput}
                  value={formData.sku}
                  onChange={(e) => setFormData({...formData, sku: e.target.value})}
                />
              </div>
              
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
                <label style={styles.modalLabel}>Category</label>
                <input
                  type="text"
                  style={styles.modalInput}
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                />
              </div>
              
              <div style={styles.modalRow}>
                <label style={styles.modalLabel}>Cost</label>
                <input
                  type="number"
                  step="0.01"
                  style={styles.modalInput}
                  value={formData.cost}
                  onChange={(e) => setFormData({...formData, cost: e.target.value})}
                />
              </div>
              
              <div style={styles.modalRow}>
                <label style={styles.modalLabel}>Price</label>
                <input
                  type="number"
                  step="0.01"
                  style={styles.modalInput}
                  value={formData.price}
                  onChange={(e) => setFormData({...formData, price: e.target.value})}
                />
              </div>
              
              <div style={styles.modalRow}>
                <label style={styles.modalLabel}>Stock</label>
                <input
                  type="number"
                  style={styles.modalInput}
                  value={formData.stock}
                  onChange={(e) => setFormData({...formData, stock: e.target.value})}
                />
              </div>
              
              <div style={styles.modalRow}>
                <label style={styles.modalLabel}>Barcode</label>
                <input
                  type="text"
                  style={styles.modalInput}
                  value={formData.barcode}
                  onChange={(e) => setFormData({...formData, barcode: e.target.value})}
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
                onClick={handleUpdateProduct}
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stock Update Modal */}
      {showStockModal && selectedProduct && (
        <div style={styles.modalOverlay} onClick={() => setShowStockModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Update Stock</h2>
              <button style={styles.modalClose} onClick={() => setShowStockModal(false)}>×</button>
            </div>
            
            <div style={styles.modalBody}>
              <div style={styles.modalRow}>
                <div style={styles.modalLabel}>Product</div>
                <div style={{fontWeight: "500"}}>{selectedProduct.name} (Current: {selectedProduct.stock})</div>
              </div>
              
              <div style={styles.modalRow}>
                <label style={styles.modalLabel}>Action</label>
                <select
                  style={styles.modalInput}
                  value={stockAction}
                  onChange={(e) => setStockAction(e.target.value)}
                >
                  <option value="add">Add Stock</option>
                  <option value="reduce">Reduce Stock</option>
                </select>
              </div>
              
              <div style={styles.modalRow}>
                <label style={styles.modalLabel}>Quantity</label>
                <input
                  type="number"
                  min="1"
                  style={styles.modalInput}
                  value={stockQuantity}
                  onChange={(e) => setStockQuantity(parseInt(e.target.value) || 1)}
                />
              </div>
            </div>
            
            <div style={styles.modalFooter}>
              <button 
                style={{...styles.modalBtn, ...styles.modalBtnSecondary}}
                onClick={() => setShowStockModal(false)}
              >
                Cancel
              </button>
              <button 
                style={{...styles.modalBtn, ...styles.modalBtnSuccess}}
                onClick={handleStockUpdate}
              >
                Update Stock
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Products;