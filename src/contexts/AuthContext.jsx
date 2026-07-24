import { createContext, useContext, useEffect, useState } from 'react'
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../firebase/config'

const DEV_BYPASS = false

const DEV_PROFILE = {
  uid: 'dev-user-001',
  name: 'Dev Admin',
  email: 'dev@local.test',
  role: 'admin',
  department: 'IT',
  basicSalary: 100000,
  status: 'active',
}

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(
    DEV_BYPASS ? DEV_PROFILE : null
  )

  const [userProfile, setUserProfile] = useState(
    DEV_BYPASS ? DEV_PROFILE : null
  )

  const [loading, setLoading] = useState(!DEV_BYPASS)

  async function login(email, password) {
    try {
      console.log("Login started...");

      const result = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      console.log("Login Success");
      console.log(result.user);

      return result;
    } catch (error) {
      console.error("Login Error:", error);
      throw error;
    }
  }

  async function logout() {
    await signOut(auth)
    setUserProfile(null)
  }

  useEffect(() => {
    if (DEV_BYPASS) {
      setLoading(false)
      return
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("AUTH STATE:", user)

      if (!user) {
        setCurrentUser(null)
        setUserProfile(null)
        setLoading(false)
        return
      }

      setCurrentUser(user)

      try {
        const docRef = doc(db, "users", user.uid)
        const docSnap = await getDoc(docRef)

        console.log("Profile Exists:", docSnap.exists())

        if (docSnap.exists()) {
          console.log(docSnap.data())

          setUserProfile({
            uid: user.uid,
            ...docSnap.data(),
          })
        } else {
          console.log("No Firestore profile found")

          setUserProfile({
            uid: user.uid,
            email: user.email,
            role: "employee",
          })
        }
      } catch (err) {
        console.error("Firestore Error:", err)
      }

      setLoading(false)
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

export function useAuth() {
  return useContext(AuthContext)
}