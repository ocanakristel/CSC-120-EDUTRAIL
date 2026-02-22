import axios from 'axios'
import { defineStore } from 'pinia'
import { ref } from 'vue'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api'

const apiClient = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
})

export const useSubjectsStore = defineStore('subjects', () => {
  const subjectsFromApi = ref([])
  const subjects = ref([])

  function $reset() {
    subjectsFromApi.value = []
    subjects.value = []
  }

  // Retrieve from external API and insert to database
  async function getSubjectsFromApi() {
    try {
      const response = await axios.get('https://api.restful-api.dev/objects')
      subjectsFromApi.value = response.data

      const transformedData = subjectsFromApi.value.map(subject => ({
        name: subject.name,
        units: subject.units,
        description: subject.data?.description ?? '',
      }))

      // Insert to backend (backend will add user_id automatically)
      for (const item of transformedData) {
        await apiClient.post('/subjects', item)
      }

      // Refresh local list
      await getSubjects({ search: '' })
    } catch (error) {
      console.error('Error fetching or inserting subjects:', error.message)
    }
  }

  // Get all subjects for authenticated user
  async function getSubjects(tableFilters = {}) {
    try {
      const response = await apiClient.get('/subjects')
      const data = response.data?.data?.subjects || response.data?.data || []
      
      // Apply search filter if provided
      if (tableFilters.search) {
        const search = tableFilters.search.toLowerCase()
        subjects.value = data.filter(s => s.name.toLowerCase().includes(search))
      } else {
        subjects.value = data
      }
    } catch (error) {
      console.error('Error fetching subjects:', error.message)
      subjects.value = []
    }
  }

  // Add a new subject
  async function addSubject(formData) {
    const { image, ...data } = formData

    try {
      if (image) {
        const imageUrl = await uploadSubjectImage(image)
        if (imageUrl) {
          data.image_url = imageUrl
        }
      }

      const response = await apiClient.post('/subjects', data)
      const newSubject = response.data?.data?.subject || response.data?.data
      
      if (newSubject) {
        subjects.value.push(newSubject)
      }

      return { data: newSubject }
    } catch (error) {
      console.error('Error adding subject:', error.message)
      return { error }
    }
  }

  // Update subject
  async function updateSubject(formData) {
    const { image, id, ...data } = formData

    try {
      if (image) {
        const imageUrl = await uploadSubjectImage(image)
        if (imageUrl) {
          data.image_url = imageUrl
        }
      }

      const response = await apiClient.put(`/subjects/${id}`, data)
      const updatedSubject = response.data?.data?.subject || response.data?.data

      // Update local list
      const index = subjects.value.findIndex(s => s.id === id)
      if (index >= 0 && updatedSubject) {
        subjects.value[index] = updatedSubject
      }

      return { data: updatedSubject }
    } catch (error) {
      console.error('Error updating subject:', error.message)
      return { error }
    }
  }

  // Upload subject image
  async function uploadSubjectImage(file) {
    if (!file) return null

    try {
      const allowedTypes = ['image/png', 'image/jpeg']
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Invalid image type. Only PNG and JPEG allowed.')
      }
      if (file.size > 2_000_000) {
        throw new Error('Image too large. Max size is 2 MB.')
      }

      const fd = new FormData()
      fd.append('file', file)

      const response = await apiClient.post('/storage/edutrail/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      return response.data?.publicUrl || response.data?.data?.publicUrl
    } catch (error) {
      console.error('Error uploading image:', error.message)
      return null
    }
  }

  // Delete subject
  async function deleteSubject(id) {
    try {
      await apiClient.delete(`/subjects/${id}`)
      subjects.value = subjects.value.filter(subject => subject.id !== id)
      return { success: true }
    } catch (error) {
      console.error('Error deleting subject:', error.message)
      return { error }
    }
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



