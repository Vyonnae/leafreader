<script setup>
import { onMounted, ref } from 'vue'

defineProps({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  actionLabel: {
    type: String,
    required: true,
  },
})

const emit = defineEmits(['cancel', 'confirm'])
const cancelButton = ref(null)

onMounted(() => cancelButton.value?.focus())
</script>

<template>
  <div class="confirm-backdrop" role="presentation">
    <section
      class="confirm-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-description"
      @keydown.esc.stop.prevent="emit('cancel')"
    >
      <h3 id="confirm-title">{{ title }}</h3>
      <p id="confirm-description">{{ description }}</p>
      <div class="confirm-actions">
        <button ref="cancelButton" type="button" class="secondary" @click="emit('cancel')">Cancel</button>
        <button type="button" class="danger-button" @click="emit('confirm')">{{ actionLabel }}</button>
      </div>
    </section>
  </div>
</template>
