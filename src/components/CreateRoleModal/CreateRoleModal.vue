<template>
  <Teleport to="body">
    <div v-if="visible" :class="$style.modalOverlay" @click.self="handleClose">
      <div :class="$style.modal" :dir="isRTL ? 'rtl' : 'ltr'">
        <!-- Header -->
        <div :class="$style.header">
          <div :class="$style.headerContent">
            <i class="fas fa-plus-circle" :class="$style.headerIcon"></i>
            <div>
              <h2 :class="$style.title">{{ t('roleManagement.createRole.title') }}</h2>
              <p :class="$style.subtitle">{{ t('roleManagement.createRole.subtitle') }}</p>
            </div>
          </div>
          <button :class="$style.closeBtn" @click="handleClose" :disabled="loading">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <!-- Content -->
        <div :class="$style.content">
          <form @submit.prevent="handleSubmit" :class="$style.form">
            <!-- Role Name Field -->
            <div :class="$style.formGroup">
              <label :class="$style.label">
                {{ t('roleManagement.createRole.name') }}
                <span :class="$style.required">*</span>
              </label>
              <div :class="$style.inputWrapper">
                <i class="fas fa-tag" :class="$style.inputIcon"></i>
                <input
                  type="text"
                  v-model="formData.name"
                  :placeholder="t('roleManagement.createRole.namePlaceholder')"
                  :class="[$style.input, errors.name ? $style.inputError : '']"
                  @input="validateName"
                  autocomplete="off"
                />
              </div>
              <p :class="$style.hint" :dir="isRTL ? 'rtl' : 'ltr'">
                <i class="fas fa-info-circle"></i>
                {{ t('roleManagement.createRole.nameHint') }}
              </p>
              <p v-if="errors.name" :class="$style.errorText" :dir="isRTL ? 'rtl' : 'ltr'">
                <i class="fas fa-exclamation-circle"></i>
                {{ errors.name }}
              </p>
            </div>

            <!-- Display Name Field -->
            <div :class="$style.formGroup">
              <label :class="$style.label">
                {{ t('roleManagement.createRole.displayName') }}
              </label>
              <div :class="$style.inputWrapper">
                <i class="fas fa-font" :class="$style.inputIcon"></i>
                <input
                  type="text"
                  v-model="formData.display_name"
                  :placeholder="t('roleManagement.createRole.displayNamePlaceholder')"
                  :class="$style.input"
                  autocomplete="off"
                />
              </div>
            </div>

            <!-- Description Field -->
            <div :class="$style.formGroup">
              <label :class="$style.label">
                {{ t('roleManagement.createRole.description') }}
              </label>
              <div :class="$style.textareaWrapper">
                <i class="fas fa-align-right" :class="$style.textareaIcon"></i>
                <textarea
                  v-model="formData.description"
                  :placeholder="t('roleManagement.createRole.descriptionPlaceholder')"
                  :class="$style.textarea"
                  rows="3"
                ></textarea>
              </div>
            </div>
          </form>
        </div>

        <!-- Footer -->
        <div :class="$style.footer">
          <div :class="$style.footerInfo" :dir="isRTL ? 'rtl' : 'ltr'">
            <i class="fas fa-shield-alt" :class="$style.footerIcon"></i>
            <span>{{ t('roleManagement.createRole.footerNote') }}</span>
          </div>
          <div :class="$style.footerActions">
            <button 
              type="button"
              :class="$style.cancelBtn" 
              @click="handleClose" 
              :disabled="loading"
            >
              {{ t('common.cancel') }}
            </button>
            <button 
              type="submit"
              :class="$style.saveBtn" 
              @click="handleSubmit"
              :disabled="loading || !isFormValid"
            >
              <i v-if="loading" class="fas fa-spinner fa-spin"></i>
              <i v-else class="fas fa-plus"></i>
              {{ t('roleManagement.createRole.submit') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, watch, reactive } from 'vue'
import { useAppStore } from '../../stores/useAppStore'

interface Props {
  visible: boolean
  loading?: boolean
}

interface FormData {
  name: string
  display_name: string
  description: string
}

interface FormErrors {
  name: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', data: { name: string; display_name?: string; description?: string; is_system_role: boolean }): void
}>()

const store = useAppStore()
const isRTL = computed(() => store.currentLanguage === 'ar')
const t = computed(() => store.t)

const formData = reactive<FormData>({
  name: '',
  display_name: '',
  description: ''
})

const errors = reactive<FormErrors>({
  name: ''
})

// Reset form when modal opens
watch(() => props.visible, (visible) => {
  if (visible) {
    formData.name = ''
    formData.display_name = ''
    formData.description = ''
    errors.name = ''
  }
})

const validateName = () => {
  const name = formData.name.trim()
  
  if (!name) {
    errors.name = t.value('roleManagement.createRole.nameRequired')
    return false
  }
  
  // Check for valid characters (letters, numbers, underscores)
  const validPattern = /^[a-zA-Z][a-zA-Z0-9_]*$/
  if (!validPattern.test(name)) {
    errors.name = t.value('roleManagement.createRole.nameInvalid')
    return false
  }
  
  errors.name = ''
  return true
}

const isFormValid = computed(() => {
  return formData.name.trim().length > 0 && !errors.name
})

const handleClose = () => {
  if (!props.loading) {
    emit('close')
  }
}

const handleSubmit = () => {
  if (!validateName() || props.loading) return
  
  const data = {
    name: formData.name.trim().toLowerCase().replace(/\s+/g, '_'),
    display_name: formData.display_name.trim() || undefined,
    description: formData.description.trim() || undefined,
    is_system_role: false
  }
  
  emit('save', data)
}
</script>

<style module>
.modalOverlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1200;
  padding: 20px;
  backdrop-filter: blur(4px);
}

