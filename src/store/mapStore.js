// Cleaned

/* mapStore */
/*
The mapStore controls the map and includes methods to modify it.

!! PLEASE BE SURE TO REFERENCE THE MAPBOX DOCUMENTATION IF ANYTHING IS UNCLEAR !!
https://docs.mapbox.com/mapbox-gl-js/guides/
*/
import { createApp, defineComponent, nextTick, ref } from "vue";
import { defineStore } from "pinia";
import { useAuthStore } from "./authStore";
import mapboxGl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import axios from "axios";
import { Threebox } from "threebox-plugin";

import mapStyle from "../assets/configs/mapbox/mapStyle.js";
import {
	MapObjectConfig,
	TaipeiTown,
	TaipeiVillage,
	TaipeiBuilding,
	maplayerCommonPaint,
	maplayerCommonLayout,
} from "../assets/configs/mapbox/mapConfig.js";
import { savedLocations } from "../assets/configs/mapbox/savedLocations.js";
import { calculateGradientSteps } from "../assets/configs/mapbox/arcGradient";
import MapPopup from "../components/map/MapPopup.vue";

const { BASE_URL } = import.meta.env;

export const useMapStore = defineStore("map", {
	state: () => ({
		// Array of layer IDs that are in the map
		currentLayers: [],
		// Array of layer IDs that are in the map and currently visible
		currentVisibleLayers: [],
		// Stores all map configs for all layers (to be used to render popups)
		mapConfigs: {},
		// Stores the mapbox map instance
		map: null,
		// Stores popup information
		popup: null,
		// Stores saved locations
		savedLocations: savedLocations,
		// Store currently loading layers,
		loadingLayers: [],
		// 是否顯示地圖圖層時間選擇
		mapLayerTimeSeletor: false,
		threeboxModelSource: null,
		nowData: null
	}),
	getters: {},
	actions: {
		/* Initialize Mapbox */
		// 1. Creates the mapbox instance and passes in initial configs
		initializeMapBox() {
			this.map = null;
			const MAPBOXTOKEN = import.meta.env.VITE_MAPBOXTOKEN;
			mapboxGl.accessToken = MAPBOXTOKEN;
			this.map = new mapboxGl.Map({
				...MapObjectConfig,
				style: mapStyle,
			});
			this.map.addControl(new mapboxGl.NavigationControl());
			this.map.doubleClickZoom.disable();
			this.map
				.on("style.load", () => {
					this.initializeBasicLayers();
				})
				.on("click", (event) => {
					if (this.popup) {
						this.popup = null;
					}
					this.addPopup(event);
				})
				.on("idle", () => {
					this.loadingLayers = this.loadingLayers.filter(
						(el) => el !== "rendering"
					);
				});
		},
		// 2. Adds three basic layers to the map (Taipei District, Taipei Village labels, and Taipei 3D Buildings)
		// Due to performance concerns, Taipei 3D Buildings won't be added in the mobile version
		initializeBasicLayers() {
			const authStore = useAuthStore();
			fetch(`${BASE_URL}/mapData/taipei_town.geojson`)
				.then((response) => response.json())
				.then((data) => {
					this.map
						.addSource("taipei_town", {
							type: "geojson",
							data: data,
						})
						.addLayer(TaipeiTown);
				});
			fetch(`${BASE_URL}/mapData/taipei_village.geojson`)
				.then((response) => response.json())
				.then((data) => {
					this.map
						.addSource("taipei_village", {
							type: "geojson",
							data: data,
						})
						.addLayer(TaipeiVillage);
				});
			if (!authStore.isMobileDevice) {
				this.map
					.addSource("taipei_building_3d_source", {
						type: "vector",
						url: import.meta.env.VITE_MAPBOXTILE,
					})
					.addLayer(TaipeiBuilding);
			}

			this.addSymbolSources();
		},
		// 3. Adds symbols that will be used by some map layers
		// init時 也匯入marker圖片
		addSymbolSources() {
			const images = [
				"metro",
				"triangle_green",
				"triangle_white",
				"bike_green",
				"bike_orange",
				"bike_red",
			];
			images.forEach((element) => {
				this.map.loadImage(
					`${BASE_URL}/images/map/${element}.png`,
					(error, image) => {
						if (error) throw error;
						this.map.addImage(element, image);
					}
				);
			});
		},

		/* Adding Map Layers */
		// 1. Passes in the map_config (an Array of Objects) of a component and adds all layers to the map layer list
		// ComponentMapChart的switch，開關每個components的圖層（content.map_config）
		addToMapLayerList(map_config) {
			map_config.forEach((element) => {
				let mapLayerId = `${element.index}-${element.type}`;
				// 1-1. If the layer exists, simply turn on the visibility and add it to the visible layers list
				if (
					this.currentLayers.find((element) => element === mapLayerId)
				) {
					this.loadingLayers.push("rendering");
					this.turnOnMapLayerVisibility(mapLayerId);
					if (
						!this.currentVisibleLayers.find(
							(element) => element === mapLayerId
						)
					) {
						this.currentVisibleLayers.push(mapLayerId);
					}
					return;
				}
				let appendLayerId = { ...element };
				appendLayerId.layerId = mapLayerId;
				// 1-2. If the layer doesn't exist, call an API to get the layer data
				// 沒有曾載入過的layers 再從本地撈
				this.loadingLayers.push(appendLayerId.layerId);
				this.fetchLocalGeoJson(appendLayerId);
			});
		},
		// 2. Call an API to get the layer data
		fetchLocalGeoJson(map_config) {
			// geojson檔名跟component map_config的index要一致
			console.log(map_config)
			axios
				.get(`${BASE_URL}/mapData/${map_config.index}.geojson`)
				.then((rs) => {
					// console.log(rs)
					this.addMapLayerSource(map_config, rs.data);
				})
				.catch((e) => console.error(e));
		},
		// 3. Add the layer data as a source in mapbox
		addMapLayerSource(map_config, data) {
			this.map.addSource(`${map_config.layerId}-source`, {
				type: "geojson",
				data: { ...data },
			});
			// 這邊加入其他地圖類型（如果要新增mapbox沒有支援的）
			if (map_config.type === "arc") {
				this.AddArcMapLayer(map_config, data);
			} else if (map_config.type === "3DRoute") {
				// 3D 路線
				this.Add3DRouteLayer(map_config, data, this.threeboxModelSource);
			} else {
				this.addMapLayer(map_config);
			}
		},
		// 4-1. Using the mapbox source and map config, create a new layer
		// The styles and configs can be edited in /assets/configs/mapbox/mapConfig.js
		addMapLayer(map_config) {
			let extra_paint_configs = {};
			let extra_layout_configs = {};
			if (map_config.icon) {
				extra_paint_configs = {
					...maplayerCommonPaint[
						`${map_config.type}-${map_config.icon}`
					],
				};
				extra_layout_configs = {
					...maplayerCommonLayout[
						`${map_config.type}-${map_config.icon}`
					],
				};
			}
			if (map_config.size) {
				extra_paint_configs = {
					...extra_paint_configs,
					...maplayerCommonPaint[
						`${map_config.type}-${map_config.size}`
					],
				};
				extra_layout_configs = {
					...extra_layout_configs,
					...maplayerCommonLayout[
						`${map_config.type}-${map_config.size}`
					],
				};
			}
			console.log(extra_paint_configs)
			console.log(extra_layout_configs)
			this.loadingLayers.push("rendering");
			this.map.addLayer({
				id: map_config.layerId,
				type: map_config.type,
				paint: {
					...maplayerCommonPaint[`${map_config.type}`],
					...extra_paint_configs,
					...map_config.paint,
				},
				layout: {
					...maplayerCommonLayout[`${map_config.type}`],
					...extra_layout_configs,
				},
				source: `${map_config.layerId}-source`,
			});
			this.currentLayers.push(map_config.layerId);
			this.mapConfigs[map_config.layerId] = map_config;
			this.currentVisibleLayers.push(map_config.layerId);
			this.loadingLayers = this.loadingLayers.filter(
				(el) => el !== map_config.layerId
			);
		},
		// 4-2. Add Map Layer for Arc Maps
		AddArcMapLayer(map_config, data) {
			const authStore = useAuthStore();
			const lines = [...JSON.parse(JSON.stringify(data.features))];
			const arcInterval = 20;

			this.loadingLayers.push("rendering");

			for (let i = 0; i < lines.length; i++) {
				let line = [];
				let lngDif =
					lines[i].geometry.coordinates[1][0] -
					lines[i].geometry.coordinates[0][0];
				let lngInterval = lngDif / arcInterval;
				let latDif =
					lines[i].geometry.coordinates[1][1] -
					lines[i].geometry.coordinates[0][1];
				let latInterval = latDif / arcInterval;

				let maxElevation =
					Math.pow(Math.abs(lngDif * latDif), 0.5) * 80000;

				for (let j = 0; j < arcInterval + 1; j++) {
					let waypointElevation =
						Math.sin((Math.PI * j) / arcInterval) * maxElevation;
					line.push([
						lines[i].geometry.coordinates[0][0] + lngInterval * j,
						lines[i].geometry.coordinates[0][1] + latInterval * j,
						waypointElevation,
					]);
				}

				lines[i].geometry.coordinates = [...line];
			}

			const tb = (window.tb = new Threebox(
				this.map,
				this.map.getCanvas().getContext("webgl"), //get the context from the map canvas
				{ defaultLights: true }
			));

			const delay = authStore.isMobileDevice ? 2000 : 500;
			console.log(lines)
			setTimeout(() => {
				this.map.addLayer({
					id: map_config.layerId,
					type: "custom",
					renderingMode: "3d",
					onAdd: function () {
						const paintSettings = map_config.paint
							? map_config.paint
							: { "arc-color": ["#ffffff"] };
						const gradientSteps = calculateGradientSteps(
							paintSettings["arc-color"][0],
							paintSettings["arc-color"][1]
								? paintSettings["arc-color"][1]
								: paintSettings["arc-color"][0],
							arcInterval + 1
						);
						for (let line of lines) {
							let lineOptions = {
								geometry: line.geometry.coordinates,
								color: 0xffffff,
								width: paintSettings["arc-width"]
									? paintSettings["arc-width"]
									: 2,
								opacity:
									paintSettings["arc-opacity"] ||
									paintSettings["arc-opacity"] === 0
										? paintSettings["arc-opacity"]
										: 0.5,
							};

							let lineMesh = tb.line(lineOptions);
							lineMesh.geometry.setColors(gradientSteps);
							lineMesh.material.vertexColors = true;

							tb.add(lineMesh);
						}
					},
					render: function () {
						tb.update(); //update Threebox scene
					},
				});
				this.currentLayers.push(map_config.layerId);
				this.mapConfigs[map_config.layerId] = map_config;
				this.currentVisibleLayers.push(map_config.layerId);
				this.loadingLayers = this.loadingLayers.filter(
					(el) => el !== map_config.layerId
				);
			}, delay);
		},
		//  5. Turn on the visibility for a exisiting map layer
		turnOnMapLayerVisibility(mapLayerId) {
			this.map.setLayoutProperty(mapLayerId, "visibility", "visible");
		},
		// 6. Turn off the visibility of an exisiting map layer but don't remove it completely
		turnOffMapLayerVisibility(map_config) {
			map_config.forEach((element) => {
				let mapLayerId = `${element.index}-${element.type}`;
				this.loadingLayers = this.loadingLayers.filter(
					(el) => el !== mapLayerId
				);

				if (this.map.getLayer(mapLayerId)) {
					this.map.setFilter(mapLayerId, null);
					this.map.setLayoutProperty(
						mapLayerId,
						"visibility",
						"none"
					);
				}
				this.currentVisibleLayers = this.currentVisibleLayers.filter(
					(element) => element !== mapLayerId
				);
			});
			this.removePopup();
		},

		/* Popup Related Functions */
		// Adds a popup when the user clicks on a item. The event will be passed in.
		addPopup(event) {
			// Gets the info that is contained in the coordinates that the user clicked on (only visible layers)
			const clickFeatureDatas = this.map.queryRenderedFeatures(
				event.point,
				{
					layers: this.currentVisibleLayers,
				}
			);
			// Return if there is no info in the click
			if (!clickFeatureDatas || clickFeatureDatas.length === 0) {
				return;
			}
			// Parse clickFeatureDatas to get the first 3 unique layer datas, skip over already included layers
			const mapConfigs = [];
			const parsedPopupContent = [];
			let previousParsedLayer = "";

			for (let i = 0; i < clickFeatureDatas.length; i++) {
				if (mapConfigs.length === 3) break;
				if (previousParsedLayer === clickFeatureDatas[i].layer.id)
					continue;
				previousParsedLayer = clickFeatureDatas[i].layer.id;
				mapConfigs.push(this.mapConfigs[clickFeatureDatas[i].layer.id]);
				parsedPopupContent.push(clickFeatureDatas[i]);
			}
			// Create a new mapbox popup
			this.popup = new mapboxGl.Popup()
				.setLngLat(event.lngLat)
				.setHTML('<div id="vue-popup-content"></div>')
				.addTo(this.map);
			// Mount a vue component (MapPopup) to the id "vue-popup-content" and pass in data
			const PopupComponent = defineComponent({
				extends: MapPopup,
				setup() {
					// Only show the data of the topmost layer
					return {
						popupContent: parsedPopupContent,
						mapConfigs: mapConfigs,
						activeTab: ref(0),
					};
				},
			});
			// This helps vue determine the most optimal time to mount the component
			nextTick(() => {
				const app = createApp(PopupComponent);
				app.mount("#vue-popup-content");
			});
		},
		// Remove the current popup
		removePopup() {
			if (this.popup) {
				this.popup.remove();
			}
			this.popup = null;
		},

		/* Functions that change the viewing experience of the map */

		// Add new saved location that users can quickly zoom to
		addNewSavedLocation(name) {
			const coordinates = this.map.getCenter();
			const zoom = this.map.getZoom();
			const pitch = this.map.getPitch();
			const bearing = this.map.getBearing();
			this.savedLocations.push([coordinates, zoom, pitch, bearing, name]);
		},
		// Zoom to a location
		// [[lng, lat], zoom, pitch, bearing, savedLocationName]
		easeToLocation(location_array) {
			this.map.easeTo({
				center: location_array[0],
				zoom: location_array[1],
				duration: 4000,
				pitch: location_array[2],
				bearing: location_array[3],
			});
		},
		// Remove a saved location
		removeSavedLocation(index) {
			this.savedLocations.splice(index, 1);
		},
		// Force map to resize after sidebar collapses
		resizeMap() {
			if (this.map) {
				setTimeout(() => {
					this.map.resize();
				}, 200);
			}
		},

		/* Map Filtering */
		// Add a filter based on a property on a map layer
		addLayerFilter(layer_id, property, key, map_config) {
			if (!this.map) {
				return;
			}
			if (map_config && map_config.type === "arc") {
				this.map.removeLayer(layer_id);
				let toBeFiltered = {
					...this.map.getSource(`${layer_id}-source`)._data,
				};
				toBeFiltered.features = toBeFiltered.features.filter(
					(el) => el.properties[property] === key
				);
				map_config.layerId = layer_id;
				this.AddArcMapLayer(map_config, toBeFiltered);
				return;
			} else if (map_config && map_config.type === "3DRoute") {
				// #3DRoute類型圖層 過濾
				this.map.removeLayer(layer_id)
				let toBeFiltered = {
					...this.map.getSource(`${layer_id}-source`)._data,
				}
				if (key.length == 1) {
					toBeFiltered.features = toBeFiltered.features.filter(
						(el) => el.properties.model[property] === key[0]
					)
				} else {
					// 顯示其他
					toBeFiltered.features = toBeFiltered.features.filter((el) => {
						const routeName = el.properties.model.routeName
						return !key.includes(routeName)
					})
				}
				map_config.layerId = layer_id
				this.Add3DRouteLayer(map_config, toBeFiltered, this.threeboxModelSource)
				return
			}
			this.map.setFilter(layer_id, ["==", ["get", property], key]);
		},
		// Remove any filters on a map layer
		clearLayerFilter(layer_id, map_config) {
			if (!this.map) {
				return;
			}
			if (map_config && map_config.type === "arc") {
				this.map.removeLayer(layer_id);
				let toRestore = {
					...this.map.getSource(`${layer_id}-source`)._data,
				};
				map_config.layerId = layer_id;
				this.AddArcMapLayer(map_config, toRestore);
				return;
			}
			this.map.setFilter(layer_id, null);
		},

		/* Clearing the map */

		// Called when the user is switching between maps
		clearOnlyLayers() {
			this.currentLayers.forEach((element) => {
				this.map.removeLayer(element);
				this.map.removeSource(`${element}-source`);
			});
			this.currentLayers = [];
			this.mapConfigs = {};
			this.currentVisibleLayers = [];
			this.removePopup();
		},
		// Called when user navigates away from the map
		clearEntireMap() {
			this.currentLayers = [];
			this.mapConfigs = {};
			this.map = null;
			this.currentVisibleLayers = [];
			this.removePopup();
		},

		// 顯示地圖圖層時間軸控制
		showSelectTimeLayer(data) {
			console.log(data.map_config[0].selectChildren)
			this.nowData = data
			this.mapLayerTimeSeletor = true
		},
		removeSelectTimeLayer() {
			this.mapLayerTimeSeletor = false
		},
		selectFilter(hour) {
			const filterDay = ['!=', ['string', ['get', 'Day']], 'placeholder']
			const filterHour = ['==', ['number', ['get', 'Hour']], parseInt(hour)]
			this.map.setFilter('collisions1601-circle', ['all', filterHour, filterDay])
		},
		Add3DRouteLayer(map_config, data, car) {
			// this.loadingLayers.push("rendering")
		
			// 該路線資料座標（lineString）, 根據資料暫時取第一筆lineString
			// const lineStringSource = data.features[4].geometry.coordinates
			// console.log(data.features)
			const allRoutes = data.features
			const tb = (window.tb = new Threebox(
				this.map,
				this.map.getCanvas().getContext("webgl"),
				{ defaultLights: true }
			))
			
			let origin = [121.513828586866, 24.9871915611334]
			let destination, line
			
			this.map.addLayer({
				id: map_config.layerId,
				type: "custom",
				renderingMode: "3d",
				onAdd: function () {
					let duration = 1000000

					for (let route of allRoutes) {
						let lineOptions = {
							animation: 1,
							path: route.geometry.coordinates,
							duration: duration
						}
						let lineGeometry = lineOptions.path
							.map(function (coordinate) {
								return coordinate.concat([15])
							})
						let line = tb.line({
							geometry: lineGeometry,
							width: 5,
							color: map_config.paint.routeLineColor
						})
						tb.add(line)
						let options = {
							obj: '../model/car03.gltf',
							type: 'gltf',
							scale: 100,
							units: 'meters',
							rotation: { x: 90, y: 0, z: 0 },
							anchor: 'center'//default rotation
						}
						tb.loadObj(options, function (model) {
							car = model.setCoords(origin)
							tb.add(car)
							car.followPath(
								lineOptions,
								function () {
									// tb.remove(line)
								}
							)
							car.playAnimation(lineOptions)
						})
					}
				},
				render: function () {
					tb.update(); //update Threebox scene
				},
			})
			this.currentLayers.push(map_config.layerId);
			this.mapConfigs[map_config.layerId] = map_config;
			this.currentVisibleLayers.push(map_config.layerId);
			this.loadingLayers = this.loadingLayers.filter(
				(el) => el !== map_config.layerId
			)
			// const lineString = 'LINESTRING (121.579388009341 24.9983926636233, 121.580275522518 24.9989422759018, 121.580406183458 24.9987904572431, 121.579460869496 24.9982010775982, 121.57802903382 24.9973419306229, 121.574997116392 24.9955330434896, 121.574483102128 24.9952221121583, 121.574140944533 24.9950055432305, 121.573997314857 24.9947797574212, 121.573916532508 24.9945394907553, 121.573908044157 24.9944265377389, 121.573718356608 24.9921240588593, 121.573726 24.9917196455951, 121.574024471747 24.9916974050652, 121.574604865215 24.9918276202752, 121.575213 24.991953, 121.575463049387 24.9919631387287, 121.57569014567 24.9919367594268, 121.576008364785 24.991834280225, 121.576410336962 24.9915727342012, 121.576640827485 24.9913528982215, 121.576817898911 24.9910407848635, 121.576856663038 24.9909012019924, 121.576880633466 24.989421866388, 121.576899285456 24.9892549602483, 121.577048326076 24.9886594834459, 121.576879441019 24.9886088597053, 121.576714887988 24.9885330693889, 121.576535030849 24.9884181956011, 121.576393388324 24.9883160524435, 121.576012269569 24.9879821487366, 121.575682618456 24.9876512643166, 121.574259399675 24.9879101365371, 121.573614055467 24.9880599999858, 121.573396551064 24.988096694253, 121.573208258684 24.9881144545689, 121.573031932608 24.9881150496008, 121.572852775012 24.9880565041622, 121.571770300147 24.9876368587633, 121.571542580603 24.9875885032436, 121.570671876101 24.9877212148495, 121.570677315191 24.986567272289, 121.569605227367 24.9867278454232, 121.569002170281 24.9867735835778, 121.56830539035 24.9868218954289, 121.568554794083 24.9871538727235, 121.568564539139 24.9876360247313, 121.568631033696 24.9883247440695, 121.568479134785 24.9888692398624, 121.567977259155 24.9887566351802, 121.566458814917 24.9885087006211, 121.565275820633 24.9883296695458, 121.564942393156 24.9883741762343, 121.564390594421 24.9885358803328, 121.563884388543 24.9887262812928, 121.563117663038 24.9890414049921, 121.56283412391 24.9889694265995, 121.562492022811 24.9889146448658, 121.56063272514 24.9887153274481, 121.560114528253 24.9887070746745, 121.559817 24.989312, 121.559716663038 24.9895196552248, 121.55949185919 24.9901624356556, 121.559260484174 24.9904361838361, 121.558929898911 24.990944227034, 121.55868943805 24.9915767089204, 121.558580539139 24.9921470000036, 121.558596884894 24.992430999275, 121.558686168481 24.9927333796194, 121.558972303266 24.9933638977418, 121.559362134785 24.994104379459, 121.559495987719 24.9945132953227, 121.559613078278 24.995313594829, 121.559966486253 24.9962239521306, 121.559864638419 24.9967455833113, 121.559698347847 24.9971403075912, 121.559495639151 24.9974549584366, 121.558879852251 24.9980061550745, 121.557898281495 24.9989908851424, 121.556209168837 25.0000656212824, 121.555773494557 25.000305674455, 121.554704207758 25.0007630858698, 121.552957175452 25.0013765160148, 121.552251966304 25.0016182964077, 121.551693157595 25.0017919447668, 121.551422888026 25.0017930268017, 121.551213684087 25.0016924930248, 121.550096898911 25.0008816480084, 121.549843107167 25.000757533523, 121.548966843444 25.0005453520919, 121.548782811662 25.0004554058394, 121.548209968383 25.0000128261324, 121.54745 24.9994188634919, 121.547024943493 24.9991859691468, 121.546325435972 24.9989448806237, 121.545031031617 24.9986149900759, 121.544715381544 24.9985589422102, 121.544421314151 24.9985646474012, 121.544295741316 24.998750026359, 121.543785370658 24.9997690265062, 121.543482326076 25.0002436446046, 121.543135219244 25.0005753491882, 121.542632775012 25.0011638106832, 121.542058673924 25.0018642160877, 121.540654572835 25.0039056216831, 121.540452629342 25.0040477031249, 121.540210326958 25.0041322631284, 121.539781671868 25.0041955623951, 121.539506342209 25.0042353397564, 121.539362949314 25.0042654163179, 121.538662571796 25.0043821076254, 121.538907741316 25.0057990273881, 121.538925036181 25.0061618945624, 121.538883579877 25.0064376894274, 121.538779503621 25.0067997194409, 121.538630257644 25.0071138782927, 121.538437389153 25.0074392240551, 121.538185474738 25.0078657625409, 121.537873017313 25.0083948117292, 121.537623050206 25.0089193071437, 121.537389842405 25.009564, 121.537159246759 25.010483783156, 121.537116609983 25.0108718991168, 121.536979002442 25.0109202686507, 121.53686363119 25.0110693706629, 121.536856827962 25.0112510946858, 121.536915111974 25.0113839047637, 121.536470102462 25.0121874329032, 121.536035111974 25.0129225763185, 121.535762699404 25.0132967660179, 121.534332067235 25.0146418580095, 121.53273514567 25.0161892173459, 121.531656405124 25.0172163511708, 121.530329823115 25.0185232566551, 121.528060884908 25.0207278012206, 121.527321078278 25.0213512872918, 121.526495649479 25.0220651774255, 121.525483505443 25.0229648717669, 121.52509028934 25.0233934798353, 121.52471414567 25.0238659999977, 121.52425914567 25.0244868266791, 121.52352898203 25.0255151910721, 121.52260640873 25.0267269911948, 121.521908101089 25.027644218352, 121.520943460861 25.0289512126474, 121.520164587653 25.0300398633656, 121.519149393469 25.0315113750774, 121.517400113726 25.0338054567853, 121.516718010886 25.0347319976771, 121.516131314151 25.034795097458, 121.514689660959 25.0349598815057, 121.514742852251 25.035239219018, 121.514795043542 25.0354570891712, 121.514885931568 25.0355310256494, 121.515003673924 25.0355768762041, 121.5150195853 25.0362273720847, 121.515071067392 25.037812, 121.51509962361 25.0380140854689, 121.515151316287 25.0382568425115, 121.515540888026 25.039599689186, 121.516040898911 25.041244089253, 121.516604101089 25.043337934234, 121.514990336962 25.0433779776439, 121.513208567638 25.0434395784134, 121.513224886727 25.045186178087, 121.513233303266 25.0460157597544, 121.515004701931 25.0459978283318, 121.514985769324 25.045162115009, 121.515010977189 25.0434334394792, 121.516691595646 25.0433920328927, 121.516096701852 25.0412220413436, 121.515600393469 25.0395782380371, 121.515215457229 25.0382418815486, 121.515161388454 25.038006733193, 121.515140663038 25.0378248128308, 121.515085232941 25.036206240563, 121.515067696734 25.0355878477208, 121.5151802837 25.0355186398136, 121.515291990154 25.035413279475, 121.515291114053 25.0352670893878, 121.51526602385 25.0351185276438, 121.515248652153 25.0349919025057, 121.516127898911 25.034890372195, 121.516812133745 25.034849708736, 121.517496717344 25.0338784197746, 121.518424154012 25.0326816299192, 121.519301921722 25.0316225002286, 121.520318985835 25.0300948581489, 121.521055819594 25.0290146307767, 121.522022525135 25.0276849921699, 121.522730569171 25.0268086042284, 121.523687270496 25.0255599218885, 121.524395 25.024557, 121.524834663038 25.0239647819738, 121.525153797823 25.02354, 121.525603696734 25.0230391282174, 121.526644764127 25.0221400094668, 121.527455583721 25.0214232781225, 121.528193029605 25.0208061155542, 121.530487531718 25.0186052258832, 121.531831696734 25.0172961593031, 121.532862403315 25.0162493644528, 121.534459186428 25.014732195997, 121.535849565143 25.0134265558795, 121.536194663038 25.012984708091, 121.536654758798 25.0122834055603, 121.537111359773 25.0114791693668, 121.537313617092 25.0114452071084, 121.537464473202 25.0113209128631, 121.537503412645 25.0111594908527, 121.537463165325 25.0110161539855, 121.5372864356 25.0108659413593, 121.5373804744 25.0103269291016, 121.537577427165 25.0096035385278, 121.537811617081 25.00897255564, 121.538054076199 25.0084955026083, 121.538354751162 25.0079727643716, 121.538623661999 25.0075482635822, 121.538799347847 25.0072218123369, 121.538945235873 25.0068636047026, 121.539049494557 25.0064720452629, 121.539096090203 25.006156158622, 121.539080191292 25.0057858109543, 121.538827966304 25.0043999468282, 121.539388972152 25.0043176687817, 121.539524158635 25.0043469456519, 121.539778861427 25.0043160375822, 121.540237689326 25.00422699431, 121.54049687714 25.0041334325751, 121.540747595646 25.0039687566128, 121.542162168481 25.0019048391337, 121.543229381544 25.0006614113855, 121.543570361772 25.0002750764115, 121.543905528253 24.9997695681957, 121.544438528253 24.9987297001544, 121.544698685849 24.9986645157042, 121.545025033696 24.9987119473219, 121.546281496343 24.9990500934782, 121.54690519441 24.9992607980177, 121.54733785433 24.9994671672402, 121.548084842405 25.0000637309812, 121.548751718506 25.0005316479306, 121.548897347847 25.0006209733858, 121.549790673924 25.0008440000025, 121.550066932608 25.0009743252975, 121.55115414567 25.0017608643336, 121.551338370658 25.0018573785517, 121.551526528253 25.0019105410084, 121.551728652153 25.001901378547, 121.552261067392 25.0017279464254, 121.552999873309 25.0014741568215, 121.554765049091 25.0008495652284, 121.555803067392 25.0003981095856, 121.556209365205 25.0001764103321, 121.557997978229 24.9990561320369, 121.558984247798 24.9980575685061, 121.559607753241 24.9975018625312, 121.55980643805 24.9971948762234, 121.559981216329 24.9967844035485, 121.560097427165 24.9962210259873, 121.559759484712 24.9952793085669, 121.559599831519 24.9944708102924, 121.55943319454 24.9940443549406, 121.559066135287 24.9933013429516, 121.558809123899 24.9926766458515, 121.55871410908 24.9924327107075, 121.558693663038 24.9921354304734, 121.558803191292 24.9916218734614, 121.559047764127 24.9909397092403, 121.559374413927 24.990467587711, 121.559529427165 24.9902893940981, 121.559864642963 24.9894822256962, 121.560240551064 24.9887617850937, 121.560647867767 24.9887794489643, 121.562468494557 24.9889983551259, 121.563127393469 24.9891240902534, 121.56392546636 24.9887699121162, 121.564493791899 24.9885657226379, 121.564973893116 24.9884313326344, 121.565254460861 24.9883897602653, 121.566446766726 24.9885672156467, 121.567962743658 24.9888209019791, 121.568541696734 24.988917785038, 121.568690528253 24.9883380335414, 121.568608 24.9876612395782, 121.569152270003 24.9876449598651, 121.569815083953 24.9877065615464, 121.570362085291 24.9877850534171, 121.570637 24.987775, 121.571562966304 24.9876575208555, 121.571745776485 24.9876877654594, 121.572835336962 24.9881108099218, 121.573059583573 24.9881728705869, 121.573227033696 24.9881734049613, 121.573443557834 24.9881574310211, 121.573653023629 24.9881147605206, 121.574261045197 24.9879664134143, 121.576171300781 24.9876062629239, 121.575986238277 24.9880361819503, 121.576343267912 24.9883500990092, 121.576509568643 24.9884812811082, 121.576683465914 24.9885918735023, 121.576841323108 24.9886588010453, 121.57696246581 24.9886946243292, 121.576828793867 24.9892444099247, 121.576808601687 24.9894161891244, 121.57679524242 24.9908961711559, 121.576762370658 24.9910284302908, 121.576609097054 24.991284594248, 121.57639726957 24.9915216202273, 121.57600241197 24.9917670039177, 121.575742347847 24.9918682152147, 121.575483079461 24.99190594832, 121.575203067392 24.991898240569, 121.574643771855 24.9917615598015, 121.57404143805 24.9916562405141, 121.573633606531 24.9915774177652, 121.57364879944 24.9921442912917, 121.573732811085 24.9932805059628, 121.573843561651 24.9944442626585, 121.573856539139 24.9945975154418, 121.573893877177 24.9948407605715, 121.574044381544 24.9951126981517, 121.574442805536 24.9954341849235, 121.574920116552 24.9957043909696, 121.577997303389 24.9975504270924, 121.579385640228 24.9983894632545)'
			// const result = this.transform(lineString)
			// console.log(result)
		},
		fetchFunction(url, cb) {
			fetch(url)
						.then(
				function (response) {
					if (response.status === 200) {
						response.json()
							.then(function (data) {
								cb(data)
							})
					}
				}
			)
		},
		transform(lineString) {
			const coordinatesString = lineString.replace(/LINESTRING \((.*?)\)/, '$1');
			const coordinatePairs = coordinatesString.split(', ');
			const coordinatesArray = coordinatePairs.map(pair => {
				const [longitude, latitude] = pair.split(' ').map(Number);
				return [longitude, latitude];
			});

			return coordinatesArray;
		},
		selectFilterBus(month) {
			const cond = this.nowData.map_config[0].selectChildren
			const idx = cond.findIndex(el => month == el.Month)
			this.addLayerFilter2('test_route-3DRoute', 'RouteName', cond[idx].Route_Green, this.nowData.map_config[0], month)
		},
		addLayerFilter2(layer_id, property, key, map_config, month) {
			this.map.removeLayer(layer_id)
			let toBeFiltered = {
				...this.map.getSource(`${layer_id}-source`)._data,
			}
			toBeFiltered.features = toBeFiltered.features.filter((el) => {
				const routeName = el.properties.model.RouteName
				return key.includes(routeName)
			})
			map_config.layerId = layer_id
			this.Add3DRouteLayer(map_config, toBeFiltered, this.threeboxModelSource)
		}
	},
});
