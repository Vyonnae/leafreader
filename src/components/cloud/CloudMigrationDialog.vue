<script setup>
defineProps({
  publications: { type: Number, default: 0 },
  collections: { type: Number, default: 0 },
  busy: { type: Boolean, default: false },
})

const emit = defineEmits(['keep-local', 'migrate'])
</script>

<template>
  <div class="migration-backdrop">
    <section class="migration-dialog" role="dialog" aria-modal="true" aria-labelledby="migration-title">
      <span class="migration-mark" aria-hidden="true">⌁</span>
      <h2 id="migration-title">Bring your local reading space with you?</h2>
      <p>We found reading preferences and publications saved in this browser. You can add them to your LeafReader account.</p>
      <div class="migration-summary" aria-label="Local data found">
        <span>Reading preferences</span>
        <strong>{{ publications }} added publication{{ publications === 1 ? '' : 's' }}</strong>
        <strong v-if="collections">{{ collections }} collection{{ collections === 1 ? '' : 's' }}</strong>
      </div>
      <p class="migration-note">Mock article read and saved states remain local until real cloud articles are available. Publications without a cloud feed ID also stay in this browser.</p>
      <div class="migration-actions">
        <button type="button" class="secondary" :disabled="busy" @click="emit('keep-local')">Keep local only</button>
        <button type="button" class="submit" :disabled="busy" @click="emit('migrate')">{{ busy ? 'Adding…' : 'Add to my account' }}</button>
      </div>
    </section>
  </div>
</template>

