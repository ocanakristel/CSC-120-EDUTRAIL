<script setup>
import AppLayout from '@/components/layout/AppLayout.vue'
import SideNavigation from '@/components/layout/navigation/SideNavigation.vue'

import { ref } from 'vue'
import AssignmentList from './AssignmentList.vue'

const isDrawerVisible = ref(true)
</script>

<template>
  <AppLayout
    :is-with-app-bar-nav-icon="true"
    @is-drawer-visible="isDrawerVisible = !isDrawerVisible"
  >
    <template #navigation>
      <SideNavigation :is-drawer-visible="isDrawerVisible"></SideNavigation>
    </template>
    <template #content>
      <v-container fluid>
        <AssignmentList></AssignmentList>
      </v-container>
    </template>
  </AppLayout>
</template>

<style scoped>
.background {
  background: #e8fcd9; /* same soft pastel green */
  min-height: 100vh;
  padding: 24px;
}


/* "STAY ON TRACK" HEADER CARD – MATCH DASHBOARD */
.header-card {
  background: linear-gradient(120deg, #7ee8fa 0%, #80ff72 50%, #fff07c 100%);
  border-radius: 20px;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.15);
  margin-bottom: 24px;
  color: #ffffff;
}

.header-title {
  color: #ffffff;
  font-weight: 700;
  font-size: 2rem;
  letter-spacing: -0.5px;
}

/* Tabs on header */
.custom-tabs {
  background: transparent;
}

.custom-tab {
  color: rgba(255, 255, 255, 0.92) !important;
  font-weight: 600;
  font-size: 0.9rem;
  text-transform: none;
  padding: 0 24px;
  min-height: 48px;
}

.custom-tab.v-tab--selected {
  color: #358600 !important;
  border-bottom: 3px solid #358600;
  border-radius: 0;
}

.tab-label {
  font-weight: 600;
}

.tab-chip {
  font-weight: 700;
  min-width: 32px;
  height: 24px;
}

/* + CREATE ASSIGNMENT button */
.create-btn {
  background: #fff07c !important;
  color: #358600 !important;
  font-weight: 700;
  padding: 0 24px !important;
  border-radius: 10px;
  text-transform: none;
  font-size: 0.95rem;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
}

.create-btn:hover {
  background: #ffe98f !important;
  transform: translateY(-2px);
}

/* Assignment cards */
.modern-assignment-card {
  border-radius: 14px;
  background: #ffffff !important;
  color: #1a1a1a;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  border: 1px solid #dcdcdc;
}

.modern-assignment-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2) !important;
}

.finished-card {
  background: #e8f7f0 !important;
  border: 1px solid #b7e4c7 !important;
}

.assignment-title {
  font-size: 1.15rem;
  font-weight: 600;
  color: #358600;
  line-height: 1.3;
}

.text-muted {
  color: #757575;
}

/* Checklist / progress */
.no-checklist-msg {
  display: flex;
  align-items: center;
  padding: 10px 14px;
  background: #fff3e0;
  border-radius: 8px;
  border-left: 4px solid #ff9800;
}

.checklist-section {
  background: #f8f9fa;
  padding: 12px;
  border-radius: 10px;
  border: 1px solid #e0e0e0;
}

.finished-checklist {
  background: #f1f8f4;
  border: 1px solid #c8e6c9;
}

.progress-section {
  background: #fafafa;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid #e0e0e0;
}

.progress-percent {
  font-size: 1.15rem;
  font-weight: 700;
  color: #358600;
}

/* Button overrides */
.v-btn.primary {
  background-color: #80ff72 !important;
  color: #358600 !important;
}
.v-btn.success {
  background-color: #358600 !important;
  color: #ffffff !important;
}
.v-btn.error {
  background-color: #c62828 !important;
  color: #ffffff !important;
}

@media (max-width: 960px) {
  .header-title {
    font-size: 1.5rem;
  }
  .custom-tab {
    font-size: 0.8rem;
    padding: 0 12px;
  }
  .create-btn {
    width: 100%;
  }
}

.gap-2 {
  gap: 8px;
}
</style>
