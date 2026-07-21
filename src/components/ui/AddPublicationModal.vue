<script setup>
import { onMounted, ref } from 'vue'

defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  error: {
    type: String,
    default: '',
  },
  busy: {
    type: Boolean,
    default: false,
  },
  preview: {
    type: Object,
    default: null,
  },
  authenticated: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:model-value', 'clear-error', 'close', 'submit'])
const publicationInput = ref(null)

function updateValue(event) {
  emit('update:model-value', event.target.value)
  emit('clear-error')
}

onMounted(() => publicationInput.value?.focus())
</script>

<template>
  <div class="modal-backdrop" role="presentation" @click.self="emit('close')">
    <form class="add-modal" role="dialog" aria-modal="true" aria-labelledby="add-publication-title" @submit.prevent="emit('submit')">
      <button type="button" class="modal-close" aria-label="Close add publication dialog" @click="emit('close')">×</button>
      <span class="modal-leaf" aria-hidden="true">⌁</span>
      <p class="eyebrow">GROW YOUR LIBRARY</p>
      <h2 id="add-publication-title">Add a new publication</h2>
      <p>Paste an RSS feed or website address to add it to your reading library.</p>
      <label class="field-label" for="publication-name">Feed or website URL</label>
      <input
        ref="publicationInput"
        id="publication-name"
        :value="modelValue"
        placeholder="https://example.com/feed.xml"
        inputmode="url"
        autocomplete="url"
        :disabled="busy"
        :aria-invalid="error ? 'true' : 'false'"
        :aria-describedby="error ? 'publication-error' : undefined"
        @input="updateValue"
      />
      <p v-if="error" id="publication-error" class="field-error" role="alert">{{ error }}</p>
      <div v-if="preview" class="feed-preview" role="status">
        <strong>{{ preview.title }}</strong>
        <span>{{ preview.feedUrl }}</span>
        <p v-if="preview.description">{{ preview.description }}</p>
      </div>
      <p v-else-if="!authenticated" class="feed-preview-note">Guest reading stays local. Sign in when you want to sync this publication.</p>
      <div class="modal-actions">
        <button type="button" class="secondary" :disabled="busy" @click="emit('close')">Cancel</button>
        <button type="submit" class="submit" :disabled="busy">
          {{ busy ? 'Checking…' : preview ? 'Add to library' : authenticated ? 'Find feed' : 'Sign in to sync' }}
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </form>
  </div>
</template>
