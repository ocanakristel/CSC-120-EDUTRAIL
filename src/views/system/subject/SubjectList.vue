<script setup>
import SubjectFormDialog from './SubjectFormDialog.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import { onMounted, ref } from 'vue'
import { useSubjectsStore } from '@/stores/subjects'
import { formActionDefault } from '@/utils/api'

// Use Pinia Store
const subjectsStore = useSubjectsStore()

// Load variables
const tableFilters = ref({
  search: '',
})
const itemData = ref(null)
const isDialogVisible = ref(false)
const deleteId = ref(null)
const formAction = ref({
  ...formActionDefault,
})
const isConfirmDeleteDialog = ref(false)

// Add Subject
const onAdd = () => {
  itemData.value = null
  isDialogVisible.value = true
}

// Retrieve Data based on Search
const onSearchSubjects = async () => {
  if (
    tableFilters.value.search?.length >= 3 ||
    tableFilters.value.search?.length == 0 ||
    tableFilters.value.search === null
  ) {
    await subjectsStore.getSubjects(tableFilters.value)
  }
}

// Update Subject
const onUpdate = (subject) => {
  itemData.value = subject
  isDialogVisible.value = true
}

// Trigger Delete Dialog
const onDelete = (id) => {
  deleteId.value = id
  isConfirmDeleteDialog.value = true
}

// Confirm Delete
const onConfirmDelete = async () => {
  formAction.value = { ...formActionDefault, formProcess: true }

  const { error } = await subjectsStore.deleteSubject(deleteId.value)

  formAction.value.formProcess = false

  if (error) {
    formAction.value.formErrorMessage = error.message
    return
  }

  formAction.value.formSuccessMessage = 'Successfully Deleted Subject.'

  // Refresh the subjects list with tableFilters
  await subjectsStore.getSubjects(tableFilters.value)
}

onMounted(async () => {
  if (subjectsStore.subjects.length === 0) {
    await subjectsStore.getSubjects(tableFilters.value)
  }
})
</script>

<template>
  <v-container fluid>
    <!-- Search and Add Buttons -->
    <v-row align="center" class="px-8">
      <v-col cols="12" md="8">
        <v-text-field
          v-model="tableFilters.search"
          variant="outlined"
          label="Search Subject"
          density="compact"
          append-inner-icon="mdi-magnify"
          clearable
          @click:clear="onSearchSubjects"
          @input="onSearchSubjects"
        ></v-text-field>
      </v-col>
      <v-col cols="12" class="mb-6" md="4">
        <v-btn variant="tonal" @click="onAdd" block>Add Subjects</v-btn>
      </v-col>
    </v-row>

    <!-- Subject Cards -->
    <v-row dense>
      <v-col
        v-for="subject in subjectsStore.subjects"
        :key="subject.id"
        cols="12"
        sm="6"
        md="4"
        lg="3"
      >
        <v-card class="ma-3 pa-4" min-height="250" min-width="225" color="green">
          <!-- Image -->
          <v-img v-if="subject.image_url" :src="subject.image_url" height="150" cover></v-img>

          <!-- Card Content -->
          <v-card-text class="font-size">
            <h3 class="font-weight-bold mb-2">{{ subject.name }}</h3>
            <h4 class="mb-1">
              Units: <span class="font-weight-medium">{{ subject.units }}</span>
            </h4>
            <h4 class="font-weight-medium">{{ subject.description }}</h4>
          </v-card-text>

          <!-- Actions -->
          <v-card-actions style="display: flex; justify-content: flex-end">
            <v-btn
              icon
              variant="elevated"
              density="comfortable"
              color="black"
              @click="onUpdate(subject)"
            >
              <v-icon size="20">mdi-pencil</v-icon>
            </v-btn>
            <v-btn
              icon
              variant="elevated"
              density="comfortable"
              color="red"
              @click="onDelete(subject.id)"
            >
              <v-icon size="20">mdi-delete</v-icon>
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <!-- Dialogs -->
    <SubjectFormDialog
      v-model:is-dialog-visible="isDialogVisible"
      :item-data="itemData"
      :table-filters="tableFilters"
    />
    <ConfirmDialog
      v-model:is-dialog-visible="isConfirmDeleteDialog"
      title="Confirm Delete"
      text="Are you sure you want to delete this subject?"
      @confirm="onConfirmDelete"
    />
  </v-container>
</template>
<style scoped>
.v-card {
  box-shadow: 0 10px 10px rgba(0, 0, 0, 0.1);
  border-radius: 10px;
}
.v-row {
  row-gap: 10px;
}
</style>
