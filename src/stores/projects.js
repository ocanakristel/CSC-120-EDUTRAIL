import { defineStore } from 'pinia'
import { ref } from 'vue'
import axios from 'axios'
import { supabase } from '@/utils/supabase'
import { useAuthUserStore } from './authUser'
import { getSlugText } from '@/utils/helpers'
import { logSecurityEvent } from '@/utils/securityLogs'

export const useProjectsStore = defineStore('projects', () => {
  const projects = ref([])
  const projectsFromApi = ref([])
  const authStore = useAuthUserStore()

  async function getCurrentUserId() {
    let userId = authStore.userData?.id
    if (userId) return userId

    const { data: userData, error } = await supabase.auth.getUser()
    if (error || !userData?.user) {
      console.error('No logged-in user (projects):', error?.message)
      throw new Error('No logged-in user. Please log in again.')
    }

    userId = userData.user.id
    authStore.userData = authStore.userData || {}
    authStore.userData.id = userId
    return userId
  }

  function $reset() {
    projects.value = []
    projectsFromApi.value = []
  }

  async function getProjectsFromApi() {
    try {
      const userId = await getCurrentUserId()

      const response = await axios.get('https://api.restful-api.dev/objects')
      projectsFromApi.value = response.data

      const transformedData = response.data.map(project => ({
        description: project?.description ?? '',
        additional_notes: project?.additional_notes ?? '',
        user_id: userId,
        subjects_id: project?.userData?.id ?? null,
      }))

      const { error } = await supabase.from('projects').insert(transformedData).select()

      if (error) throw error

      await logSecurityEvent(
        'projects_imported_from_api',
        `Imported ${transformedData.length} projects from API`
      )
    } catch (error) {
      console.error('Error fetching or inserting projects:', error.message)
    }
  }

  async function getProjects() {
    try {
      const userId = await getCurrentUserId()

      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', userId)

      if (error) throw error
      projects.value = data || []
    } catch (error) {
      console.error('Error fetching projects:', error.message)
      projects.value = []
    }
  }

  async function addProjects(formData) {
    const { image, ...data } = formData

    const userId = await getCurrentUserId()
    data.user_id = userId

    if (image) {
      try {
        const imageUrl = await updateProjectImage(image, formData.description)
        data.image_url = imageUrl
      } catch (error) {
        console.error('Error uploading project image:', error.message)
        throw new Error('Failed to upload image. Please try again.')
      }
    }

    try {
      const { data: insertedData, error } = await supabase
        .from('projects')
        .insert([data])
        .select()

      if (error) throw error

      if (insertedData && insertedData.length > 0) {
        projects.value.push(insertedData[0])
        await logSecurityEvent(
          'project_created',
          `Project: ${insertedData[0].description || 'No description'}`
        )
      }
      return insertedData
    } catch (error) {
      console.error('Error adding project:', error.message)
      throw error
    }
  }

  // Update Project Image (extra validation)
  async function updateProjectImage(file, filename) {
    const allowedTypes = ['image/png', 'image/jpeg']
    if (!file || !allowedTypes.includes(file.type)) {
      throw new Error('Invalid image type. Only PNG and JPEG allowed.')
    }
    if (file.size > 2_000_000) {
      throw new Error('Image too large. Max size is 2 MB.')
    }

    const filePath = `projects/${getSlugText(filename || 'project')}.png`
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

  async function updateProjects(formData) {
    const { image } = formData

    if (image) {
      formData.image_url = await updateProjectImage(image, formData.description)
      delete formData.image
    }

    const userId = await getCurrentUserId()

    const { data, error } = await supabase
      .from('projects')
      .update(formData)
      .eq('id', formData.id)
      .eq('user_id', userId)
      .select()

    if (error) {
      console.error('Error updating project:', error.message)
      return { error }
    }

    if (data && data.length > 0) {
      await logSecurityEvent(
        'project_updated',
        `Project ID: ${formData.id}, Description: ${formData.description || 'No description'}`
      )
    }

    return { data }
  }

  async function deleteProjects(id) {
    try {
      const userId = await getCurrentUserId()

      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id)
        .eq('user_id', userId)

      if (error) {
        console.error('Error deleting project:', error.message)
        return { error }
      }

      projects.value = projects.value.filter(project => project.id !== id)
      await logSecurityEvent('project_deleted', `Project ID: ${id}`)

      return { success: true }
    } catch (error) {
      console.error('Error deleting project:', error.message)
      return { error }
    }
  }

  async function finishProject(id) {
    try {
      const userId = await getCurrentUserId()

      const { data, error } = await supabase
        .from('projects')
        .update({ status: 'finished' })
        .eq('id', id)
        .eq('user_id', userId)
        .select()

      if (error) throw error

      projects.value = projects.value.filter(project => project.id !== id)
      await logSecurityEvent('project_finished', `Project ID: ${id}`)

      return { success: true, data }
    } catch (error) {
      console.error('Error finishing project:', error.message)
      return { error }
    }
  }

  return {
    finishProject,
    deleteProjects,
    updateProjects,
    addProjects,
    projects,
    projectsFromApi,
    getProjectsFromApi,
    getProjects,
    $reset,
  }
})

