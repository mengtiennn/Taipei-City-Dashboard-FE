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
		"id": 22,
		"index": "traffic_accident",
		"map_config": [
			{
				"heatmap": {
					"filter": "type",
					"zoom": 16.5
				},
				"index": "traffic_accident_location_view",
				"paint": {
					"circle-color": [
						"match",
						[
							"get",
							"type"
						],
						"1",
						"#CA0020",
						"2",
						"#ff996d",
						"3",
						"#f8c3ac",
						"#ccc"
					]
				},
				"property": [
					{
						"key": "location",
						"name": "位置"
					},
					{
						"key": "type",
						"name": "處理別"
					},
					{
						"key": "occur_time",
						"name": "時間"
					}
				],
				"type": "circle",
				"size": null,
				"icon": "heatmap",
				"title": "交通事故統計"
			}
		],
		"chart_config": {
			"color": [
				"#CA0020",
				"#ff996d",
				"#f8c3ac"
			],
			"types": [
				"DonutChart",
				"BarChart"
			],
			"unit": "件",
			"map_filter": [
				"type",
				[
					"1",
					"2",
					"3"
				]
			]
		},
		"history_data": [
			{
				"name": "",
				"data": [
					{
						"y": 7929,
						"x": "2023-01-01T00:00:00+08:00"
					},
					{
						"y": 10305,
						"x": "2022-12-01T00:00:00+08:00"
					},
					{
						"y": 9106,
						"x": "2022-11-01T00:00:00+08:00"
					},
					{
						"y": 8663,
						"x": "2022-10-01T00:00:00+08:00"
					},
					{
						"y": 8836,
						"x": "2022-09-01T00:00:00+08:00"
					},
					{
						"y": 25107,
						"x": "2022-08-01T00:00:00+08:00"
					},
					{
						"y": 26664,
						"x": "2022-07-01T00:00:00+08:00"
					},
					{
						"y": 22941,
						"x": "2022-06-01T00:00:00+08:00"
					},
					{
						"y": 1533,
						"x": "2022-05-01T00:00:00+08:00"
					}
				]
			}
		],
		"source": "警察局",
		"time_from": "2023-01-31T14:01:00+08:00",
		"time_to": null,
		"update_freq": null,
		"update_freq_unit": null,
		"name": "交通事故統計",
		"short_desc": "顯示三至四個月前的交通事故統計及熱力圖",
		"long_desc": "顯示三至四個月前的交通事故統計及熱力圖，資料來源為台北市交通局內部資料，每月更新。",
		"use_case": "透過交通事故的統計資料與熱力圖的呈現，我們能更直觀地了解台北市3~4個月前的交通事故情況，並尋找可能的高風險地區。",
		"links": [
			"https://data.taipei/dataset/detail?id=0554bac7-cbc2-4ef3-a55e-0aad3dd4ee1d",
			"https://data.taipei/dataset/detail?id=2f238b4f-1b27-4085-93e9-d684ef0e2735"
		],
		"tags": [],
		"contributors": [
			"tuic"
		],
		"chart_data": [
			{
				"name": "",
				"data": [
					{
						"x": "A1",
						"y": 5
					},
					{
						"x": "A2",
						"y": 2495
					},
					{
						"x": "A3",
						"y": 2162
					}
				]
			}
		]
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
