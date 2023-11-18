<!-- Developed by Taipei Urban Intelligence Center 2023 -->

<script setup>
import { computed, defineProps, ref } from "vue";
import { useMapStore } from "../../store/mapStore";

const props = defineProps([
	"chart_config",
	"activeChart",
	"series",
	"map_config",
]);
const mapStore = useMapStore();

// How many data points to show before summing all remaining points into "other"
const steps = ref(4);

// Donut charts in apexcharts uses a slightly different data format from other chart types
// As such, the following parsing functions are required
const parsedSeries = computed(() => {
	if (!props.series[0].data) return;
	var toParse;
	// const data = props.series[0].data;
	const data = [...props.series[0].data];
	data.forEach((item) => {
		if (switchCheck.value) {
			item.data.sort();
			toParse = [...props.series[0].data];
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
const parsedLabels = computed(() => {
	const toParse = [...props.series[0].data];
	if (toParse.length <= steps.value) {
		return toParse.map((item) => item.x);
	}
	let output = [];
	for (let i = 0; i < steps.value; i++) {
		output.push(toParse[i].x);
	}
	output.push("其他");
	return output;
});

// chartOptions needs to be in the bottom since it uses computed data
const chartOptions = ref({
	chart: {
		type: "bar",
		stacked: true,
	},
	stroke: {
		width: 1,
		colors: ["#fff"],
	},
	dataLabels: {
		formatter: (val) => {
			return val / 1000 + "K";
		},
	},
	plotOptions: {
		bar: {
			horizontal: false,
		},
	},
	xaxis: {
		// categories: [
		// 	"Online advertising",
		// 	"Sales Training",
		// 	"Print advertising",
		// 	"Catalogs",
		// 	"Meetings",
		// 	"Public relations",
		// ],
		labels: {
			formatter: function (val) {
				return val + 123;
			},
		},
	},
	fill: {
		opacity: 1,
	},
	colors: ["#80c7fd", "#008FFB", "#80f1cb", "#00E396"],
	yaxis: {
		labels: {
			formatter: (val) => {
				return val / 1000 + "K";
			},
		},
	},
	legend: {
		position: "top",
		horizontalAlign: "left",
	},
});

const selectedIndex = ref(null);

function handleDataSelection(e, chartContext, config) {
	if (!props.chart_config.map_filter) {
		return;
	}
	if (config.dataPointIndex !== selectedIndex.value) {
		mapStore.addLayerFilter(
			`${props.map_config[0].index}-${props.map_config[0].type}`,
			props.chart_config.map_filter[0],
			props.chart_config.map_filter[1][config.dataPointIndex]
		);
		selectedIndex.value = config.dataPointIndex;
	} else {
		mapStore.clearLayerFilter(
			`${props.map_config[0].index}-${props.map_config[0].type}`
		);
		selectedIndex.value = null;
	}
}
const switchCheck = ref(true);
</script>

<template>
	<div v-if="activeChart === 'TestChart3'" class="TestChart3">
		<apexchart
			width="100%"
			type="bar"
			:options="chartOptions"
			:series="parsedSeries"
			@dataPointSelection="handleDataSelection"
		>
		</apexchart>
		<label class="switch">
			<input type="checkbox" v-model="switchCheck" />
			<span class="slider round"></span>
		</label>
	</div>
</template>

<style scoped lang="scss">
.TestChart3 {
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