.modal {
  background: white;
  border-radius: 20px;
  width: 100%;
  max-width: 520px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  animation: modalSlideIn 0.3s ease;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  border-bottom: 1px solid var(--border-color, #e5e7eb);
}

.headerContent {
  display: flex;
  align-items: center;
  gap: 16px;
}

.headerIcon {
  font-size: 24px;
  color: #b78a41;
  background: rgba(183, 138, 65, 0.12);
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-primary, #1f2937);
  margin: 0;
}

.subtitle {
  font-size: 0.875rem;
  color: var(--text-secondary, #6b7280);
  margin: 4px 0 0 0;
}

.closeBtn {
  width: 40px;
  height: 40px;
  border: none;
  background: var(--bg-secondary, #f3f4f6);
  border-radius: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary, #6b7280);
  transition: all 0.2s ease;
}

.closeBtn:hover:not(:disabled) {
  background: var(--bg-hover, #e5e7eb);
  color: var(--text-primary, #1f2937);
}

.closeBtn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.content {
  padding: 24px;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.formGroup {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.label {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary, #374151);
  display: flex;
  align-items: center;
  gap: 4px;
}

.required {
  color: #dc3545;
  font-size: 1rem;
}

.inputWrapper,
.textareaWrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.inputIcon,
.textareaIcon {
  position: absolute;
  right: 14px;
  color: var(--text-secondary, #9ca3af);
  font-size: 14px;
  pointer-events: none;
}

.textareaIcon {
  top: 14px;
}

.input {
  width: 100%;
  padding: 14px 44px 14px 16px;
  border: 2px solid var(--border-color, #e5e7eb);
  border-radius: 12px;
  font-size: 0.95rem;
  background: var(--bg-secondary, #f9fafb);
  transition: all 0.2s ease;
  color: var(--text-primary, #1f2937);
}

.input:focus {
  outline: none;
  border-color: #b78a41;
  background: white;
  box-shadow: 0 0 0 4px rgba(183, 138, 65, 0.1);
}

.input.inputError {
  border-color: #dc3545;
  background: rgba(220, 53, 69, 0.05);
}

.input.inputError:focus {
  box-shadow: 0 0 0 4px rgba(220, 53, 69, 0.1);
}

.textarea {
  width: 100%;
  padding: 14px 44px 14px 16px;
  border: 2px solid var(--border-color, #e5e7eb);
  border-radius: 12px;
  font-size: 0.95rem;
  background: var(--bg-secondary, #f9fafb);
  transition: all 0.2s ease;
  color: var(--text-primary, #1f2937);
  resize: vertical;
  min-height: 80px;
  font-family: inherit;
}

.textarea:focus {
  outline: none;
  border-color: #b78a41;
  background: white;
  box-shadow: 0 0 0 4px rgba(183, 138, 65, 0.1);
}

.hint {
  font-size: 0.8rem;
  color: var(--text-secondary, #6b7280);
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
}

.hint i {
  color: #b78a41;
}

.errorText {
  font-size: 0.8rem;
  color: #dc3545;
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
}

.footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-top: 1px solid var(--border-color, #e5e7eb);
  background: var(--bg-secondary, #f9fafb);
  border-radius: 0 0 20px 20px;
  gap: 16px;
}

.footerInfo {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8rem;
  color: var(--text-secondary, #6b7280);
  flex: 1;
}

.footerIcon {
  color: #b78a41;
}

.footerActions {
  display: flex;
  gap: 12px;
}

.cancelBtn,
.saveBtn {
  padding: 12px 24px;
  border-radius: 12px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;
}

.cancelBtn {
  background: white;
  border: 1px solid var(--border-color, #e5e7eb);
  color: var(--text-secondary, #6b7280);
}

.cancelBtn:hover:not(:disabled) {
  background: var(--bg-secondary, #f3f4f6);
}

.saveBtn {
  background: linear-gradient(135deg, #b78a41, #a17d23);
  border: none;
  color: white;
}

.saveBtn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(183, 138, 65, 0.3);
}

.saveBtn:disabled,
.cancelBtn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Night mode */
:global([data-theme="night"]) .modal {
  background: #1e1e1e;
}

:global([data-theme="night"]) .header {
  border-color: #333;
}

:global([data-theme="night"]) .title {
  color: #f5f5f5;
}

:global([data-theme="night"]) .subtitle {
  color: #a0a0a0;
}

:global([data-theme="night"]) .label {
  color: #e5e5e5;
}

:global([data-theme="night"]) .input,
:global([data-theme="night"]) .textarea {
  background: #252525;
  border-color: #333;
  color: #e5e5e5;
}

:global([data-theme="night"]) .input:focus,
:global([data-theme="night"]) .textarea:focus {
  background: #2a2a2a;
}

:global([data-theme="night"]) .footer {
  background: #252525;
  border-color: #333;
}

:global([data-theme="night"]) .cancelBtn {
  background: #333;
  border-color: #444;
  color: #e5e5e5;
}

:global([data-theme="night"]) .hint {
  color: #a0a0a0;
}
</style>
