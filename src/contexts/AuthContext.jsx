import { createContext, useContext, useEffect, useState } from 'react'
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth'
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { auth, db } from '../firebase/config'

const ADMIN_EMAIL = 'safni1012@gmail.com'
const DEV_BYPASS = false

const DEV_PROFILE = {
  uid: 'dev-user-001',
  fullName: 'Dev Admin',
  email: 'dev@local.test',
  role: 'ADMIN',
  department: 'IT',
  salary: 0,
  status: 'Active',
}

const AuthContext = createContext(null)
const profileRequests = new Map()

function getDefaultFullName(user) {
  return (
    user.displayName?.trim() ||
    user.email?.split('@')[0] ||
    'User'
  )
}

function normalizeUserProfile(profile, user) {
  const email = profile.email || user.email || ''

  return {
    ...profile,
    uid: profile.uid || user.uid,
    fullName: profile.fullName || profile.name || getDefaultFullName(user),
    email,
    role: email.toLowerCase() === ADMIN_EMAIL
      ? 'ADMIN'
      : String(profile.role || 'EMPLOYEE').toUpperCase(),
    department: profile.department || 'IT',
    salary: Number(profile.salary ?? profile.basicSalary ?? 0),
    status: profile.status || 'Active',
  }
}

async function loadOrCreateUserProfile(user) {
  const existingRequest = profileRequests.get(user.uid)
  if (existingRequest) return existingRequest

  const request = (async () => {
    const userReference = doc(db, 'users', user.uid)
    const userSnapshot = await getDoc(userReference)

    if (userSnapshot.exists()) {
      return normalizeUserProfile(userSnapshot.data(), user)
    }

    const email = user.email || ''
    const profile = {
      uid: user.uid,
      fullName: getDefaultFullName(user),
      email,
      role: email.toLowerCase() === ADMIN_EMAIL ? 'ADMIN' : 'EMPLOYEE',
      department: 'IT',
      salary: 0,
      status: 'Active',
      createdAt: serverTimestamp(),
    }

    await setDoc(userReference, profile)
    return profile
  })()

  profileRequests.set(user.uid, request)

  try {
    return await request
  } finally {
    profileRequests.delete(user.uid)
  }
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(
    DEV_BYPASS ? DEV_PROFILE : null
  )
  const [userProfile, setUserProfile] = useState(
    DEV_BYPASS ? DEV_PROFILE : null
  )
  const [loading, setLoading] = useState(!DEV_BYPASS)

  async function login(email, password) {
    setLoading(true)

    try {
      const credential = await signInWithEmailAndPassword(auth, email, password)
      const profile = await loadOrCreateUserProfile(credential.user)

      setCurrentUser(credential.user)
      setUserProfile(profile)

      return { credential, profile }
    } catch (error) {
      console.error('Login Error:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  async function logout() {
    await signOut(auth)
    setCurrentUser(null)
    setUserProfile(null)
  }

  useEffect(() => {
    if (DEV_BYPASS) {
      return undefined
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setCurrentUser(null)
        setUserProfile(null)
        setLoading(false)
        return
      }

      setLoading(true)
      setCurrentUser(user)

      try {
        const profile = await loadOrCreateUserProfile(user)
        setUserProfile(profile)
      } catch (error) {
        console.error('Firestore profile error:', error)
        setUserProfile(null)
      } finally {
        setLoading(false)
      }
    })

    return unsubscribe
  }, [])

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        login,
        logout,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// AuthProvider and its consumer hook intentionally share this context module.
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext)
}
