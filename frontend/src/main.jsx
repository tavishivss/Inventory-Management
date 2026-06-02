import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  AlertCircle,
  ArrowDownRight,
  BarChart3,
  Boxes,
  CheckCircle2,
  ClipboardList,
  Eye,
  LayoutDashboard,
  Menu,
  MoreHorizontal,
  PackagePlus,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShoppingCart,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import './styles.css';

const API_URL = import.meta.env.VITE_API_URL;

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'products', label: 'Products', icon: ProductStackIcon },
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'orders', label: 'Orders', icon: ShoppingCart },
];

function ProductStackIcon({ size = 18, ...props }) {
  return (
    <svg
      aria-hidden="true"
      height={size}
      viewBox="0 0 24 24"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <rect height="4" rx="1" fill="currentColor" width="16" x="4" y="5" />
      <rect height="4" rx="1" fill="currentColor" width="16" x="4" y="10" />
      <rect height="4" rx="1" fill="currentColor" width="16" x="4" y="15" />
    </svg>
  );
}

const emptyProductForm = { name: '', sku: '', price: '', quantity_in_stock: '' };
const emptyCustomerForm = { full_name: '', email: '', phone: '' };
const emptyOrderForm = { customer_id: '', product_id: '', quantity: 1 };

async function request(path, options = {}) {
  if (!API_URL) {
    throw new Error('Missing VITE_API_URL. Add it to your frontend environment before running the app.');
  }

  const response = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const body = await response.json();
      message = Array.isArray(body.detail)
        ? body.detail.map((item) => item.msg).join(', ')
        : body.detail || message;
    } catch {
      // Keep the status-based message when the response is not JSON.
    }
    throw new Error(message);
  }

  if (response.status === 204) return null;
  return response.json();
}

