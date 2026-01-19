<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  modelValue: string | number
  label: string
  placeholder?: string
  type?: 'text' | 'number' | 'email' | 'password' | 'tel' | 'url' | 'date' | 'time' | 'datetime-local'
  required?: boolean
  disabled?: boolean
  error?: string
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  required: false,
  disabled: false,
  placeholder: ''
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | number): void
}>()

const inputValue = computed({
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
    <input
      v-model="inputValue"
      :type="type"
      :placeholder="placeholder"
      :disabled="disabled"
      :class="[$style.input, error && $style.inputError]"
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

.input {
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
}

.input::placeholder {
  color: #9CA3AF;
}

.input:focus {
  outline: none;
  border-color: #A17D23;
  box-shadow: 0 0 0 3px rgba(161, 125, 35, 0.1);
}

.input:disabled {
  background: #F5F7FA;
  cursor: not-allowed;
  opacity: 0.6;
}

.inputError {
  border-color: #D44333;
}

.inputError:focus {
  border-color: #D44333;
  box-shadow: 0 0 0 3px rgba(212, 67, 51, 0.1);
}

.errorMessage {
  font-size: 12px;
  color: #D44333;
  text-align: right;
}
</style>
