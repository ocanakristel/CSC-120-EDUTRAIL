<script setup>
import AppLayout from '@/components/layout/AppLayout.vue'
import SideNavigation from '@/components/layout/navigation/SideNavigation.vue'
import ProfileForm from '@/components/system/account-settings/ProfileForm.vue'
import PasswordForm from '@/components/system/account-settings/PasswordForm.vue'
import { useAuthUserStore } from '@/stores/authUser'
import { onMounted, ref, computed } from 'vue'
import { useDisplay } from 'vuetify'

// Utilize pre-defined Vue functions
const { mobile } = useDisplay()

// Use Pinia Store
const authStore = useAuthUserStore()

// Reactive states
const isDrawerVisible = ref(!mobile.value)

// User Information
const userData = computed(() => authStore.userData)
const userRole = computed(() => authStore.userRole)

// ✅ avatar source: use uploaded image OR fallback logo
const avatarSrc = computed(
  () => userData.value?.image_url || '/images/logo-icon.jpg'
)

// Retrieve user information on mount
onMounted(() => {
  authStore.isAuthenticated()
  authStore.getUserInformation()
})
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
        <!-- Header Card -->
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
          <!-- User Profile Card -->
          <v-col cols="12" lg="4">
            <v-card>
              <v-card-text>
                <!-- 👇 avatar: no red color, uses logo as fallback -->
                <v-img
                  width="50%"
                  class="mx-auto rounded-circle"
                  aspect-ratio="1"
                  :src="avatarSrc"
                  alt="Profile Picture"
                  cover
                />

                <h3 class="d-flex align-center justify-center mt-5">
                  <v-icon class="me-2" icon="mdi-account-badge" />
                  {{ userRole || 'User' }}
                </h3>

                <v-divider class="my-5" />

                <div class="text-center">
                  <h4 class="my-2">
                    <b>Full Name:</b>
                    {{ (userData.firstname || '') + ' ' + (userData.lastname || '') }}
                  </h4>
                  <h4 class="my-2">
                    <b>Email:</b> {{ userData.email }}
                  </h4>
                </div>
              </v-card-text>
            </v-card>
          </v-col>

          <!-- Forms Section -->
          <v-col cols="12" lg="8">
            <!-- Profile Information Form -->
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
