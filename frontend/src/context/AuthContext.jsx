import { createContext, useContext, useState } from 'react'
import { login as doLogin, logout as doLogout, getSession } from '../services/auth.js'
const Ctx = createContext(null)
export const useAuth = () => useContext(Ctx)
export function AuthProvider({ children }) {
  const [user, setUser] = useState(getSession())
  const login = async (email, password, role) => { const u = await doLogin(email, password, role); setUser(u); return u }
  const logout = () => { doLogout(); setUser(null) }
  return <Ctx.Provider value={{ user, login, logout }}>{children}</Ctx.Provider>
}
