import { supabase } from '@/utils/supabase'
import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

export const useAuthUserStore = defineStore('authUser', () => {
  // States
  const userData = ref({
    id: null,
    email: '',
    firstname: '',
    lastname: '',
    user_role: '',
    branch: '',
    image_url: '',
  })
  const authPages = ref([])
  const authBranchIds = ref([])

  // Getters
  const userRole = computed(() => {
    return userData.value.is_admin ? 'Super Administrator' : userData.value.user_role || 'User'
  })

  // Reset State Action
  function $reset() {
    userData.value = {
      id: null,
      email: '',
      firstname: '',
      lastname: '',
      user_role: '',
      branch: '',
      image_url: '',
    }
    authPages.value = []
    authBranchIds.value = []
  }

  // Actions
  async function isAuthenticated() {
    const { data, error } = await supabase.auth.getSession()

    if (error) {
      console.error('Error getting session:', error.message)
      return false
    }

    if (data.session) {
      const { id, email, user_metadata } = data.session.user
      userData.value = {
        id,
        email,
        firstname: user_metadata?.firstname || '',
        lastname: user_metadata?.lastname || '',
        user_role: user_metadata?.user_role || 'User',
        branch: user_metadata?.branch || '',
        image_url: user_metadata?.image_url || '',
      }
    }

    return !!data.session
  }

  async function getUserInformation() {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      const { id, email, user_metadata } = user
      userData.value = {
        id,
        email,
        firstname: user_metadata?.firstname || '',
        lastname: user_metadata?.lastname || '',
        user_role: user_metadata?.user_role || 'User',
        branch: user_metadata?.branch || '',
        image_url: user_metadata?.image_url || '',
      }
    }
  }

  async function getAuthPages(name) {
    const { data } = await supabase
      .from('user_roles')
      .select('*, pages: user_role_pages (page)')
      .eq('user_role', name)

    authPages.value = data?.[0]?.pages?.map((p) => p.page) || []
  }

  async function getAuthBranchIds() {
    if (!userData.value.branch) {
      authBranchIds.value = []
      return
    }

    const { data } = await supabase
      .from('branches')
      .select('id')
      .in('name', userData.value.branch.split(','))

    authBranchIds.value = data?.map((b) => b.id) || []
  }

  async function updateUserInformation(updatedData) {
    const { data, error } = await supabase.auth.updateUser({
      data: { ...updatedData },
    })

    if (error) {
      return { error }
    }

    if (data.user) {
      const { id, email, user_metadata } = data.user
      userData.value = {
        id,
        email,
        firstname: user_metadata?.firstname || '',
        lastname: user_metadata?.lastname || '',
        user_role: user_metadata?.user_role || 'User',
        branch: user_metadata?.branch || '',
        image_url: user_metadata?.image_url || '',
      }

      return { data: userData.value }
    }
  }

  async function updateUserImage(file) {
    const { data, error } = await supabase.storage
      .from('edutrail')
      .upload('avatars/' + userData.value.id + '-avatar.png', file, {
        cacheControl: '3600',
        upsert: true,
      })

    if (error) {
      return { error }
    }

    if (data) {
      const { data: imageData, error: imageError } = supabase.storage
        .from('edutrail')
        .getPublicUrl(data.path)

      if (imageError) {
        return { error: imageError }
      }

      return await updateUserInformation({
        ...userData.value,
        image_url: imageData.publicUrl,
      })
    }
  }

  return {
    userData,
    userRole,
    authPages,
    authBranchIds,
    $reset,
    isAuthenticated,
    getUserInformation,
    getAuthPages,
    getAuthBranchIds,
    updateUserInformation,
    updateUserImage,
  }
})
