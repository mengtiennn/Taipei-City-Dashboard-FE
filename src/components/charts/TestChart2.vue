<!-- Developed by Taipei Urban Intelligence Center 2023 -->

<script setup>
import { computed, defineProps, ref, onMounted } from "vue";
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
	const toParse = [...props.series[0].data];
	if (toParse.length <= steps.value) {
		return toParse.map((item) => item.y);
	}
	let output = [];
	for (let i = 0; i < steps.value; i++) {
		output.push(toParse[i].y);
	}
	const toSum = toParse.splice(steps.value, toParse.length - steps.value);
	let sum = 0;
	toSum.forEach((element) => (sum += element.y));
	output.push(sum);
	return output;
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
	console.log(output);
	return output;
});

// chartOptions needs to be in the bottom since it uses computed data
const chartOptions = ref({
	chart: {
		type: "polarArea",
	},
	colors:
		props.series.length >= steps.value
			? [...props.chart_config.color, "#848c94"]
			: props.chart_config.color,
	// dataLabels: {
	// 	formatter: function (val, { seriesIndex, w }) {
	// 		let value = w.globals.labels[seriesIndex];
	// 		return value.length > 7 ? value.slice(0, 6) + "..." : value;
	// 	},
	// },
	fill: { opacity: 1 },
	labels: parsedLabels,
	legend: {
		position: "bottom",
		// show: false,
	},
	stroke: {
		colors: ["#fff"],
		show: true,
		width: 3,
	},
	// theme: {
	// 	monochrome: { enabled: true, shadeTo: "light", shadeIntensity: 0.6 },
	// },
	tooltip: {
		followCursor: false,
		custom: function ({ series, seriesIndex, w }) {
			// The class "chart-tooltip" could be edited in /assets/styles/chartStyles.css
			return (
				'<div class="chart-tooltip">' +
				"<h6>" +
				w.globals.labels[seriesIndex] +
				"</h6>" +
				"<span>" +
				series[seriesIndex] +
				` ${props.chart_config.unit}` +
				"</span>" +
				"</div>"
			);
		},
	},
	yaxis: {
		show: false,
		// labels: {
		// 	style: {
		// 		colors: ["#fff", "#fff", "#fff", "#fff", "#fff"],
		// 	},
		// },
	},
	plotOptions: {
		polarArea: {
			rings: { strokeWidth: 0.1 },
			spokes: { strokeWidth: 0 },
		},
	},
});

// const selectedIndex = ref(null);

// function handleDataSelection(e, chartContext, config) {
// 	if (!props.chart_config.map_filter) {
// 		return;
// 	}
// 	if (config.dataPointIndex !== selectedIndex.value) {
// 		mapStore.addLayerFilter(
// 			`${props.map_config[0].index}-${props.map_config[0].type}`,
// 			props.chart_config.map_filter[0],
// 			props.chart_config.map_filter[1][config.dataPointIndex]
// 		);
// 		selectedIndex.value = config.dataPointIndex;
// 	} else {
// 		mapStore.clearLayerFilter(
// 			`${props.map_config[0].index}-${props.map_config[0].type}`
// 		);
// 		selectedIndex.value = null;
// 	}
// }
const test = ref(null);
const getCanvas = () => {
	const myCanvas = document.getElementById("canvas");
	var ctx = myCanvas.getContext("2d");

	drawscreen(ctx);
};

