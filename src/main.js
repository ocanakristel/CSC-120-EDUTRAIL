// src/main.js
import '@/assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

// Vuetify
import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

import App from './App.vue'
import router from './router'

// API client
import { api } from './utils/api'

const app = createApp(App)

// Vuetify config
const vuetify = createVuetify({
  icons: { defaultSet: 'mdi' },
  components,
  directives,
})

// Global plugins
app.use(createPinia())
app.use(router)
app.use(vuetify)

// Optional: make API injectable
app.provide('$api', api)

// Debug auth events only in dev
if (import.meta.env.DEV) {
  api.auth.onAuthStateChange((event, session) => {
    console.log('Auth event:', event)
    console.log('Current session:', session)
  })
}

// Bootstrap (don’t block mount if session check fails)
async function bootstrap() {
  try {
    const { data, error } = await api.auth.getSession()
    if (import.meta.env.DEV) {
      console.log('Initial API session on app load:', data?.session)
      if (error) console.warn('Initial session error:', error)
    }
  } catch (e) {
    if (import.meta.env.DEV) console.warn('bootstrap getSession failed:', e)
  } finally {
    app.mount('#app')
  }
}

bootstrap()