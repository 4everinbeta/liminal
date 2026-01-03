'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { registerUser } from '@/lib/api'
import { Loader2 } from 'lucide-react'

export default function RegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleRegister = async () => {
    setLoading(true)
    setError(null)
    const token = localStorage.getItem('liminal_token')
    if (!token) {
        router.push('/login')
        return
    }

    try {
        await registerUser(token)
        // Login successful, redirect to home
        router.push('/')
    } catch (err: any) {
        setError(err.message || "Registration failed")
    } finally {
        setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Welcome to Liminal</h1>
        <p className="text-gray-600">
          You are signing in with a new account. Please confirm to create your profile.
        </p>
        
        {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                {error}
            </div>
        )}

        <button
          onClick={handleRegister}
          disabled={loading}
          className="w-full py-3 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
        >
          {loading && <Loader2 size={18} className="animate-spin" />}
          Create Account
        </button>
        
        <button
            onClick={() => router.push('/login')}
            className="text-sm text-gray-500 hover:text-gray-700"
        >
            Cancel and return to login
        </button>
      </div>
    </div>
  )
}