function money(value) {
  return `$${Number(value || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function stockState(product) {
  const count = Number(product.quantity_in_stock);
  if (count === 0) return { label: 'Out of stock', tone: 'danger' };
  if (count <= 5) return { label: 'Low stock', tone: 'warning' };
  return { label: 'In stock', tone: 'success' };
}

function clamp(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'IN';
}

function orderItemQuantity(order) {
  return order.items.reduce((total, item) => total + Number(item.quantity), 0);
}

function App() {
  const [activePage, setActivePage] = useState('dashboard');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [summary, setSummary] = useState(null);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [drawer, setDrawer] = useState(null);
  const [editingProductId, setEditingProductId] = useState(null);
  const [productForm, setProductForm] = useState(emptyProductForm);
  const [customerForm, setCustomerForm] = useState(emptyCustomerForm);
  const [orderForm, setOrderForm] = useState(emptyOrderForm);
  const [query, setQuery] = useState('');
  const [orderFilter, setOrderFilter] = useState('all');
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const messageTimer = useRef(null);

  const lowStock = useMemo(
    () => products.filter((product) => Number(product.quantity_in_stock) <= 5),
    [products],
  );

  const inventoryValue = useMemo(
    () => products.reduce((total, product) => total + Number(product.price) * Number(product.quantity_in_stock), 0),
    [products],
  );

  const revenue = useMemo(
    () => orders.reduce((total, order) => total + Number(order.total_amount), 0),
    [orders],
  );

  const orderedUnits = useMemo(
    () => orders.reduce(
      (total, order) => total + order.items.reduce((itemTotal, item) => itemTotal + Number(item.quantity), 0),
      0,
    ),
    [orders],
  );

  const filteredProducts = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return products;
    return products.filter((product) =>
      [product.name, product.sku].some((value) => String(value).toLowerCase().includes(term)),
    );
  }, [products, query]);

  const filteredCustomers = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return customers;
    return customers.filter((customer) =>
      [customer.full_name, customer.email, customer.phone].some((value) =>
        String(value).toLowerCase().includes(term),
      ),
    );
  }, [customers, query]);

  const filteredOrders = useMemo(() => {
    const term = query.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesTerm =
        !term ||
        [order.id, order.customer_name, order.customer_email].some((value) =>
          String(value).toLowerCase().includes(term),
        );
      const matchesFilter =
        orderFilter === 'all' ||
        (orderFilter === 'large' && Number(order.total_amount) >= 500) ||
        (orderFilter === 'single' && orderItemQuantity(order) === 1);
      return matchesTerm && matchesFilter;
    });
  }, [orders, orderFilter, query]);

  function flash(type, text) {
    if (messageTimer.current) {
      window.clearTimeout(messageTimer.current);
    }
    setMessage({ type, text });
    messageTimer.current = window.setTimeout(() => {
      setMessage(null);
      messageTimer.current = null;
    }, 4200);
  }

  function dismissMessage() {
    if (messageTimer.current) {
      window.clearTimeout(messageTimer.current);
      messageTimer.current = null;
    }
    setMessage(null);
  }

  async function loadAll({ notifySuccess = false } = {}) {
    setLoading(true);
    try {
      const [productData, customerData, orderData, dashboardData] = await Promise.all([
        request('/products'),
        request('/customers'),
        request('/orders'),
        request('/dashboard'),
      ]);
      setProducts(productData);
      setCustomers(customerData);
      setOrders(orderData);
      setSummary(dashboardData);
      setSelectedOrderIds((current) => current.filter((id) => orderData.some((order) => order.id === id)));
      if (notifySuccess) {
        flash('success', 'Data refreshed.');
      }
    } catch (error) {
      flash('error', error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    return () => {
      if (messageTimer.current) {
        window.clearTimeout(messageTimer.current);
      }
    };
  }, []);

  function navigate(pageId) {
    setActivePage(pageId);
    setQuery('');
    setMobileNavOpen(false);
  }

  async function saveProduct(event) {
    event.preventDefault();
    const payload = {
      ...productForm,
      price: Number(productForm.price),
      quantity_in_stock: Number(productForm.quantity_in_stock),
    };
    try {
      if (editingProductId) {
        await request(`/products/${editingProductId}`, { method: 'PUT', body: JSON.stringify(payload) });
        flash('success', 'Product updated.');
      } else {
        await request('/products', { method: 'POST', body: JSON.stringify(payload) });
        flash('success', 'Product added.');
      }
      setProductForm(emptyProductForm);
      setEditingProductId(null);
      await loadAll();
    } catch (error) {
      flash('error', error.message);
    }
  }

  async function saveCustomer(event) {
    event.preventDefault();
    try {
      await request('/customers', { method: 'POST', body: JSON.stringify(customerForm) });
      setCustomerForm(emptyCustomerForm);
      flash('success', 'Customer added.');
      await loadAll();
    } catch (error) {
      flash('error', error.message);
    }
  }

  async function createOrder(event) {
    event.preventDefault();
    try {
      const order = await request('/orders', {
        method: 'POST',
        body: JSON.stringify({
          customer_id: Number(orderForm.customer_id),
          items: [{ product_id: Number(orderForm.product_id), quantity: Number(orderForm.quantity) }],
        }),
      });
      setOrderForm(emptyOrderForm);
      setDrawer({ type: 'order', data: order });
      flash('success', 'Order created and inventory updated.');
      await loadAll();
    } catch (error) {
      flash('error', error.message);
    }
  }

  async function remove(path, successText) {
    try {
      await request(path, { method: 'DELETE' });
      flash('success', successText);
      setDrawer(null);
      await loadAll();
    } catch (error) {
      flash('error', error.message);
    }
  }

  async function removeSelectedOrders(orderIds) {
    if (!orderIds.length) return;
    try {
      await Promise.all(orderIds.map((id) => request(`/orders/${id}`, { method: 'DELETE' })));
      setSelectedOrderIds([]);
      setDrawer(null);
      flash('success', `${orderIds.length} order${orderIds.length === 1 ? '' : 's'} deleted and stock restored.`);
      await loadAll();
    } catch (error) {
      flash('error', error.message);
    }
  }

  function toggleOrderSelection(orderId) {
    setSelectedOrderIds((current) =>
      current.includes(orderId) ? current.filter((id) => id !== orderId) : [...current, orderId],
    );
  }

  function toggleVisibleOrderSelection(orderIds) {
    setSelectedOrderIds((current) => {
      const allSelected = orderIds.length > 0 && orderIds.every((id) => current.includes(id));
      if (allSelected) return current.filter((id) => !orderIds.includes(id));
      return Array.from(new Set([...current, ...orderIds]));
    });
  }

  function editProduct(product) {
    setEditingProductId(product.id);
    setProductForm({
      name: product.name,
      sku: product.sku,
      price: product.price,
      quantity_in_stock: product.quantity_in_stock,
    });
    setActivePage('products');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const pageTitle = navItems.find((item) => item.id === activePage)?.label || 'Dashboard';

  return (
    <div className="app-shell">
      <Sidebar
        activePage={activePage}
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        onNavigate={navigate}
      />

      <div className="app-main">
        <Topbar
          pageTitle={pageTitle}
          loading={loading}
          onMenu={() => setMobileNavOpen(true)}
          onRefresh={() => loadAll({ notifySuccess: true })}
        />

        {message && <Notice type={message.type} text={message.text} onClose={dismissMessage} />}

        <main className="content-area">
          {loading && !summary ? (
            <LoadingState />
          ) : (
            <>
              {activePage === 'dashboard' && (
                <DashboardPage
                  customers={customers}
                  inventoryValue={inventoryValue}
                  lowStock={lowStock}
                  orders={orders}
                  orderedUnits={orderedUnits}
                  products={products}
                  revenue={revenue}
                  summary={summary}
                  onOpenDrawer={setDrawer}
                  onNavigate={navigate}
                />
              )}

              {activePage === 'products' && (
                <ProductsPage
                  editingProductId={editingProductId}
                  form={productForm}
                  products={filteredProducts}
                  query={query}
                  onCancelEdit={() => {
                    setEditingProductId(null);
                    setProductForm(emptyProductForm);
                  }}
                  onChangeForm={setProductForm}
                  onEdit={editProduct}
                  onOpenDrawer={setDrawer}
                  onQuery={setQuery}
                  onRemove={(id) => remove(`/products/${id}`, 'Product deleted.')}
                  onSubmit={saveProduct}
                />
              )}

              {activePage === 'customers' && (
                <CustomersPage
                  customers={filteredCustomers}
                  form={customerForm}
                  query={query}
                  onChangeForm={setCustomerForm}
                  onOpenDrawer={(customer) => setDrawer({ type: 'customer', data: customer })}
                  onQuery={setQuery}
                  onRemove={(id) => remove(`/customers/${id}`, 'Customer deleted.')}
                  onSubmit={saveCustomer}
                />
              )}

              {activePage === 'orders' && (
                <OrdersPage
                  customers={customers}
                  filter={orderFilter}
                  form={orderForm}
                  orders={filteredOrders}
                  products={products}
                  query={query}
                  selectedOrderIds={selectedOrderIds}
                  onChangeFilter={setOrderFilter}
                  onChangeForm={setOrderForm}
                  onOpenDrawer={setDrawer}
                  onQuery={setQuery}
                  onRemove={(id) => remove(`/orders/${id}`, 'Order deleted and stock restored.')}
                  onRemoveSelected={removeSelectedOrders}
                  onSubmit={createOrder}
                  onToggleAllOrders={toggleVisibleOrderSelection}
                  onToggleOrder={toggleOrderSelection}
                />
              )}
            </>
          )}
        </main>
      </div>

      {drawer && (
        <DetailDrawer
          drawer={drawer}
          onClose={() => setDrawer(null)}
          onDelete={(type, id) => {
            const paths = {
              product: [`/products/${id}`, 'Product deleted.'],
              customer: [`/customers/${id}`, 'Customer deleted.'],
              order: [`/orders/${id}`, 'Order deleted and stock restored.'],
            };
            remove(paths[type][0], paths[type][1]);
          }}
          onEditProduct={(product) => {
            editProduct(product);
            setDrawer(null);
          }}
        />
      )}
    </div>
  );
}

function Sidebar({ activePage, open, onClose, onNavigate }) {
  return (
    <>
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-mark">
            <Boxes size={22} />
          </div>
          <div>
            <strong>Invora</strong>
          </div>
        </div>

        <nav className="nav-list" aria-label="Primary navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                className={activePage === item.id ? 'nav-item active' : 'nav-item'}
                key={item.id}
                onClick={() => onNavigate(item.id)}
                type="button"
              >
                <Icon size={18} />
                {item.label}
              </button>
            );
          })}
        </nav>
      </aside>
      {open && <button className="scrim" aria-label="Close navigation" onClick={onClose} type="button" />}
    </>
  );
}

function Topbar({ pageTitle, loading, onMenu, onRefresh }) {
  return (
    <header className="topbar">
      <button className="icon-button mobile-menu" onClick={onMenu} type="button" aria-label="Open navigation">
        <Menu size={20} />
      </button>
      <div>
        <h1>{pageTitle}</h1>
      </div>
      <div className="topbar-actions">
      </div>
      <button className="secondary-button" onClick={onRefresh} disabled={loading} type="button">
        <RefreshCw size={17} />
        Refresh
      </button>
    </header>
  );
}

function Notice({ onClose, type, text }) {
  const Icon = type === 'success' ? CheckCircle2 : AlertCircle;
  return (
    <div className={`notice ${type}`} role="alert" aria-live="assertive">
      <Icon className="notice-icon" size={20} />
      <span>{text}</span>
      <button className="notice-close" onClick={onClose} type="button" aria-label="Dismiss alert">
        <X size={16} />
      </button>
    </div>
  );
}

function DashboardPage({ customers, inventoryValue, lowStock, orderedUnits, orders, products, revenue, summary, onOpenDrawer, onNavigate }) {
  const recentOrders = orders.slice(0, 8);
  const topProducts = [...products].sort((a, b) => Number(b.quantity_in_stock) - Number(a.quantity_in_stock)).slice(0, 5);
  const totalUnits = products.reduce((total, product) => total + Number(product.quantity_in_stock), 0);
  const receiptTotal = totalUnits + orderedUnits;
  const receiptPercent = receiptTotal ? clamp((totalUnits / receiptTotal) * 100) : 0;
  const orderBars = orders.slice(0, 8).map((order, index) => ({
    label: `#${order.id}`,
    value: Number(order.total_amount),
    tone: index % 2 ? 'muted' : 'dark',
  }));
  const averageOrder = orders.length ? revenue / orders.length : 0;
  const averageItems = orders.length ? orderedUnits / orders.length : 0;

  return (
    <div className="page-stack">
      <section className="metrics-grid">
        <Metric icon={ProductStackIcon} label="Products" value={summary?.total_products ?? products.length} helper="Active SKUs" />
        <Metric icon={Users} label="Customers" value={summary?.total_customers ?? customers.length} helper="Buyer records" />
        <Metric icon={ClipboardList} label="Orders" value={summary?.total_orders ?? orders.length} helper={money(revenue)} />
        <Metric icon={AlertCircle} label="Low Stock" value={summary?.low_stock_products ?? lowStock.length} helper="Need attention" tone="warning" />
      </section>

      <section className="dashboard-grid">
        <Panel
          className="span-8 chart-panel"
          title="Orders Activity"
          action={<button className="text-button" onClick={() => onNavigate('orders')} type="button">View orders</button>}
        >
          <div className="chart-summary">
            <div>
              <span className="stat-label">Total revenue</span>
              <strong>{money(revenue)}</strong>
            </div>
            <div>
              <span className="stat-label">Average order</span>
              <strong>{money(averageOrder)}</strong>
            </div>
            <div>
              <span className="stat-label">Inventory value</span>
              <strong>{money(inventoryValue)}</strong>
            </div>
          </div>
          <BarChart data={orderBars} emptyText="Create orders to populate the revenue chart." />
        </Panel>

        <Panel className="span-4 analytics-panel" title="Receipt of Goods">
          <DonutChart value={receiptPercent} center={money(inventoryValue)} helper={`${totalUnits} units`} />
          <div className="split-stats">
            <div>
              <span>Available units</span>
              <strong>{totalUnits}</strong>
            </div>
            <div>
              <span>Ordered units</span>
              <strong>{orderedUnits}</strong>
            </div>
          </div>
        </Panel>

        <Panel className="span-4" title="Orders Status">
          <div className="status-stack">
            <StatusMetric label="Created orders" value={orders.length} helper="Orders currently in the system" />
            <StatusMetric label="Units ordered" value={orderedUnits} helper="Total quantity across order items" />
            <StatusMetric label="Avg. items/order" value={averageItems.toFixed(1)} helper="Based on current orders" />
          </div>
        </Panel>

        <Panel className="span-4" title="Overview">
          <div className="overview-grid">
            <OverviewStat label="Products" value={products.length} />
            <OverviewStat label="Customers" value={customers.length} />
            <OverviewStat label="Orders" value={orders.length} />
            <OverviewStat label="Low stock" value={lowStock.length} />
          </div>
        </Panel>

        <Panel className="span-4" title="Quick Actions">
          <div className="quick-actions">
            <button className="primary-button full" onClick={() => onNavigate('products')} type="button">
              <PackagePlus size={17} />
              Add product
            </button>
            <button className="secondary-button full" onClick={() => onNavigate('orders')} type="button">
              <ShoppingCart size={17} />
              Create order
            </button>
          </div>
        </Panel>

        <Panel className="span-8 table-panel" title="Recent Orders">
          <OrdersTable orders={recentOrders} compact onOpenDrawer={onOpenDrawer} />
        </Panel>

        <Panel className="span-4" title="Top Inventory">
          <div className="seller-list">
            {topProducts.length ? topProducts.map((product) => (
              <button className="seller-row" key={product.id} onClick={() => onOpenDrawer({ type: 'product', data: product })} type="button">
                <span className="avatar">{initials(product.name)}</span>
                <span>
                  <strong>{product.name}</strong>
                  <small>{product.sku}</small>
                </span>
                <b>{product.quantity_in_stock}</b>
              </button>
            )) : <EmptyState title="No products found" text="Add products to fill this list." />}
          </div>
        </Panel>
      </section>
    </div>
  );
}

