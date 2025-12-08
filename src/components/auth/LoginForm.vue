<script setup>
import AlertNotification from '../common/AlertNotification.vue'
import { supabase } from '@/utils/supabase'
import { requiredValidator, emailValidator } from '@/utils/validators'
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { logSecurityEvent } from '@/utils/securityLogs' // 👈 logger helper

const router = useRouter()
const theme = ref('light')
const visible = ref(false)
const refVForm = ref()

const formDataDefault = {
  email: '',
  password: '',
}

const formData = ref({ ...formDataDefault })

const formActionDefault = {
  formProcess: false,
  formErrorMessage: '',
  formSuccessMessage: '',
  formStatus: null,
}

const formAction = ref({ ...formActionDefault })

// 🔐 Brute-force / lockout variables
const failedAttempts = ref(0)
const lockUntil = ref(0)          // timestamp in ms
const isLoginLocked = ref(false)  // used in template

const updateLockState = () => {
  if (!lockUntil.value) {
    isLoginLocked.value = false
    return
  }

  if (Date.now() < lockUntil.value) {
    isLoginLocked.value = true
  } else {
    // lock period over
    lockUntil.value = 0
    isLoginLocked.value = false
    localStorage.removeItem('login_lock_until')
  }
}

onMounted(() => {
  const saved = localStorage.getItem('login_lock_until')
  if (saved) {
    lockUntil.value = Number(saved)
    updateLockState()
  }
})

// MAIN submit logic
const onSubmit = async () => {
  updateLockState()
  if (isLoginLocked.value) {
    formAction.value.formErrorMessage =
      'Too many failed attempts. Please try again later.'
    return
  }

  formAction.value = { ...formActionDefault, formProcess: true }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: formData.value.email,
    password: formData.value.password,
  })

  if (error) {
    // 📝 log failed login
    await logSecurityEvent('login_failed', `Email: ${formData.value.email}`)

    failedAttempts.value++

    // lock for 5 minutes after 5 failures
    if (failedAttempts.value >= 5) {
      lockUntil.value = Date.now() + 5 * 60 * 1000
      localStorage.setItem('login_lock_until', String(lockUntil.value))
      updateLockState()
    }

    // 🙈 generic error → avoids enumeration
    if (error.status === 400 || error.status === 422) {
      formAction.value.formErrorMessage = 'Invalid email or password.'
    } else {
      formAction.value.formErrorMessage =
        'Something went wrong. Please try again later.'
    }

    formAction.value.formStatus = error.status
  } else if (data) {
    // 📝 log success
    await logSecurityEvent('login_success', 'User logged in.')

    failedAttempts.value = 0
    lockUntil.value = 0
    localStorage.removeItem('login_lock_until')
    updateLockState()

    formAction.value.formSuccessMessage = 'Successfully Logged'
    router.replace('/system/dashboard')

    // reset form on success
    formData.value = { ...formDataDefault }
  }

  // clear password field even on error
  formData.value.password = ''
  formAction.value.formProcess = false
}

const onFormSubmit = () => {
  refVForm.value?.validate().then(({ valid }) => {
    if (valid) onSubmit()
  })
}
</script>

<template>
  <AlertNotification
    :form-success-message="formAction.formSuccessMessage"
    :form-error-message="formAction.formErrorMessage"
  />

  <v-form ref="refVForm" @submit.prevent="onFormSubmit">
    <div class="pt-2 text-subtitle-1 font-weight-bold">Email</div>

    <v-text-field
      v-model="formData.email"
      class="font-weight-bold"
      density="compact"
      placeholder="Email address"
      prepend-inner-icon="mdi-email-outline"
      variant="outlined"
      :rules="[requiredValidator, emailValidator]"
    />

    <div class="text-subtitle-1 font-weight-bold">Password</div>

    <v-text-field
      v-model="formData.password"
      :append-inner-icon="visible ? 'mdi-eye-off' : 'mdi-eye'"
      :type="visible ? 'text' : 'password'"
      class="font-weight-bold"
      density="compact"
      placeholder="Enter your password"
      prepend-inner-icon="mdi-lock-outline"
      variant="outlined"
      @click:append-inner="visible = !visible"
      :rules="[requiredValidator]"
    />

    <p v-if="isLoginLocked" class="text-caption text-red mt-1">
      Your account is temporarily locked due to multiple failed login attempts.
      Please try again after a few minutes.
    </p>

    <v-btn
      type="submit"
      class="csu-login-btn mb-4"
      size="large"
      block
      :disabled="formAction.formProcess || isLoginLocked"
    >
      Log In
    </v-btn>
  </v-form>
</template>

<style scoped>
.csu-login-btn {
  background-color: #006400 !important;
  color: #ffd700 !important;
  font-weight: 700;
  font-size: 17px;
  border-radius: 10px;
  letter-spacing: 1px;
  margin-top: 8px;
  box-shadow: 0 3px 14px rgba(0, 64, 32, 0.08);
  transition: background 0.2s;
}
.csu-login-btn:hover,
.csu-login-btn:focus {
  background-color: #034d15 !important; /* darken on hover/focus */
}
.text-red {
  color: #d32f2f;
}
</style>