const drawSector = (ctx, x, y, r, sDeg, eDeg) => {
	// 初始保存
	ctx.save();
	//位移到目标点
	ctx.translate(x, y);
	ctx.beginPath();
	// 画出圆弧
	ctx.arc(0, 0, r, sDeg, eDeg);
	// 再次保存以备旋转
	ctx.save();
	// 旋转至起始角度
	ctx.rotate(eDeg);
	// 移动到终点，准备连接终点与圆心
	ctx.moveTo(r, 0);
	// 连接到圆心
	ctx.lineTo(0, 0);
	// 还原
	ctx.restore();
	// 旋转至起点角度
	ctx.rotate(sDeg);
	// 从圆心连接到起点
	ctx.lineTo(r, 0);
	ctx.closePath();
	// 还原到最初保存的状态
	ctx.restore();
};
const drawscreen = (ctx) => {
	var deg = Math.PI / 180;
	var begin_deg = (-90 * Math.PI) / 180;
	var total = 0;
	let ob = [
		// group1
		{
			value: 100,
			name: "1月",
			x: 200,
			y: 200,
			r: 100,
			sDeg: 0,
			eDeg: 50,
			style: "#d8ae2d",
		},
		{
			value: 0,
			name: "",
			x: 200,
			y: 200,
			r: 50,
			sDeg: 0,
			eDeg: 50,
			style: "#5f9747",
		},
		{
			value: 0,
			name: "",
			x: 200,
			y: 200,
			r: 20,
			sDeg: 0,
			eDeg: 50,
			style: "#2986cc",
		},
		{
			value: 150,
			name: "2月",
			x: 200,
			y: 200,
			r: 150,
			sDeg: 50,
			eDeg: 80,
			style: "#d8ae2d",
		},
		{
			value: 0,
			name: "",
			x: 200,
			y: 200,
			r: 90,
			sDeg: 50,
			eDeg: 80,
			style: "#5f9747",
		},
		{
			value: 0,
			name: "",
			x: 200,
			y: 200,
			r: 35,
			sDeg: 50,
			eDeg: 80,
			style: "#2986cc",
		},
		{
			value: 50,
			name: "3月",
			x: 200,
			y: 200,
			r: 50,
			sDeg: 80,
			eDeg: 150,
			style: "#d8ae2d",
		},
		{
			value: 0,
			name: "",
			x: 200,
			y: 200,
			r: 30,
			sDeg: 80,
			eDeg: 150,
			style: "#5f9747",
		},
		{
			value: 0,
			name: "",
			x: 200,
			y: 200,
			r: 10,
			sDeg: 80,
			eDeg: 150,
			style: "#2986cc",
		},
		{
			value: 80,
			name: "4月",
			x: 200,
			y: 200,
			r: 80,
			sDeg: 150,
			eDeg: 270,
			style: "#d8ae2d",
		},
		{
			value: 0,
			name: "",
			x: 200,
			y: 200,
			r: 60,
			sDeg: 150,
			eDeg: 270,
			style: "#5f9747",
		},
		{
			value: 0,
			name: "",
			x: 200,
			y: 200,
			r: 30,
			sDeg: 150,
			eDeg: 270,
			style: "#2986cc",
		},
		{
			value: 120,
			name: "5月",
			x: 200,
			y: 200,
			r: 120,
			sDeg: 270,
			eDeg: 360,
			style: "#d8ae2d",
		},
		{
			value: 0,
			name: "",
			x: 200,
			y: 200,
			r: 100,
			sDeg: 270,
			eDeg: 360,
			style: "#5f9747",
		},
		{
			value: 0,
			name: "",
			x: 200,
			y: 200,
			r: 90,
			sDeg: 270,
			eDeg: 360,
			style: "#2986cc",
		},
	];
	for (var j = 0; j < ob.length; j++) {
		total += parseInt(ob[j].value);
	}
	for (var i = 0; i < ob.length; i++) {
		var value_deg = ((ob[i].value / total) * 360 * Math.PI) / 180;
		var end_deg = begin_deg + value_deg;
		drawSector(
			ctx,
			ob[i].x,
			ob[i].y,
			ob[i].r,
			ob[i].sDeg * deg,
			ob[i].eDeg * deg
		);
		ctx.strokeStyle = "#fff";
		ctx.lineWidth = 3;
		ctx.stroke();
		ctx.fillStyle = ob[i].style;
		ctx.fill();

		var text_deg = begin_deg + value_deg / 1;
		var text_X = ob[i].x + (ob[i].r + 20) * Math.cos(text_deg);
		var text_Y = ob[i].y + (ob[i].r + 20) * Math.sin(text_deg);

		if (
			text_deg > (90 * Math.PI) / 180 &&
			text_deg < (270 * Math.PI) / 180
		) {
			ctx.textAlign = "end";
		}

		// 填入文字
		ctx.font = "16px Arial";
		ctx.fillStyle = "#fff";
		var text = ob[i].name;

		ctx.fillText(text, text_X, text_Y);
		begin_deg = end_deg;
	}
	// let ob = {
	// 	x: 200,
	// 	y: 200,
	// 	r: 50,
	// 	sDeg: 50,
	// 	eDeg: 190,
	// 	style: "pink",
	// };
	// drawSector(ctx, ob.x, ob.y, ob.r, ob.sDeg * deg, ob.eDeg * deg);
	// ctx.fill();
	// ctx.fillStyle = ob.style;
};
onMounted(() => {
	getCanvas();
});

const getTarget = () => {
	console.log(document.getElementById("canvas"));
};
</script>

<template>
	<div v-if="activeChart === 'TestChart2'" class="TestChart2">
		<div class="lineList">
			<div>
				<div class="drive"></div>
				<span style="color: rgb(216, 174, 45)">欣欣客運</span>
			</div>
			<div>
				<div class="drive2"></div>
				<span style="color: rgb(95, 151, 71)">首都客運</span>
			</div>
			<div>
				<div class="drive3"></div>
				<span style="color: rgb(42, 134, 204)">台北客運</span>
			</div>
		</div>
		<canvas
			@click="getTarget"
			id="canvas"
			ref="test"
			width="400"
			height="400"
		></canvas>
		<!-- <apexchart
			width="100%"
			type="polarArea"
			:options="chartOptions"
			:series="parsedSeries"
			@dataPointSelection="handleDataSelection"
		>
		</apexchart> -->
	</div>
</template>

<style scoped lang="scss">
.TestChart2 {
	height: 100%;
	width: 100%;
	display: flex;
	justify-content: center;
	align-items: center;
	position: relative;
	overflow-y: visible;
	.lineList {
		display: flex;
		flex-direction: column;
		width: 150px;
		font-size: 10px;
		gap: 5px;
		div {
			display: flex;
			align-items: center;
			white-space: nowrap;
		}
		.drive {
			width: 30px;
			height: 10px;
			border-radius: 10px;
			background-color: rgb(216, 174, 45);
			margin-right: 5px;
		}
		.drive2 {
			width: 30px;
			height: 10px;
			border-radius: 10px;
			background-color: rgb(95, 151, 71);
			margin-right: 5px;
		}
		.drive3 {
			width: 30px;
			height: 10px;
			border-radius: 10px;
			background-color: rgb(42, 134, 204);
			margin-right: 5px;
		}
	}
}
</style>
