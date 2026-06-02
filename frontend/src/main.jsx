import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  AlertCircle,
  Boxes,
  ClipboardList,
  Eye,
  PackagePlus,
  Plus,
  RefreshCw,
  Save,
  ShoppingCart,
  Trash2,
  Users,
} from 'lucide-react';
import './styles.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

async function request(path, options = {}) {
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
  return Number(value || 0).toLocaleString(undefined, { style: 'currency', currency: 'USD' });
}

function App() {
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [summary, setSummary] = useState(null);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [editingProductId, setEditingProductId] = useState(null);
  const [productForm, setProductForm] = useState({ name: '', sku: '', price: '', quantity_in_stock: '' });
  const [customerForm, setCustomerForm] = useState({ full_name: '', email: '', phone: '' });
  const [orderForm, setOrderForm] = useState({ customer_id: '', product_id: '', quantity: 1 });

  const lowStock = useMemo(
    () => products.filter((product) => Number(product.quantity_in_stock) <= 5),
    [products],
  );

  async function loadAll() {
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
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  function flash(type, text) {
    setMessage({ type, text });
    window.setTimeout(() => setMessage(null), 4200);
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
      setProductForm({ name: '', sku: '', price: '', quantity_in_stock: '' });
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
      setCustomerForm({ full_name: '', email: '', phone: '' });
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
      setOrderForm({ customer_id: '', product_id: '', quantity: 1 });
      setSelectedOrder(order);
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
      await loadAll();
    } catch (error) {
      flash('error', error.message);
    }
  }

  function editProduct(product) {
    setEditingProductId(product.id);
    setProductForm({
      name: product.name,
      sku: product.sku,
      price: product.price,
      quantity_in_stock: product.quantity_in_stock,
    });
  }

  return (
    <main className="app">
      <header className="topbar">
        <div>
          <p className="eyebrow">Operations</p>
          <h1>Inventory & Order Management</h1>
        </div>
        <button className="ghost" onClick={loadAll} disabled={loading} title="Refresh data">
          <RefreshCw size={18} />
          Refresh
        </button>
      </header>

      {message && (
        <div className={`notice ${message.type}`}>
          <AlertCircle size={18} />
          {message.text}
        </div>
      )}

      <section className="metrics">
        <Metric icon={<Boxes />} label="Products" value={summary?.total_products ?? 0} />
        <Metric icon={<Users />} label="Customers" value={summary?.total_customers ?? 0} />
        <Metric icon={<ClipboardList />} label="Orders" value={summary?.total_orders ?? 0} />
        <Metric icon={<AlertCircle />} label="Low Stock" value={summary?.low_stock_products ?? lowStock.length} />
      </section>

      <section className="workspace">
        <div className="panel">
          <SectionTitle icon={<PackagePlus />} title={editingProductId ? 'Update Product' : 'Add Product'} />
          <form className="form-grid" onSubmit={saveProduct}>
            <input required placeholder="Product name" value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} />
            <input required placeholder="SKU/code" value={productForm.sku} onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })} />
            <input required min="0.01" step="0.01" type="number" placeholder="Price" value={productForm.price} onChange={(e) => setProductForm({ ...productForm, price: e.target.value })} />
            <input required min="0" step="1" type="number" placeholder="Quantity" value={productForm.quantity_in_stock} onChange={(e) => setProductForm({ ...productForm, quantity_in_stock: e.target.value })} />
            <button className="primary" type="submit"><Save size={17} />{editingProductId ? 'Update' : 'Add'}</button>
          </form>
        </div>

        <div className="panel">
          <SectionTitle icon={<Users />} title="Add Customer" />
          <form className="form-grid" onSubmit={saveCustomer}>
            <input required placeholder="Full name" value={customerForm.full_name} onChange={(e) => setCustomerForm({ ...customerForm, full_name: e.target.value })} />
            <input required type="email" placeholder="Email address" value={customerForm.email} onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })} />
            <input required placeholder="Phone number" value={customerForm.phone} onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })} />
            <button className="primary" type="submit"><Plus size={17} />Add</button>
          </form>
        </div>

        <div className="panel wide">
          <SectionTitle icon={<ShoppingCart />} title="Create Order" />
          <form className="form-grid order-form" onSubmit={createOrder}>
            <select required value={orderForm.customer_id} onChange={(e) => setOrderForm({ ...orderForm, customer_id: e.target.value })}>
              <option value="">Select customer</option>
              {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.full_name}</option>)}
            </select>
            <select required value={orderForm.product_id} onChange={(e) => setOrderForm({ ...orderForm, product_id: e.target.value })}>
              <option value="">Select product</option>
              {products.map((product) => <option key={product.id} value={product.id}>{product.name} ({product.quantity_in_stock} available)</option>)}
            </select>
            <input required min="1" step="1" type="number" placeholder="Quantity" value={orderForm.quantity} onChange={(e) => setOrderForm({ ...orderForm, quantity: e.target.value })} />
            <button className="primary" type="submit"><ShoppingCart size={17} />Create</button>
          </form>
        </div>
      </section>

      <section className="tables">
        <DataPanel title="Products">
          <table>
            <thead><tr><th>Name</th><th>SKU</th><th>Price</th><th>Stock</th><th></th></tr></thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id}>
                  <td>{product.name}</td><td>{product.sku}</td><td>{money(product.price)}</td>
                  <td><span className={product.quantity_in_stock <= 5 ? 'tag warn' : 'tag'}>{product.quantity_in_stock}</span></td>
                  <td className="actions">
                    <button title="Edit product" onClick={() => editProduct(product)}><Save size={16} /></button>
                    <button title="Delete product" onClick={() => remove(`/products/${product.id}`, 'Product deleted.')}><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataPanel>

        <DataPanel title="Customers">
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th></th></tr></thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.id}>
                  <td>{customer.full_name}</td><td>{customer.email}</td><td>{customer.phone}</td>
                  <td className="actions"><button title="Delete customer" onClick={() => remove(`/customers/${customer.id}`, 'Customer deleted.')}><Trash2 size={16} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataPanel>

        <DataPanel title="Orders">
          <table>
            <thead><tr><th>ID</th><th>Customer</th><th>Total</th><th>Items</th><th></th></tr></thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>#{order.id}</td><td>{order.customer_name}</td><td>{money(order.total_amount)}</td><td>{order.items.length}</td>
                  <td className="actions">
                    <button title="View order" onClick={() => setSelectedOrder(order)}><Eye size={16} /></button>
                    <button title="Delete order" onClick={() => remove(`/orders/${order.id}`, 'Order deleted.')}><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataPanel>
      </section>

      {selectedOrder && (
        <aside className="drawer">
          <div className="drawer-head">
            <div>
              <p className="eyebrow">Order #{selectedOrder.id}</p>
              <h2>{selectedOrder.customer_name}</h2>
            </div>
            <button onClick={() => setSelectedOrder(null)}>Close</button>
          </div>
          {selectedOrder.items.map((item) => (
            <div className="line" key={item.id}>
              <div><strong>{item.product_name}</strong><span>{item.sku}</span></div>
              <div>{item.quantity} x {money(item.unit_price)}</div>
              <strong>{money(item.line_total)}</strong>
            </div>
          ))}
          <div className="total"><span>Total</span><strong>{money(selectedOrder.total_amount)}</strong></div>
        </aside>
      )}
    </main>
  );
}

function Metric({ icon, label, value }) {
  return <div className="metric">{React.cloneElement(icon, { size: 22 })}<span>{label}</span><strong>{value}</strong></div>;
}

function SectionTitle({ icon, title }) {
  return <h2 className="section-title">{React.cloneElement(icon, { size: 20 })}{title}</h2>;
}

function DataPanel({ title, children }) {
  return <div className="data-panel"><h2>{title}</h2><div className="table-scroll">{children}</div></div>;
}

createRoot(document.getElementById('root')).render(<App />);
