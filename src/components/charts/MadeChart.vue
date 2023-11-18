<!-- Developed by Taipei Urban Intelligence Center 2023 -->

<script setup>
import { computed, defineProps, ref } from "vue";
import dayjs from "dayjs";
// import { useMapStore } from "../../store/mapStore";

const props = defineProps([
	"chart_config",
	"activeChart",
	"series",
	"map_config",
]);
// const mapStore = useMapStore();

// How many data points to show before summing all remaining points into "other"
// const steps = ref(4);

// Donut charts in apexcharts uses a slightly different data format from other chart types
// As such, the following parsing functions are required
const parsedSeries = computed(() => {
	if (!props.series[0].data) return;
	const toParse = [...props.series];
	return toParse;
});

const steps = ref(6);
const parsedSeries2 = computed(() => {
	if (!props.series[0].data) return;
	const toParse = [...props.series[0].data[selectedIndex.value].data];
	if (toParse.length <= steps.value) {
		return toParse.map((item) => item.Carbon);
	}
	toParse.sort((a, b) => b.Carbon - a.Carbon);
	let output = [];
	for (let i = 0; i < steps.value; i++) {
		output.push(toParse[i].Carbon);
	}
	const toSum = toParse.splice(steps.value, toParse.length - steps.value);
	let sum = 0;
	toSum.forEach((element) => (sum += element.Carbon));
	output.push(sum);
	return output;
});

const parsedLabels = computed(() => {
	const toParse = [...props.series[0].data[selectedIndex.value].data];
	if (toParse.length <= steps.value) {
		return toParse.map((item) => item.Route_Name);
	}
	let output = [];
	toParse.sort((a, b) => b.Carbon - a.Carbon);
	for (let i = 0; i < steps.value; i++) {
		output.push(toParse[i].Route_Name);
	}
	output.push("其他");
	return output;
});

// const switchQ = (val) => {
// 	if (dayjs(val).month() + 1 === 1) {
// 		return 1;
// 	} else if (dayjs(val).month() + 1 === 4) {
// 		return 2;
// 	} else if (dayjs(val).month() + 1 === 7) {
// 		return 3;
// 	} else if (dayjs(val).month() + 1 === 10) {
// 		return 4;
// 	}
// };

// chartOptions needs to be in the bottom since it uses computed data
const chartOptions = ref({
	chart: {
		type: "bar",
		height: 380,
	},
	colors: props.chart_config.color,
	legend: {
		show: false,
	},
	style: {
		fontSize: "12px",
	},
	plotOptions: {
		bar: {
			distributed: true,
		},
	},
	xaxis: {
		type: "category",
		// labels: {
		// 	formatter: function (val) {
		// 		return "Q" + switchQ(val);
		// 	},
		// },
		group: {
			style: {
				fontSize: "10px",
				fontWeight: 700,
			},
		},
	},
});

const chartOptions2 = ref({
	chart: {
		type: "donut",
		height: 380,
	},
	// labels: ["第一季", "第二季", "第三季", "第四季"],
	colors: props.chart_config.color,
	labels: parsedLabels,
	responsive: [
		{
			breakpoint: 480,
			options: {
				chart: {
					width: 200,
				},
				legend: {
					position: "bottom",
				},
			},
		},
	],
});

const selectedIndex = ref(null);
const touchDown = ref(false);
function handleDataSelection(e, chartContext, config) {
	touchDown.value = true;
	selectedIndex.value = config.dataPointIndex;
	if (!props.chart_config.map_filter) {
		return;
	}
	// if (config.dataPointIndex !== selectedIndex.value) {
	// 	mapStore.addLayerFilter(
	// 		`${props.map_config[0].index}-${props.map_config[0].type}`,
	// 		props.chart_config.map_filter[0],
	// 		props.chart_config.map_filter[1][config.dataPointIndex]
	// 	);
	// 	selectedIndex.value = config.dataPointIndex;
	// } else {
	// 	mapStore.clearLayerFilter(
	// 		`${props.map_config[0].index}-${props.map_config[0].type}`
	// 	);
	// 	selectedIndex.value = null;
	// }
}

const touchBack = () => {
	touchDown.value = false;
};
</script>

<template>
	<div v-if="activeChart === 'MadeChart'" class="MadeChart">
		<div v-if="!touchDown">
			<apexchart
				width="100%"
				height="100%"
				type="bar"
				:options="chartOptions"
				:series="parsedSeries"
				@dataPointSelection="handleDataSelection"
			></apexchart>
			<!-- <canvas id="”canvas”" width="”400″" height="”300″"></canvas> -->
		</div>
		<div v-else class="donutChart">
			<span class="back" @click="touchBack">返回</span>
			<apexchart
				width="100%"
				height="100%"
				type="donut"
				:options="chartOptions2"
				:series="parsedSeries2"
			>
			</apexchart>
		</div>
	</div>
</template>

<style scoped lang="scss">
.MadeChart {
	height: 100%;
	width: 100%;
	display: flex;
	justify-content: center;
	align-items: center;
	position: relative;
	overflow-y: visible;
	:deep(.apexcharts-toolbar) {
		display: none;
	}
	position: relative;
	padding-top: 20px;
	.donutChart {
		position: absolute;
		padding-top: 30px;
		top: 0%;
		right: 0;
		width: 100%;
		.back {
			cursor: pointer;
		}
	}
}
</style>