function BarChart({ data, emptyText }) {
  const max = Math.max(...data.map((item) => item.value), 0);
  if (!data.length || !max) return <EmptyState title="No chart data" text={emptyText} />;

  return (
    <div className="bar-chart" aria-label="Order revenue chart">
      {data.map((item) => (
        <div className="bar-column" key={item.label}>
          <span style={{ height: `${clamp((item.value / max) * 100, 8, 100)}%` }} className={item.tone} />
          <small>{item.label}</small>
        </div>
      ))}
    </div>
  );
}

function DonutChart({ center, helper, value }) {
  const dash = `${clamp(value)} ${100 - clamp(value)}`;
  return (
    <div className="donut-wrap">
      <svg viewBox="0 0 42 42" className="donut-chart" role="img" aria-label={`${Math.round(value)} percent available`}>
        <circle className="donut-track" cx="21" cy="21" r="15.915" />
        <circle className="donut-value" cx="21" cy="21" r="15.915" strokeDasharray={dash} />
      </svg>
      <div className="donut-center">
        <strong>{center}</strong>
        <span>{helper}</span>
      </div>
    </div>
  );
}

function ProgressRow({ label, muted = false, value }) {
  return (
    <div className="progress-row">
      <div>
        <span>{label}</span>
        <strong>{Math.round(value)}%</strong>
      </div>
      <div className="progress-track">
        <span className={muted ? 'muted' : ''} style={{ width: `${clamp(value)}%` }} />
      </div>
    </div>
  );
}

