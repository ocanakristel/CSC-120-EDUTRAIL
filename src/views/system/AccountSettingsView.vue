<script setup>
import AppLayout from '@/components/layout/AppLayout.vue'
import SideNavigation from '@/components/layout/navigation/SideNavigation.vue'
import ProfileForm from '@/components/system/account-settings/ProfileForm.vue'
import PasswordForm from '@/components/system/account-settings/PasswordForm.vue'

import { useAuthUserStore } from '@/stores/authUser'
import { onMounted, ref, computed } from 'vue'
import { useDisplay } from 'vuetify'
import { supabase } from '@/utils/supabase'

// Vuetify display helper
const { mobile } = useDisplay()

// Pinia store
const authStore = useAuthUserStore()

// Drawer visibility
const isDrawerVisible = ref(!mobile.value)

// Upload state
const uploading = ref(false)

// File input reference
const fileInput = ref(null)

// User info from store
const userData = computed(() => authStore.userData)
const userRole = computed(() => authStore.userRole)

// Computed full name
const fullName = computed(() => {
  const first = userData.value?.firstname || ''
  const last = userData.value?.lastname || ''
  return `${first} ${last}`.trim()
})

// Avatar URL from metadata (reactive)
const avatarUrl = computed(() => userData.value?.image_url || '')

// Track if image failed to load → fallback to red circle
const avatarError = ref(false)

// Load user info
onMounted(() => {
  authStore.isAuthenticated()
  authStore.getUserInformation()
})

// Open hidden file dialog
const openFileDialog = () => {
  if (fileInput.value) {
    fileInput.value.click()
  }
}

// Handle avatar upload
const onAvatarSelected = async (event) => {
  const file = event.target.files[0]
  if (!file) return

  try {
    uploading.value = true
    avatarError.value = false // reset error before new upload

    // get current auth user
    const { data, error } = await supabase.auth.getUser()
    if (error || !data?.user) {
      console.error('Failed to get current user:', error)
      return
    }

    const userId = data.user.id
    const ext = file.name.split('.').pop()
    const fileName = `avatar-${userId}-${Date.now()}.${ext}`

    // upload to Supabase storage bucket "avatars"
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, file, { upsert: true })

    if (uploadError) {
      console.error('Avatar upload error:', uploadError)
      return
    }

    // get public URL
    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName)

    const publicUrl = urlData.publicUrl

    // update user metadata
    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        ...(data.user.user_metadata || {}),
        image_url: publicUrl,
      },
    })

    if (updateError) {
      console.error('Update metadata error:', updateError)
      return
    }

    // instantly update store so UI updates without reload
    authStore.userData.image_url = publicUrl

    // (optional) refresh store from backend if your store reads elsewhere
    await authStore.getUserInformation()
  } catch (err) {
    console.error('Avatar upload failed:', err)
  } finally {
    uploading.value = false
    event.target.value = '' 
  }
}
</script>

<template>
  <AppLayout
    :is-with-app-bar-nav-icon="true"
    @is-drawer-visible="isDrawerVisible = !isDrawerVisible"
  >
    <!-- Side Navigation -->
    <template #navigation>
      <SideNavigation :is-drawer-visible="isDrawerVisible" />
    </template>

    <!-- Main Content -->
    <template #content>
      <v-container>
        <!-- Page Header -->
        <v-card class="mb-5">
          <template #title>
            <span class="text-h6 font-weight-bold">
              <v-breadcrumbs :items="['Account', 'Settings']">
                <template #prepend>
                  <v-icon icon="mdi-wrench" size="small" class="me-1" />
                </template>
              </v-breadcrumbs>
            </span>
          </template>
          <template #subtitle>
            <p class="ms-4 text-wrap">
              Edit profile information and change your password.
            </p>
          </template>
        </v-card>

        <v-row>
          <!-- LEFT PROFILE CARD -->
          <v-col cols="12" lg="4">
            <v-card>
              <v-card-text>
                <div class="text-center">
                  <div class="mx-auto" style="width: 50%; max-width: 260px;">

                    <v-img
                      v-if="avatarUrl && !avatarError"
                      :src="avatarUrl"
                      class="rounded-circle"
                      aspect-ratio="1"
                      cover
                      color="grey-lighten-3"
                      @error="avatarError = true"
                    />

                    <!-- Fallback red circle when no url or image failed -->
                    <div
                      v-else
                      class="rounded-circle"
                      style="width: 100%; padding-top: 100%; background-color: #b71c1c;"
                    ></div>
                  </div>

                  <!-- (optional) Debug: show the URL below -->
                  <!-- <div class="mt-2" style="font-size: 11px; word-break: break-all;">
                    {{ avatarUrl }}
                  </div> -->

                  <!-- Hidden File Input -->
                  <input
                    ref="fileInput"
                    type="file"
                    accept="image/*"
                    style="display: none"
                    @change="onAvatarSelected"
                  />

                  <!-- Change Photo Button -->
                  <div class="mt-4">
                    <v-btn
                      color="orange"
                      :loading="uploading"
                      :disabled="uploading"
                      @click="openFileDialog"
                    >
                      <v-icon left small>mdi-image-edit</v-icon>
                      {{ uploading ? 'Uploading…' : 'Change Photo' }}
                    </v-btn>
                  </div>
                </div>

                <!-- Full Name & Email -->
                <h3 class="d-flex align-center justify-center mt-5">
                  <v-icon class="me-2" icon="mdi-account-badge" />
                  {{ fullName || userRole || 'User' }}
                </h3>

                <v-divider class="my-5" />

                <div class="text-center">
                  <h4 class="my-2">
                    <b>Full Name:</b> {{ fullName || '—' }}
                  </h4>
                  <h4 class="my-2">
                    <b>Email:</b> {{ userData.email }}
                  </h4>
                </div>
              </v-card-text>
            </v-card>
          </v-col>

          <!-- RIGHT-SIDE FORMS -->
          <v-col cols="12" lg="8">
            <!-- Profile Info Form -->
            <v-card class="mb-5">
              <template #title> Profile Information </template>
              <v-card-text>
                <ProfileForm />
              </v-card-text>
            </v-card>

            <!-- Change Password Form -->
            <v-card class="mb-5">
              <template #title> Change Password </template>
              <v-card-text>
                <PasswordForm />
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </template>
  </AppLayout>
</template>




