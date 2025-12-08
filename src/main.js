// src/main.js
// import './assets/main.css'

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

// ✅ Supabase client
import { supabase } from './utils/supabase'

const app = createApp(App)

// ✅ Vuetify config
const vuetify = createVuetify({
  icons: {
    defaultSet: 'mdi',
  },
  components,
  directives,
})

// ✅ Global plugins
app.use(createPinia())
app.use(router)
app.use(vuetify)

// ✅ Make Supabase available in all components if you want `inject('$supabase')`
app.provide('$supabase', supabase)

// ✅ Listen to auth changes (debug “No logged-in user” issue)
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Auth event:', event)
  console.log('Current session:', session)
})

// ✅ Wait for initial session before mounting (optional but helpful)
async function bootstrap() {
  const { data } = await supabase.auth.getSession()
  console.log('Initial Supabase session on app load:', data?.session)

  app.mount('#app')
}

bootstrap()
