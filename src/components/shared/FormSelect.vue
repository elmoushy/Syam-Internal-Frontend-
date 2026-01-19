<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

interface Option {
  value: string | number
  label: string
}

interface Props {
  modelValue: string | number | null
  label: string
  placeholder?: string
  options: Option[]
  required?: boolean
  disabled?: boolean
  searchable?: boolean
  error?: string
}

const props = withDefaults(defineProps<Props>(), {
  required: false,
  disabled: false,
  placeholder: 'اختر',
  searchable: false,
  modelValue: null
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | number | null): void
}>()

const isOpen = ref(false)
const searchQuery = ref('')
const dropdownRef = ref<HTMLElement | null>(null)

const selectedOption = computed(() => {
  return props.options.find(opt => opt.value === props.modelValue)
})

const filteredOptions = computed(() => {
  if (!props.searchable || !searchQuery.value) {
    return props.options
  }
  const query = searchQuery.value.toLowerCase()
  return props.options.filter(opt => 
    opt.label.toLowerCase().includes(query)
  )
})

const toggleDropdown = () => {
  if (!props.disabled) {
    isOpen.value = !isOpen.value
    if (isOpen.value) {
      searchQuery.value = ''
    }
  }
}

const selectOption = (option: Option) => {
  emit('update:modelValue', option.value)
  isOpen.value = false
  searchQuery.value = ''
}

const handleClickOutside = (event: MouseEvent) => {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    isOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div :class="$style.formGroup" ref="dropdownRef">
    <label :class="$style.label">
      {{ label }}
      <span v-if="required" :class="$style.required">*</span>
    </label>
    
    <div 
      :class="[$style.selectWrapper, isOpen && $style.selectOpen, error && $style.selectError, disabled && $style.selectDisabled]"
      @click="toggleDropdown"
    >
      <div :class="$style.selectDisplay">
        <span v-if="selectedOption" :class="$style.selectedText">
          {{ selectedOption.label }}
        </span>
        <span v-else :class="$style.placeholder">
          {{ placeholder }}
        </span>
      </div>
      <i :class="['fas fa-chevron-down', $style.chevron, isOpen && $style.chevronRotated]"></i>
    </div>

    <div v-if="isOpen" :class="$style.dropdown">
      <div v-if="searchable" :class="$style.searchWrapper">
        <i class="fas fa-search" :class="$style.searchIcon"></i>
        <input
          v-model="searchQuery"
          type="text"
          :class="$style.searchInput"
          placeholder="بحث..."
          @click.stop
        />
      </div>
      
      <div :class="$style.optionsList">
        <div
          v-for="option in filteredOptions"
          :key="option.value"
          :class="[$style.option, option.value === modelValue && $style.optionSelected]"
          @click.stop="selectOption(option)"
        >
          {{ option.label }}
        </div>
        <div v-if="filteredOptions.length === 0" :class="$style.noResults">
          لا توجد نتائج
        </div>
      </div>
    </div>

    <span v-if="error" :class="$style.errorMessage">{{ error }}</span>
  </div>
</template>

<style module>
.formGroup {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  position: relative;
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

.selectWrapper {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #E1E4EA;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  justify-content: space-between;
  align-items: center;
  direction: rtl;
}

.selectWrapper:hover {
  border-color: #A17D23;
}

.selectOpen {
  border-color: #A17D23;
  box-shadow: 0 0 0 3px rgba(161, 125, 35, 0.1);
}

.selectDisabled {
  background: #F5F7FA;
  cursor: not-allowed;
  opacity: 0.6;
}

.selectError {
  border-color: #D44333;
}

.selectDisplay {
  flex: 1;
  text-align: right;
}

.selectedText {
  font-size: 14px;
  color: #0E121B;
}

.placeholder {
  font-size: 14px;
  color: #9CA3AF;
}

.chevron {
  font-size: 12px;
  color: #717784;
  transition: transform 0.2s ease;
}

.chevronRotated {
  transform: rotate(180deg);
}

.dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #E1E4EA;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  max-height: 300px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.searchWrapper {
  padding: 12px;
  border-bottom: 1px solid #E1E4EA;
  display: flex;
  align-items: center;
  gap: 8px;
  direction: rtl;
}

.searchIcon {
  color: #717784;
  font-size: 14px;
}

.searchInput {
  flex: 1;
  border: none;
  outline: none;
  font-size: 14px;
  color: #0E121B;
  direction: rtl;
  text-align: right;
}

.searchInput::placeholder {
  color: #9CA3AF;
}

.optionsList {
  overflow-y: auto;
  max-height: 240px;
}

.option {
  padding: 12px 16px;
  cursor: pointer;
  transition: background 0.2s ease;
  font-size: 14px;
  color: #0E121B;
  text-align: right;
  direction: rtl;
}

.option:hover {
  background: #F5F7FA;
}

.optionSelected {
  background: #FFF8ED;
  color: #A17D23;
  font-weight: 600;
}

.optionSelected:hover {
  background: #FFF8ED;
}

.noResults {
  padding: 16px;
  text-align: center;
  color: #9CA3AF;
  font-size: 14px;
}

.errorMessage {
  font-size: 12px;
  color: #D44333;
  text-align: right;
}
</style>
