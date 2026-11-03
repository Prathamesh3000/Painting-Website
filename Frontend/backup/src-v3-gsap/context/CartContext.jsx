import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const CartContext = createContext(null)
// eslint-disable-next-line react-refresh/only-export-components
export const useCart = () => useContext(CartContext)

const load = (key) => {
  try { return JSON.parse(localStorage.getItem(key)) || [] } catch { return [] }
}
const save = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* storage unavailable */ }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => load('kj-cart'))
  const [saved, setSaved] = useState(() => load('kj-saved'))
  const [drawerOpen, setDrawerOpen] = useState(false)
  useEffect(() => save('kj-cart', items), [items])
  useEffect(() => save('kj-saved', saved), [saved])

  const value = useMemo(() => ({
    items,
    // Originals are one-of-a-kind: adding twice keeps quantity at 1.
    add(item) {
      setItems((prev) => {
        const key = item.slug + '|' + (item.variant || '')
        const found = prev.find((i) => i.key === key)
        if (found) {
          return item.type === 'original' ? prev : prev.map((i) => i.key === key ? { ...i, qty: i.qty + 1 } : i)
        }
        return [...prev, { ...item, key, qty: 1 }]
      })
      setDrawerOpen(true)
    },
    remove: (key) => setItems((p) => p.filter((i) => i.key !== key)),
    setQty: (key, qty) => setItems((p) => p.map((i) => i.key === key ? { ...i, qty: Math.max(1, qty) } : i)),
    clear: () => setItems([]),
    count: items.reduce((n, i) => n + i.qty, 0),
    subtotal: items.reduce((n, i) => n + i.price * i.qty, 0),
    saved,
    toggleSaved: (slug) => setSaved((p) => p.includes(slug) ? p.filter((s) => s !== slug) : [...p, slug]),
    drawerOpen,
    openDrawer: () => setDrawerOpen(true),
    closeDrawer: () => setDrawerOpen(false),
  }), [items, saved, drawerOpen])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}
