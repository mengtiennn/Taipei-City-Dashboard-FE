<!-- Developed by Taipei Urban Intelligence Center 2023 -->

<script setup>
import { computed, defineProps, ref } from "vue";
// import { useMapStore } from "../../store/mapStore";

const props = defineProps([
	"chart_config",
	"activeChart",
	"series",
	"map_config",
]);
// const mapStore = useMapStore();

// How many data points to show before summing all remaining points into "other"

// Donut charts in apexcharts uses a slightly different data format from other chart types
// As such, the following parsing functions are required
const parsedSeries = computed(() => {
	if (!props.series[0].data) return;
	var toParse;
	const data = [...props.series[0].data];
	const check = localStorage.getItem("data");
	if (!check) {
		localStorage.setItem("data", JSON.stringify(data));
	}
	data.forEach((item) => {
		if (!switchCheck.value) {
			console.log(JSON.parse(localStorage.getItem("data")));
			toParse = JSON.parse(localStorage.getItem("data"));
		} else {
			item.data.sort((a, b) => b - a);
			toParse = [...props.series[0].data];
		}
	});
	// data.forEach((item) => {
	// 	console.log(item);
	// });
	return toParse;
});
// const switchDate = computed(() => {
// 	console.log(switchCheck.value);
// 	if (switchCheck.value) {
// 		return [
// 			"2023-05",
// 			"2023-06",
// 			"2023-07",
// 			"2023-08",
// 			"2023-09",
// 			"2023-10",
// 		];
// 	} else {
// 		return [
// 			"2023-10",
// 			"2023-09",
// 			"2023-08",
// 			"2023-07",
// 			"2023-06",
// 			"2023-05",
// 		];
// 	}
// });

// chartOptions needs to be in the bottom since it uses computed data
const chartOptions = ref({
	chart: {
		height: 350,
		type: "line",
		foreColor: "#333",
	},
	stroke: {
		width: [0, 4],
	},
	// title: {
	// 	text: "Traffic Sources",
	// },
	dataLabels: {
		enabled: true,
		enabledOnSeries: [1],
		formatter: function (val) {
			return val;
		},
	},
	// tooltip: {
	// 	followCursor: false,
	// 	custom: function ({ series, seriesIndex, w }) {
	// 		// The class "chart-tooltip" could be edited in /assets/styles/chartStyles.css
	// 		return (
	// 			'<div class="chart-tooltip">' +
	// 			"<h6>" +
	// 			w.globals.labels[seriesIndex] +
	// 			"</h6>" +
	// 			"<span>" +
	// 			series[seriesIndex] +
	// 			` ${props.chart_config.unit}` +
	// 			"</span>" +
	// 			"</div>"
	// 		);
	// 	},
	// },
	labels: ["2023-05", "2023-06", "2023-07", "2023-08", "2023-09", "2023-10"],
	xaxis: {
		show: false,
	},
	yaxis: [
		{
			title: {
				text: "Website Blog",
			},
		},
		{
			opposite: true,
			title: {
				text: "Social Media",
			},
		},
	],
});

const switchCheck = ref(false);
</script>

<template>
	<div v-if="activeChart === 'TestChart4'" class="TestChart4">
		<div
			style="
				display: flex;
				align-items: center;
				gap: 5px;
				align-self: flex-start;
			"
		>
			排列
			<label class="switch">
				<input type="checkbox" v-model="switchCheck" />
				<span class="slider round"></span>
			</label>
		</div>
		<apexchart
			width="100%"
			type="line"
			:options="chartOptions"
			:series="parsedSeries"
		></apexchart>
	</div>
</template>

<style scoped lang="scss">
.TestChart4 {
	height: 100%;
	width: 100%;
	display: flex;
	flex-direction: column;
	justify-content: center;
	align-items: center;
	position: relative;
	overflow-y: visible;
	:deep(.apexcharts-toolbar) {
		display: none;
	}
}
.switch {
	position: relative;
	display: inline-block;
	width: 30px;
	height: 17px;
}

.switch input {
	opacity: 0;
	width: 0;
	height: 0;
}

.slider {
	position: absolute;
	cursor: pointer;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background-color: #ccc;
	-webkit-transition: 0.4s;
	transition: 0.4s;
}

.slider:before {
	position: absolute;
	content: "";
	height: 13px;
	width: 13px;
	left: 2px;
	bottom: 2px;
	background-color: white;
	-webkit-transition: 0.4s;
	transition: 0.4s;
}

input:checked + .slider {
	background-color: #2196f3;
}

input:focus + .slider {
	box-shadow: 0 0 1px #2196f3;
}

input:checked + .slider:before {
	-webkit-transform: translateX(12px);
	-ms-transform: translateX(12px);
	transform: translateX(12px);
}

/* Rounded sliders */
.slider.round {
	border-radius: 34px;
}

.slider.round:before {
	border-radius: 50%;
}
</style>
