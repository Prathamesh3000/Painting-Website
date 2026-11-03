import { createContext, useContext } from 'react'

export const AuthCtx = createContext({ user: null, setUser: () => {}, bootError: '' })
export const ToastCtx = createContext({ success: () => {}, error: () => {} })
export const ConfirmCtx = createContext(() => Promise.resolve(false))

export const useAuth = () => useContext(AuthCtx)
export const useToast = () => useContext(ToastCtx)
export const useConfirm = () => useContext(ConfirmCtx)
