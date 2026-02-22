// src/utils/securityLogs.js
import { api } from '@/utils/api'
import { useAuthUserStore } from '@/stores/authUser'

export const logSecurityEvent = async (action, details = '') => {
  try {
    const authStore = useAuthUserStore()
    const userId = authStore.userData?.id || null

    await api.from('security_logs').insert([
      {
        user_id: userId,
        action,
        details,
      },
    ])
  } catch (error) {
    console.error('Failed to log security event:', error.message)
  }
}