function StatusMetric({ helper, label, value }) {
  return (
    <div className="status-metric">
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <small>{helper}</small>
    </div>
  );
}

function OverviewStat({ label, value }) {
  return (
    <div>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function ProductsPage({ editingProductId, form, products, query, onCancelEdit, onChangeForm, onEdit, onOpenDrawer, onQuery, onRemove, onSubmit }) {
  return (
    <div className="page-grid">
      <Panel className="form-panel" title={editingProductId ? 'Edit Product' : 'Add Product'}>
        <ProductForm
          editing={Boolean(editingProductId)}
          form={form}
          onCancel={onCancelEdit}
          onChange={onChangeForm}
          onSubmit={onSubmit}
        />
      </Panel>
      <Panel
        className="table-panel"
        title="Products"
        action={<SearchBox value={query} onChange={onQuery} placeholder="Search products" />}
      >
        <ProductsTable products={products} onEdit={onEdit} onOpenDrawer={onOpenDrawer} onRemove={onRemove} />
      </Panel>
    </div>
  );
}

function CustomersPage({ customers, form, query, onChangeForm, onOpenDrawer, onQuery, onRemove, onSubmit }) {
  return (
    <div className="page-grid">
      <Panel className="form-panel" title="Add Customer">
        <CustomerForm form={form} onChange={onChangeForm} onSubmit={onSubmit} />
      </Panel>
      <Panel
        className="table-panel"
        title="Customers"
        action={<SearchBox value={query} onChange={onQuery} placeholder="Search customers" />}
      >
        <CustomersTable customers={customers} onOpenDrawer={onOpenDrawer} onRemove={onRemove} />
      </Panel>
    </div>
  );
}

function OrdersPage({
  customers,
  filter,
  form,
  orders,
  products,
  query,
  selectedOrderIds,
  onChangeFilter,
  onChangeForm,
  onOpenDrawer,
  onQuery,
  onRemove,
  onRemoveSelected,
  onSubmit,
  onToggleAllOrders,
  onToggleOrder,
}) {
  const selectedVisibleIds = selectedOrderIds.filter((id) => orders.some((order) => order.id === id));

  return (
    <div className="page-grid">
      <Panel className="form-panel" title="Create Order">
        <OrderForm customers={customers} form={form} products={products} onChange={onChangeForm} onSubmit={onSubmit} />
      </Panel>
      <Panel
        className="table-panel"
        title="Orders"
        action={
          <div className="table-tools">
            {selectedVisibleIds.length > 0 && (
              <button
                className="icon-button danger"
                onClick={() => onRemoveSelected(selectedVisibleIds)}
                title={`Delete selected (${selectedVisibleIds.length})`}
                type="button"
                aria-label={`Delete selected ${selectedVisibleIds.length} order${selectedVisibleIds.length === 1 ? '' : 's'}`}
              >
                <Trash2 size={16} />
              </button>
            )}
            <SegmentedControl value={filter} onChange={onChangeFilter} />
            <SearchBox value={query} onChange={onQuery} placeholder="Search orders" />
          </div>
        }
      >
        <OrdersTable
          orders={orders}
          selectable
          selectedOrderIds={selectedOrderIds}
          onOpenDrawer={onOpenDrawer}
          onRemove={onRemove}
          onToggleAll={onToggleAllOrders}
          onToggleOrder={onToggleOrder}
        />
      </Panel>
    </div>
  );
}

function ProductForm({ editing, form, onCancel, onChange, onSubmit }) {
  return (
    <form className="form-stack" onSubmit={onSubmit}>
      <Field label="Product name">
        <input required value={form.name} onChange={(event) => onChange({ ...form, name: event.target.value })} />
      </Field>
      <Field label="SKU">
        <input required value={form.sku} onChange={(event) => onChange({ ...form, sku: event.target.value })} />
      </Field>
      <div className="field-row">
        <Field label="Price">
          <input required min="0.01" step="0.01" type="number" value={form.price} onChange={(event) => onChange({ ...form, price: event.target.value })} />
        </Field>
        <Field label="Stock">
          <input required min="0" step="1" type="number" value={form.quantity_in_stock} onChange={(event) => onChange({ ...form, quantity_in_stock: event.target.value })} />
        </Field>
      </div>
      <div className="button-row">
        {editing && <button className="secondary-button" onClick={onCancel} type="button">Cancel</button>}
        <button className="primary-button" type="submit">
          <Save size={17} />
          {editing ? 'Update product' : 'Add product'}
        </button>
      </div>
    </form>
  );
}

function CustomerForm({ form, onChange, onSubmit }) {
  return (
    <form className="form-stack" onSubmit={onSubmit}>
      <Field label="Full name">
        <input required value={form.full_name} onChange={(event) => onChange({ ...form, full_name: event.target.value })} />
      </Field>
      <Field label="Email">
        <input required type="email" value={form.email} onChange={(event) => onChange({ ...form, email: event.target.value })} />
      </Field>
      <Field label="Phone">
        <input required value={form.phone} onChange={(event) => onChange({ ...form, phone: event.target.value })} />
      </Field>
      <button className="primary-button" type="submit">
        <Plus size={17} />
        Add customer
      </button>
    </form>
  );
}

function OrderForm({ customers, form, products, onChange, onSubmit }) {
  return (
    <form className="form-stack" onSubmit={onSubmit}>
      <Field label="Customer">
        <select required value={form.customer_id} onChange={(event) => onChange({ ...form, customer_id: event.target.value })}>
          <option value="">Select customer</option>
          {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.full_name}</option>)}
        </select>
      </Field>
      <Field label="Product">
        <select required value={form.product_id} onChange={(event) => onChange({ ...form, product_id: event.target.value })}>
          <option value="">Select product</option>
          {products.map((product) => (
            <option key={product.id} value={product.id}>{product.name} ({product.quantity_in_stock} available)</option>
          ))}
        </select>
      </Field>
      <Field label="Quantity">
        <input required min="1" step="1" type="number" value={form.quantity} onChange={(event) => onChange({ ...form, quantity: event.target.value })} />
      </Field>
      <button className="primary-button" type="submit">
        <ShoppingCart size={17} />
        Create order
      </button>
    </form>
  );
}

