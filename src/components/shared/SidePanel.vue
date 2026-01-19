<script setup lang="ts">
import { watch } from "vue";

interface Props {
  isOpen: boolean;
  title: string;
  width?: string;
}

const props = withDefaults(defineProps<Props>(), {
  width: "450px",
});

const emit = defineEmits<{
  (e: "update:isOpen", value: boolean): void;
  (e: "close"): void;
}>();

const handleClose = () => {
  emit("update:isOpen", false);
  emit("close");
};

const handleOverlayClick = () => {
  handleClose();
};

// Prevent body scroll when panel is open
watch(
  () => props.isOpen,
  (newValue) => {
    if (newValue) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  },
);
</script>

<template>
  <Teleport to="body">
    <Transition name="panel">
      <div v-if="isOpen" :class="$style.overlay" @click="handleOverlayClick">
        <div :class="$style.panel" :style="{ width: width }" @click.stop>
          <!-- Panel Header -->
          <div :class="$style.header">
            <h2 :class="$style.title">{{ title }}</h2>
            <button :class="$style.closeBtn" @click="handleClose" title="إغلاق">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M12 4L4 12M4 4L12 12"
                  stroke="#545454"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round" />
              </svg>
            </button>
          </div>

          <!-- Panel Content -->
          <div :class="$style.content">
            <slot></slot>
          </div>

          <!-- Panel Footer -->
          <div v-if="$slots.footer" :class="$style.footer">
            <slot name="footer"></slot>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style module>
.overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  z-index: 1000;
  display: flex;
  justify-content: flex-end;
  align-items: stretch;
  padding: 16px;
}

.panel {
  background: white;
  height: calc(100vh - 32px);
  display: flex;
  flex-direction: column;
  box-shadow: 4px 0 24px rgba(0, 0, 0, 0.15);
  border-radius: 15px;
  margin-left: 0;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 22px;
  border-bottom: 1px solid #e1e4ea;
  background: white;
  flex-shrink: 0;
  border-radius: 15px 15px 0 0;
}

.title {
  font-size: 18px;
  font-weight: 600;
  color: #0e121b;
  margin: 0;
  font-family: "Cairo", "Segoe UI", Tahoma, sans-serif;
}

.closeBtn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: 1px solid #e1e4ea;
  background: transparent;
  border-radius: 8px;
  color: #717784;
  cursor: pointer;
  transition: all 0.2s ease;
}

.closeBtn:hover {
  background: #f5f7fa;
  color: #0e121b;
}

.content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  font-family: "Cairo", "Segoe UI", Tahoma, sans-serif;
}

.content::-webkit-scrollbar-track {
  background: #f5f7fa;
}

.content::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 4px;
}

.content::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}

.footer {
  flex-shrink: 0;
  padding: 16px 20px;
  border-top: 1px solid #e1e4ea;
  background: #f8fafc;
  border-radius: 0 0 15px 15px;
}

/* Transition animations */
:global(.panel-enter-active),
:global(.panel-leave-active) {
  transition: opacity 0.3s ease;
}

:global(.panel-enter-active) .panel,
:global(.panel-leave-active) .panel {
  transition: transform 0.3s ease;
}

:global(.panel-enter-from),
:global(.panel-leave-to) {
  opacity: 0;
}

:global(.panel-enter-from) .panel,
:global(.panel-leave-to) .panel {
  transform: translateX(-100%);
}

@media (max-width: 768px) {
  .overlay {
    padding: 0;
  }

  .panel {
    width: 100% !important;
    height: 100vh;
    border-radius: 0;
  }

  .header {
    padding: 16px 20px;
    border-radius: 0;
  }

  .title {
    font-size: 20px;
  }

  .content {
    padding: 20px;
  }
}
</style>
