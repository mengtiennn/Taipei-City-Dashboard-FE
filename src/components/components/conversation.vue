<script setup>
import { reactive, ref, onMounted, nextTick } from 'vue'
import { useAssistant } from '../../store/assistantStore'
import { useDialogStore } from '../../store/dialogStore'
import MoreInfo from '../../components/dialogs/MoreInfo.vue'
const assistant = useAssistant()
const dialogStore = useDialogStore()
const emit = defineEmits(['open'])
const handleLineClick = (e) => {
	const cc =  {
		"id": 151,
		"index": "TestChart3",
		"map_config": [
			{
				"index": "TestChart3",
				"type": "fill",
				"paint": {
					"fill-color": [
						"match",
						["get", "category"],
						"#d1a26c",
						"#b9734a",
						"#9f4333",
						"#800026"
					],
					"fill-opacity": 0.8
				},
				"property": [
					{
						"key": "category",
						"name": "總體需求"
					}
				],
				"title": "潛在需求"
			}
		],
		"chart_config": {
			"types": ["TestChart3"],
			"color": ["#d1a26c", "#b9734a", "#9f4333", "#800026"],
			"unit": "件"
		},
		"chart_data": [
			{
				"name": "",
				"data": [
					{
						"x": "2023/01/01",
						"y": 300,
						"data": [1, 2, 3, 4]
					},
					{
						"x": "2023/04/01",
						"y": 496,
						"data": [1, 3, 2, 4]
					},
					{
						"x": "2023/07/01",
						"y": 457,
						"data": [2, 3, 1, 4]
					},
					{
						"x": "2023/10/01",
						"y": 403,
						"data": [3, 4, 2, 1]
					}
				]
			}
		],
		"name": "綠化路線新增量與累計量",
		"source": "鴻海",
		"time_from": "2023-11-11T00:00:00+08:00",
		"time_to": null,
		"short_desc": "",
		"long_desc": "測試組件的說明",
		"use_case": "測試組件的情境",
		"tags": [],
		"links": [
			"https://tuic.gov.taipei/youbike",
			"https://github.com/tpe-doit/YouBike-Optimization"
		],
		"contributors": ["tuic"]
	}
  
	dialogStore.showMoreInfo(cc)
	// let clickedElId = e.target.id
	// if (clickedElId === 'temp_testing_div2') {
	//   emit('open', true)
	// }
}
onMounted(async () => {
})
</script>
<template>
  <div class="conversation">
    <div v-for="(text, idx) in assistant.textScript" :key="idx + 'text'">
      <div class="conversation-wrapper" :class="{ res: idx % 2 === 1 }">
        <div class="conversation-contnet">
          <div v-html="text.content" @click="handleLineClick"></div>
        </div>
        <span>{{ text.time }}</span>
      </div>
    </div>
  </div>
  <MoreInfo/>
</template>
<style scoped lang="scss">
.conversation {
  display: flex;
  flex-direction: column;
  gap: 10px;

  &-wrapper {
    display: flex;
    flex-direction: column;
    align-items: flex-end;

    &.res {
      align-items: flex-start;

      .conversation-contnet {
        background-color: #3c3c47;
        border-radius: 8px 8px 8px 0px;
        max-width: 312px;
      }
    }

    
    >span {
      font-size: 14px;
      font-weight: 400;
      color: rgba(255, 255, 255, 0.5);
      margin-top: 4px;
    }
  }
  &-contnet {
    padding: 12px;
    background-color: #4C37CD;
    max-width: 264px;
    border-radius: 8px 8px 0px 8px;
  }
}</style>