function ProductsTable({ compact = false, products, onEdit, onOpenDrawer, onRemove }) {
  if (!products.length) return <EmptyState title="No products found" text="Create a product or adjust your search." />;

  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Product</th>
            {!compact && <th>SKU</th>}
            <th>Price</th>
            <th>Stock</th>
            {!compact && <th>Status</th>}
            <th aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {products.map((product) => {
            const state = stockState(product);
            return (
              <tr key={product.id}>
                <td>
                  <button className="row-title" onClick={() => onOpenDrawer?.({ type: 'product', data: product })} type="button">
                    {product.name}
                    <span>{product.sku}</span>
                  </button>
                </td>
                {!compact && <td>{product.sku}</td>}
                <td>{money(product.price)}</td>
                <td>{product.quantity_in_stock}</td>
                {!compact && <td><Badge tone={state.tone}>{state.label}</Badge></td>}
                <td className="actions">
                  <button className="icon-button" title="View product" onClick={() => onOpenDrawer?.({ type: 'product', data: product })} type="button"><Eye size={16} /></button>
                  {onEdit && <button className="icon-button" title="Edit product" onClick={() => onEdit(product)} type="button"><Pencil size={16} /></button>}
                  {onRemove && <button className="icon-button danger" title="Delete product" onClick={() => onRemove(product.id)} type="button"><Trash2 size={16} /></button>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function CustomersTable({ customers, onOpenDrawer, onRemove }) {
  if (!customers.length) return <EmptyState title="No customers found" text="Create a customer or adjust your search." />;

  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Phone</th>
            <th aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {customers.map((customer) => (
            <tr key={customer.id}>
              <td>
                <button className="row-title" onClick={() => onOpenDrawer(customer)} type="button">
                  {customer.full_name}
                  <span>Customer #{customer.id}</span>
                </button>
              </td>
              <td>{customer.email}</td>
              <td>{customer.phone}</td>
              <td className="actions">
                <button className="icon-button" title="View customer" onClick={() => onOpenDrawer(customer)} type="button"><Eye size={16} /></button>
                <button className="icon-button danger" title="Delete customer" onClick={() => onRemove(customer.id)} type="button"><Trash2 size={16} /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OrdersTable({
  compact = false,
  orders,
  selectable = false,
  selectedOrderIds = [],
  onOpenDrawer,
  onRemove,
  onToggleAll,
  onToggleOrder,
}) {
  if (!orders.length) return <EmptyState title="No orders found" text="Create an order or adjust your filters." />;

  const visibleOrderIds = orders.map((order) => order.id);
  const allSelected = selectable && visibleOrderIds.every((id) => selectedOrderIds.includes(id));

  return (
    <div className="table-scroll">
      <table className="orders-table">
        <thead>
          <tr>
            {selectable && (
              <th aria-label="Selection">
                <button
                  className={allSelected ? 'check-cell checked' : 'check-cell'}
                  onClick={() => onToggleAll(visibleOrderIds)}
                  type="button"
                  aria-label={allSelected ? 'Clear selected orders' : 'Select all visible orders'}
                />
              </th>
            )}
            <th>Order</th>
            <th>Customer</th>
            {!compact && <th>Type</th>}
            <th>Status</th>
            <th>Total</th>
            {!compact && <th>Items</th>}
            {!compact && <th>Date</th>}
            <th aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {orders.map((order, index) => {
            const createdDate = order.created_at ? new Date(order.created_at) : null;
            const dateLabel = createdDate && !Number.isNaN(createdDate.valueOf())
              ? createdDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
              : 'Today';
            const isSelected = selectedOrderIds.includes(order.id);
            const itemQuantity = orderItemQuantity(order);
            return (
              <tr className={isSelected ? 'selected-row' : ''} key={order.id}>
                {selectable && (
                  <td>
                    <button
                      className={isSelected ? 'check-cell checked' : 'check-cell'}
                      onClick={() => onToggleOrder(order.id)}
                      type="button"
                      aria-label={isSelected ? `Clear order ${order.id}` : `Select order ${order.id}`}
                    />
                  </td>
                )}
                <td>
                  <button className="row-title" onClick={() => onOpenDrawer({ type: 'order', data: order })} type="button">
                    #{order.id}
                    <span>{itemQuantity} item{itemQuantity === 1 ? '' : 's'}</span>
                  </button>
                </td>
                <td>
                  <button className="customer-cell" onClick={() => onOpenDrawer({ type: 'order', data: order })} type="button">
                    <span className="avatar subtle">{initials(order.customer_name)}</span>
                    <span>{order.customer_name}</span>
                  </button>
                </td>
                {!compact && <td>Shipping</td>}
                <td><Badge tone="success">Paid</Badge></td>
                <td>{money(order.total_amount)}</td>
                {!compact && <td>{itemQuantity}</td>}
                {!compact && <td>{dateLabel}</td>}
                <td className="actions">
                  <button className="icon-button" title="View order" onClick={() => onOpenDrawer({ type: 'order', data: order })} type="button"><MoreHorizontal size={16} /></button>
                  {onRemove && <button className="icon-button danger" title="Delete order" onClick={() => onRemove(order.id)} type="button"><Trash2 size={16} /></button>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function DetailDrawer({ drawer, onClose, onDelete, onEditProduct }) {
  const { type, data } = drawer;
  const title = type === 'order' ? `Order #${data.id}` : type === 'product' ? data.name : data.full_name;
  const subtitle = type === 'order' ? data.customer_name : type === 'product' ? data.sku : data.email;

  return (
    <>
      <button className="drawer-scrim" aria-label="Close details" onClick={onClose} type="button" />
      <aside className="drawer">
        <div className={`drawer-head ${type === 'order' ? 'order-drawer-head' : ''}`}>
          <div>
            <p className="eyebrow">{type} details</p>
            <h2>{title}</h2>
            <span>{subtitle}</span>
          </div>
          <button className="icon-button" onClick={onClose} type="button" aria-label="Close details">
            <X size={18} />
          </button>
        </div>

        {type === 'product' && <ProductDetails product={data} />}
        {type === 'customer' && <CustomerDetails customer={data} />}
        {type === 'order' && <OrderDetails order={data} />}

        <div className="drawer-actions">
          {type === 'product' && (
            <button className="secondary-button" onClick={() => onEditProduct(data)} type="button">
              <Pencil size={16} />
              Edit
            </button>
          )}
          <button className="danger-button" onClick={() => onDelete(type, data.id)} type="button">
            <Trash2 size={16} />
            Delete
          </button>
        </div>
      </aside>
    </>
  );
}

function ProductDetails({ product }) {
  const state = stockState(product);
  return (
    <div className="detail-stack">
      <DetailRow label="SKU" value={product.sku} />
      <DetailRow label="Price" value={money(product.price)} />
      <DetailRow label="Stock on hand" value={product.quantity_in_stock} />
      <DetailRow label="Status" value={<Badge tone={state.tone}>{state.label}</Badge>} />
    </div>
  );
}

function CustomerDetails({ customer }) {
  return (
    <div className="detail-stack">
      <DetailRow label="Customer ID" value={`#${customer.id}`} />
      <DetailRow label="Email" value={customer.email} />
      <DetailRow label="Phone" value={customer.phone} />
      <p className="muted-note">Customer editing is not shown because the current backend exposes create, list, get, and delete routes only.</p>
    </div>
  );
}

function OrderDetails({ order }) {
  return (
    <div className="detail-stack">
      <DetailRow label="Customer" value={order.customer_name} />
      <DetailRow label="Email" value={order.customer_email} />
      <div className="line-items">
        {order.items.map((item) => (
          <div className="line-item" key={item.id}>
            <div>
              <strong>{item.product_name}</strong>
              <span>{item.sku}</span>
            </div>
            <span>{item.quantity} x {money(item.unit_price)}</span>
            <strong>{money(item.line_total)}</strong>
          </div>
        ))}
      </div>
      <div className="drawer-total">
        <span>Total</span>
        <strong>{money(order.total_amount)}</strong>
      </div>
    </div>
  );
}

function Metric({ icon: Icon, label, value, helper, tone }) {
  return (
    <div className={`metric-card ${tone || ''}`}>
      <div className="metric-icon"><Icon size={20} /></div>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{helper}</small>
    </div>
  );
}

function Panel({ action, children, className = '', title }) {
  return (
    <section className={`panel ${className}`}>
      <div className="panel-head">
        <h2>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Field({ children, label }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function SearchBox({ onChange, placeholder, value }) {
  return (
    <label className="search-box">
      <Search size={16} />
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </label>
  );
}

function SegmentedControl({ value, onChange }) {
  const options = [
    { id: 'all', label: 'All' },
    { id: 'large', label: '$500+' },
    { id: 'single', label: 'Single item' },
  ];
  return (
    <div className="segmented" role="tablist" aria-label="Order filters">
      {options.map((option) => (
        <button
          className={value === option.id ? 'active' : ''}
          key={option.id}
          onClick={() => onChange(option.id)}
          type="button"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function Badge({ children, tone = 'neutral' }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

function DetailRow({ label, value }) {
  return (
    <div className="detail-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function EmptyState({ title, text }) {
  return (
    <div className="empty-state">
      <ArrowDownRight size={20} />
      <strong>{title}</strong>
      <span>{text}</span>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="loading-state">
      <BarChart3 size={24} />
      <strong>Loading dashboard</strong>
      <span>Fetching inventory, customers, orders, and summary metrics.</span>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
