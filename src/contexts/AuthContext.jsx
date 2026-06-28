import { createContext, useContext, useEffect, useState } from 'react'
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../firebase/config'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  async function login(email, password) {
    const result = await signInWithEmailAndPassword(auth, email, password)
    return result
  }

  async function logout() {
    await signOut(auth)
    setUserProfile(null)
  }

  useEffect(() => {
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
