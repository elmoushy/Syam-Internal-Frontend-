<script setup lang="ts">
interface Props {
  modelValue: boolean | null
  label: string
  required?: boolean
  disabled?: boolean
  error?: string
}

const props = withDefaults(defineProps<Props>(), {
  required: false,
  disabled: false
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const handleChange = (value: boolean) => {
  if (!props.disabled) {
    emit('update:modelValue', value)
  }
}
</script>

<template>
  <div :class="$style.formGroup">
    <label :class="$style.checkboxWrapper">
      <span :class="$style.label">
        {{ label }}
        <span v-if="required" :class="$style.required">*</span>
      </span>
      <input
        type="checkbox"
        :checked="modelValue === true"
        :disabled="disabled"
        :class="$style.checkbox"
        @change="handleChange(!modelValue)"
      />
    </label>
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

.checkboxWrapper {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  cursor: pointer;
  direction: rtl;
  background: white;
  transition: all 0.2s ease;
}



.checkbox {
  width: 20px;
  height: 20px;
  cursor: pointer;
  accent-color: #A17D23;
  border-radius: 4px;
  flex-shrink: 0;
  order: 2;
}

.checkbox:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.checkboxWrapper:has(.checkbox:disabled) {
  background: #F5F7FA;
  cursor: not-allowed;
  opacity: 0.6;
}

.label {
  font-size: 14px;
  font-weight: 500;
  color: #0E121B;
  cursor: pointer;
  flex: 1;
  text-align: right;
  order: 1;
}

.required {
  color: #D44333;
  margin-right: 4px;
}

.errorMessage {
  font-size: 12px;
  color: #D44333;
  text-align: right;
}
</style>
