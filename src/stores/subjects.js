import axios from 'axios'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase, tableSearch } from '@/utils/supabase'
import { getSlugText } from '@/utils/helpers'
import { useAuthUserStore } from './authUser'
import { logSecurityEvent } from '@/utils/securityLogs'

export const useSubjectsStore = defineStore('subjects', () => {
  const subjectsFromApi = ref([])
  const subjects = ref([])
  const authStore = useAuthUserStore()

  function $reset() {
    subjectsFromApi.value = []
    subjects.value = []
  }

  async function getCurrentUserId() {
    let userId = authStore.userData?.id
    if (userId) return userId

    const { data: userData, error } = await supabase.auth.getUser()
    if (error || !userData?.user) {
      console.error('No logged-in user (subjects):', error?.message)
      throw new Error('No logged-in user. Please log in again.')
    }

    userId = userData.user.id
    authStore.userData = authStore.userData || {}
    authStore.userData.id = userId
    return userId
  }

  // Retrieve from API and insert more to subjects table in Supabase
  async function getSubjectsFromApi() {
    try {
      const userId = await getCurrentUserId()

      const response = await axios.get('https://api.restful-api.dev/objects')
      subjectsFromApi.value = response.data

      const transformedData = subjectsFromApi.value.map(subject => ({
        name: subject.name,
        units: subject.units,
        description: subject.data?.description ?? '',
        user_id: userId,
      }))

      const { error } = await supabase.from('subjects').insert(transformedData).select()

      if (error) throw error

      await getSubjects({ search: '' })

      await logSecurityEvent(
        'subjects_imported_from_api',
        `Imported ${transformedData.length} subjects from API`
      )
    } catch (error) {
      console.error('Error fetching or inserting subjects:', error.message)
    }
  }

  // Retrieve from Supabase (only subjects of this user)
  async function getSubjects(tableFilters) {
    try {
      const userId = await getCurrentUserId()
      const search = tableSearch(tableFilters.search)

      const query = supabase
        .from('subjects')
        .select('*')
        .order('name', { ascending: true })
        .ilike('name', '%' + search + '%')

      query.eq('user_id', userId)

      const { data, error } = await query

      if (error) throw error
      subjects.value = data || []
    } catch (error) {
      console.error('Error fetching subjects:', error.message)
      subjects.value = []
    }
  }

  // Add a new subject
  async function addSubject(formData) {
    const { image, ...data } = formData

    const userId = await getCurrentUserId()
    data.user_id = userId

    if (image) {
      const imageUrl = await updateSubjectImage(image, data.name)
      if (imageUrl) {
        data.image_url = imageUrl
      } else {
        console.error('Image upload failed, no URL returned.')
      }
    }

    const { data: insertedData, error } = await supabase
      .from('subjects')
      .insert([data])
      .select()

    if (error) {
      console.error('Error inserting subject:', error.message)
      return { error }
    }

    if (insertedData && insertedData.length > 0) {
      await logSecurityEvent(
        'subject_created',
        `Subject: ${insertedData[0].name || 'No name'}`
      )
    }

    return { data: insertedData }
  }

  // Update Subjects
  async function updateSubject(formData) {
    const userId = await getCurrentUserId()

    if (formData.image) {
      const imageUrl = await updateSubjectImage(formData.image, formData.name)
      if (imageUrl) {
        formData.image_url = imageUrl
      } else {
        console.error('Image upload failed, no URL returned.')
      }
      delete formData.image
    }

    const { data: updatedData, error } = await supabase
      .from('subjects')
      .update(formData)
      .eq('id', formData.id)
      .eq('user_id', userId)
      .select()

    if (error) {
      console.error('Error updating subject:', error.message)
      return { error }
    }

    if (updatedData && updatedData.length > 0) {
      await logSecurityEvent(
        'subject_updated',
        `Subject ID: ${formData.id}, Name: ${formData.name || 'No name'}`
      )
    }

    return { data: updatedData }
  }

  // Update Subject Image (extra validation)
  async function updateSubjectImage(file, filename) {
    try {
      const allowedTypes = ['image/png', 'image/jpeg']
      if (!file || !allowedTypes.includes(file.type)) {
        throw new Error('Invalid image type. Only PNG and JPEG allowed.')
      }
      if (file.size > 2_000_000) {
        throw new Error('Image too large. Max size is 2 MB.')
      }

      const filePath = 'subjects/' + getSlugText(filename || 'subject') + '.png'

      const { data, error } = await supabase.storage
        .from('edutrail')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        })

      if (error) {
        console.error('Error uploading image:', error.message)
        return null
      }

      const { data: imageData, error: urlError } = await supabase.storage
        .from('edutrail')
        .getPublicUrl(data.path)

      if (urlError) {
        console.error('Error retrieving image URL:', urlError.message)
        return null
      }

      return imageData.publicUrl
    } catch (err) {
      console.error('Unexpected error in image upload:', err)
      return null
    }
  }

  // Delete a subject by ID
  async function deleteSubject(id) {
    const userId = await getCurrentUserId()

    const { error } = await supabase
      .from('subjects')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) {
      console.error('Error deleting subject:', error.message)
      return { error }
    }

    subjects.value = subjects.value.filter(subject => subject.id !== id)
    await logSecurityEvent('subject_deleted', `Subject ID: ${id}`)

    return { success: true }
  }

  return {
    $reset,
    subjects,
    getSubjectsFromApi,
    getSubjects,
    subjectsFromApi,
    addSubject,
    updateSubject,
    deleteSubject,
  }
})



