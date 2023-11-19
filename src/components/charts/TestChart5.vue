<!-- Developed by Taipei Urban Intelligence Center 2023 -->

<script setup>
import { ref, computed } from "vue";
import { useMapStore } from "../../store/mapStore";

const props = defineProps([
	"chart_config",
	"activeChart",
	"series",
	"map_config",
]);
const mapStore = useMapStore();

// Guage charts in apexcharts uses a slightly different data format from other chart types
// As such, the following parsing function are required
const parseSeries = computed(() => {
	let output = {};
	let parsedSeries = [];
	let parsedTooltip = [];
	for (let i = 0; i < props.series[0].data.length; i++) {
		let total = props.series[0].data[i] + props.series[1].data[i];
		parsedSeries.push(Math.round((props.series[0].data[i] / total) * 100));
		parsedTooltip.push(`${props.series[0].data[i]} / ${total}`);
	}
	output.series = parsedSeries;
	output.tooltipText = parsedTooltip;
	return output;
});

// chartOptions needs to be in the bottom since it uses computed data
const chartOptions = ref({
	chart: {
		height: 350,
		type: "radialBar",
		offsetY: -10,
	},
	plotOptions: {
		radialBar: {
			startAngle: -135,
			endAngle: 135,
			dataLabels: {
				name: {
					fontSize: "16px",
					color: undefined,
					offsetY: 120,
				},
				value: {
					offsetY: 76,
					fontSize: "22px",
					color: "white",
					formatter: function (val) {
						return val + "%";
					},
				},
			},
		},
	},
	fill: {
		type: "gradient",
		gradient: {
			shade: "dark",
			shadeIntensity: 0.15,
			inverseColors: false,
			opacityFrom: 1,
			opacityTo: 1,
			stops: [0, 50, 65, 91],
		},
	},
	stroke: {
		dashArray: 4,
	},
	colors: props.chart_config.color,
	labels: props.chart_config.categories ? props.chart_config.categories : [],
	legend: {
		offsetY: -10,
		onItemClick: {
			toggleDataSeries: false,
		},
		position: "bottom",
		show: parseSeries.value.series.length > 1 ? true : false,
	},
	tooltip: {
		custom: function ({ seriesIndex, w }) {
			// The class "chart-tooltip" could be edited in /assets/styles/chartStyles.css
			return (
				'<div class="chart-tooltip">' +
				"<h6>" +
				w.globals.seriesNames[seriesIndex] +
				"</h6>" +
				"<span>" +
				`${parseSeries.value.tooltipText[seriesIndex]}` +
				"</span>" +
				"</div>"
			);
		},
		enabled: true,
	},
});

const selectedIndex = ref(null);

function handleDataSelection(e, chartContext, config) {
	if (!props.chart_config.map_filter) {
		return;
	}
	if (config.seriesIndex !== selectedIndex.value) {
		mapStore.addLayerFilter(
			`${props.map_config[0].index}-${props.map_config[0].type}`,
			props.chart_config.map_filter[0],
			props.chart_config.map_filter[1][config.seriesIndex]
		);
		selectedIndex.value = config.seriesIndex;
	} else {
		mapStore.clearLayerFilter(
			`${props.map_config[0].index}-${props.map_config[0].type}`
		);
		selectedIndex.value = null;
	}
}
</script>

<template>
	<div v-if="activeChart === 'TestChart5'">
		<apexchart
			width="80%"
			height="300px"
			type="radialBar"
			:options="chartOptions"
			:series="parseSeries.series"
			@dataPointSelection="handleDataSelection"
		>
		</apexchart>
	</div>
</template>
