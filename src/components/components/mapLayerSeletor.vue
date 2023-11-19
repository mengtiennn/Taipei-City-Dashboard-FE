<script setup>
import { reactive, ref, onMounted, nextTick } from 'vue'
import { useAssistant } from '../../store/assistantStore'
import { useDialogStore } from '../../store/dialogStore'
import { useMapStore } from '../../store/mapStore'
import { useContentStore } from '../../store/contentStore';
import MoreInfo from '../dialogs/MoreInfo.vue'
import dayjs from 'dayjs'
const contentStore = useContentStore();
const assistant = useAssistant()
const dialogStore = useDialogStore()
const mapStore = useMapStore()
const emit = defineEmits(['open'])
// const selectVal = ref(dayjs().month() + 1)
const selectVal = ref(10)
const selectTime = () => {
	mapStore.selectFilterBus(selectVal.value)
  // mapStore.addLayerFilter('test_route-3DRoute', )
  // mapStore.addLayerFilter('test_route-3DRoute', 'RouteName', cond, props.map_config[0])
}
onMounted(async () => {
})
</script>
<template>
  <div class="seleterContainer">
    <span class="seleterContainer-title">當前顯示月份：{{ selectVal }}月</span>
    <input
      class="seleterContainer-select"
      type="range"
      min="6"
      max="10"
      step="1"
      v-model="selectVal"
      @change="selectTime()"
      />
  </div>
</template>
<style scoped lang="scss">
.seleterContainer {
  width: 300px;
  height: 100px;
  background-color: #ffffff;
  border-radius: 8px;
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 10;
  display: flex;
  flex-direction: column;
  padding: 20px;
  box-sizing: border-box;
  justify-content: center;
  gap: 10px;
  &-title {
    color: #333333;
    font-weight: bold;
    font-size: 18px;
  }
  &-select {
    height: 12px;
    width: 100%;
  }
}
</style>
