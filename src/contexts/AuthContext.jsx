import { createContext, useContext, useEffect, useState } from 'react'
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../firebase/config'

// ─── DEV BYPASS ──────────────────────────────────────────────────────────────
// Set to true  → skip Firebase Auth, use mock profile below (no login required)
// Set to false → normal Firebase Auth flow
const DEV_BYPASS = true

const DEV_PROFILE = {
  uid: 'dev-user-001',
  name: 'Dev Admin',
  email: 'dev@local.test',
  role: 'admin',          // change to 'employee' | 'supervisor' | 'admin'
  department: 'IT',
  basicSalary: 100000,
  status: 'active',
}
// ─────────────────────────────────────────────────────────────────────────────

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(DEV_BYPASS ? DEV_PROFILE : null)
  const [userProfile, setUserProfile] = useState(DEV_BYPASS ? DEV_PROFILE : null)
  const [loading, setLoading] = useState(!DEV_BYPASS)

  async function login(email, password) {
    if (DEV_BYPASS) return
    const result = await signInWithEmailAndPassword(auth, email, password)
    return result
  }

  async function logout() {
    if (DEV_BYPASS) return
    await signOut(auth)
    setUserProfile(null)
  }

  useEffect(() => {
    if (DEV_BYPASS) return

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user)
      if (user) {
        const docRef = doc(db, 'users', user.uid)
        const docSnap = await getDoc(docRef)
        if (docSnap.exists()) {
          setUserProfile({ uid: user.uid, ...docSnap.data() })
        }
      } else {
        setUserProfile(null)
      }
      setLoading(false)
    })
    return unsubscribe
  }, [])

  const value = { currentUser, userProfile, login, logout, loading }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
