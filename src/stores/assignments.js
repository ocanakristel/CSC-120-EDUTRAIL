import { defineStore } from 'pinia'
import { ref } from 'vue'
import axios from 'axios'
import { supabase } from '@/utils/supabase'
import { useAuthUserStore } from './authUser'
import { getSlugText } from '@/utils/helpers'
import { logSecurityEvent } from '@/utils/securityLogs' // 📝 log helper

export const useAssignmentsStore = defineStore('assignments', () => {
  // States
  const assignments = ref([])
  const assignmentsFromApi = ref([])
  const authStore = useAuthUserStore()

  // Helper: ALWAYS get the real current user id
  async function getCurrentUserId() {
    let userId = authStore.userData?.id
    if (userId) return userId

    const { data: userData, error } = await supabase.auth.getUser()
    if (error || !userData?.user) {
      console.error('No logged-in user (assignments):', error?.message)
      throw new Error('No logged-in user. Please log in again.')
    }

    userId = userData.user.id
    authStore.userData = authStore.userData || {}
    authStore.userData.id = userId
    return userId
  }

  // Reset States
  function $reset() {
    assignments.value = []
    assignmentsFromApi.value = []
  }

  // Retrieve from API and insert into Supabase
  async function getAssignmentsFromApi() {
    try {
      const userId = await getCurrentUserId()

      const response = await axios.get('https://api.restful-api.dev/objects')
      assignmentsFromApi.value = response.data

      const transformedData = response.data.map(assignment => ({
        description: assignment?.description ?? '',
        additional_notes: assignment?.additional_notes ?? '',
        user_id: userId,
        subjects_id: assignment?.userData?.id ?? null,
      }))

      const { error } = await supabase.from('assignments').insert(transformedData).select()

      if (error) throw error

      await logSecurityEvent(
        'assignments_imported_from_api',
        `Imported ${transformedData.length} assignments from API`
      )
    } catch (error) {
      console.error('Error fetching or inserting assignments:', error.message)
    }
  }

  // Retrieve assignments from Supabase (ONLY for this user)
  async function getAssignments() {
    try {
      const userId = await getCurrentUserId()

      const { data, error } = await supabase
        .from('assignments')
        .select('*')
        .eq('user_id', userId)

      if (error) throw error
      assignments.value = data || []
    } catch (error) {
      console.error('Error fetching assignments:', error.message)
      assignments.value = []
    }
  }

  // Add assignments with image upload
  async function addAssignments(formData) {
    const { image, ...data } = formData

    const userId = await getCurrentUserId()
    data.user_id = userId

    if (image) {
      try {
        const imageUrl = await updateAssignmentImage(image, formData.description)
        data.image_url = imageUrl
      } catch (error) {
        console.error('Error uploading image:', error.message)
        throw new Error('Failed to upload image. Please try again.')
      }
    }

    try {
      const { data: insertedData, error } = await supabase
        .from('assignments')
        .insert([data])
        .select()

      if (error) throw error

      if (insertedData && insertedData.length > 0) {
        assignments.value.push(insertedData[0])
        await logSecurityEvent(
          'assignment_created',
          `Assignment: ${insertedData[0].description || 'No description'}`
        )
      }

      return insertedData
    } catch (error) {
      console.error('Error adding assignment:', error.message)
      throw error
    }
  }

  // Update Assignment Image (extra validation)
  async function updateAssignmentImage(file, filename) {
    const allowedTypes = ['image/png', 'image/jpeg']
    if (!file || !allowedTypes.includes(file.type)) {
      throw new Error('Invalid image type. Only PNG and JPEG allowed.')
    }
    if (file.size > 2_000_000) {
      throw new Error('Image too large. Max size is 2 MB.')
    }

    const filePath = `assignments/${getSlugText(filename || 'assignment')}.png`
    try {
      const { data, error } = await supabase.storage
        .from('edutrail')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        })

      if (error) throw error

      const { data: imageData, error: urlError } = supabase.storage
        .from('edutrail')
        .getPublicUrl(data.path)

      if (urlError) throw urlError

      return imageData.publicUrl
    } catch (error) {
      console.error('Error uploading image:', error.message)
      throw error
    }
  }

  // Update assignment
  async function updateAssignments(formData) {
    const { image } = formData

    if (image) {
      formData.image_url = await updateAssignmentImage(image, formData.description)
      delete formData.image
    }

    const userId = await getCurrentUserId()

    const { data, error } = await supabase
      .from('assignments')
      .update(formData)
      .eq('id', formData.id)
      .eq('user_id', userId)
      .select()

    if (error) {
      console.error('Error updating assignment:', error.message)
      return { error }
    }

    if (data && data.length > 0) {
      await logSecurityEvent(
        'assignment_updated',
        `Assignment ID: ${formData.id}, Description: ${formData.description || 'No description'}`
      )
    }

    return { data }
  }

  // Delete an assignment by ID
  async function deleteAssignments(id) {
    try {
      const userId = await getCurrentUserId()

      const { error } = await supabase
        .from('assignments')
        .delete()
        .eq('id', id)
        .eq('user_id', userId)

      if (error) {
        console.error('Error deleting assignment:', error.message)
        return { error }
      }

      assignments.value = assignments.value.filter(assignment => assignment.id !== id)
      await logSecurityEvent('assignment_deleted', `Assignment ID: ${id}`)

      return { success: true }
    } catch (error) {
      console.error('Error deleting assignment:', error.message)
      return { error }
    }
  }

  // Finish an assignment
  async function finishAssignment(id) {
    try {
      const userId = await getCurrentUserId()

      const { data, error } = await supabase
        .from('assignments')
        .update({ status: 'finished' })
        .eq('id', id)
        .eq('user_id', userId)
        .select()

      if (error) throw error

      assignments.value = assignments.value.filter(assignment => assignment.id !== id)
      await logSecurityEvent('assignment_finished', `Assignment ID: ${id}`)

      return { success: true, data }
    } catch (error) {
      console.error('Error finishing assignment:', error.message)
      return { error }
    }
  }

  return {
    finishAssignment,
    deleteAssignments,
    updateAssignments,
    addAssignments,
    assignments,
    assignmentsFromApi,
    getAssignmentsFromApi,
    getAssignments,
    $reset,
  }
})
