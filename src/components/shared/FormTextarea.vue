<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  modelValue: string
  label: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  rows?: number
  error?: string
}

const props = withDefaults(defineProps<Props>(), {
  required: false,
  disabled: false,
  placeholder: '',
  rows: 6
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const textValue = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})
</script>

<template>
  <div :class="$style.formGroup">
    <label :class="$style.label">
      {{ label }}
      <span v-if="required" :class="$style.required">*</span>
    </label>
    <textarea
      v-model="textValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :rows="rows"
      :class="[$style.textarea, error && $style.textareaError]"
    />
    <span v-if="error" :class="$style.errorMessage">{{ error }}</span>
  </div>
</template>

<style module>
.formGroup {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.label {
  font-size: 14px;
  font-weight: 600;
  color: #0E121B;
  text-align: right;
}

.required {
  color: #D44333;
  margin-right: 4px;
}

.textarea {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #E1E4EA;
  border-radius: 8px;
  font-size: 14px;
  color: #0E121B;
  background: white;
  transition: all 0.2s ease;
  direction: rtl;
  text-align: right;
  resize: vertical;
  font-family: "Cairo", "Segoe UI", Tahoma, sans-serif;
}

.textarea::placeholder {
  color: #9CA3AF;
}

.textarea:focus {
  outline: none;
  border-color: #A17D23;
  box-shadow: 0 0 0 3px rgba(161, 125, 35, 0.1);
}

.textarea:disabled {
  background: #F5F7FA;
  cursor: not-allowed;
  opacity: 0.6;
}

.textareaError {
  border-color: #D44333;
}

.textareaError:focus {
  border-color: #D44333;
  box-shadow: 0 0 0 3px rgba(212, 67, 51, 0.1);
}

.errorMessage {
  font-size: 12px;
  color: #D44333;
  text-align: right;
}
</style>
