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
		threeboxModelSource: null
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
				console.log('sdd', map_config)
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
		showSelectTimeLayer() {
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
			console.log(map_config)
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
			// const lineString = 'LINESTRING (121.625813 25.059209, 121.627575 25.060679, 121.628098 25.061084, 121.62975 25.062226, 121.633158 25.064452, 121.635331 25.065702, 121.635854 25.066122, 121.637716 25.068095, 121.638028 25.068527, 121.6383 25.068739, 121.639021 25.069623, 121.639069 25.069754, 121.639081 25.069911, 121.639025 25.070064, 121.638831 25.069849, 121.638563 25.069742, 121.637761 25.069522, 121.636483 25.069292, 121.635311 25.068491, 121.635354 25.068271, 121.634098 25.06707, 121.633737 25.066796, 121.631639 25.065595, 121.629904 25.067498, 121.629682 25.067905, 121.624397 25.066848, 121.622587 25.066701, 121.619462 25.066443, 121.61829 25.066844, 121.61747 25.067929, 121.614081 25.068758, 121.612063 25.068823, 121.612042 25.069312, 121.611885 25.069717, 121.61154 25.070112, 121.611079 25.070514, 121.610297 25.071082, 121.608906 25.07187, 121.606125 25.073111, 121.605817 25.07294, 121.605477 25.072887, 121.604161 25.070961, 121.604122 25.070845, 121.604082 25.070752, 121.604049 25.070661, 121.604016 25.070561, 121.603983 25.070472, 121.603946 25.07039, 121.603907 25.070311, 121.603842 25.070236, 121.603816 25.070136, 121.603771 25.070054, 121.603718 25.06999, 121.603657 25.069942, 121.603606 25.069859, 121.603503 25.06982, 121.603322 25.069453, 121.603267 25.069384, 121.603205 25.069307, 121.603145 25.069234, 121.603084 25.069159, 121.603024 25.069085, 121.602969 25.069015, 121.602911 25.068943, 121.602845 25.068863, 121.602777 25.068782, 121.602713 25.068702, 121.60265 25.068622, 121.602591 25.068544, 121.60253 25.068479, 121.602459 25.068419, 121.602373 25.068359, 121.602287 25.068299, 121.60221 25.068231, 121.602126 25.068166, 121.602035 25.068104, 121.601956 25.068038, 121.601887 25.067972, 121.601821 25.067907, 121.601754 25.067845, 121.601675 25.067787, 121.601615 25.067724, 121.601577 25.067658, 121.601544 25.067599, 121.601512 25.067551, 121.601477 25.067505, 121.601445 25.067459, 121.60142 25.067417, 121.601391 25.067377, 121.601368 25.067359, 121.601354 25.067334, 121.601351 25.067332, 121.60135 25.067334, 121.601348 25.067334), (121.625835 25.05917, 121.627599 25.060641, 121.628131 25.061055, 121.629776 25.062189, 121.633196 25.064433, 121.635334 25.065672, 121.63588 25.066106, 121.637755 25.068086, 121.638062 25.06852, 121.638323 25.068724, 121.639035 25.069619, 121.639083 25.069758, 121.639094 25.069916, 121.639029 25.070085, 121.638813 25.069863, 121.63856 25.069754, 121.638164 25.069648, 121.637757 25.069545, 121.636472 25.069316, 121.635276 25.068497, 121.635319 25.068282, 121.634085 25.0671, 121.633708 25.066814, 121.631652 25.065629, 121.629957 25.067527, 121.629752 25.06792, 121.624419 25.066858, 121.622581 25.066701, 121.61947 25.066445, 121.618287 25.066849, 121.617431 25.067992, 121.614064 25.068837, 121.612182 25.068906, 121.612166 25.069341, 121.611999 25.069751, 121.611654 25.070181, 121.611225 25.070582, 121.610399 25.07118, 121.609009 25.071939, 121.605688 25.073452, 121.604037 25.07103, 121.603919 25.070923, 121.603858 25.07084, 121.603798 25.070758, 121.603737 25.070674, 121.603675 25.07059, 121.603619 25.070505, 121.603559 25.070418, 121.603493 25.070332, 121.603433 25.070248, 121.603374 25.070165, 121.603317 25.07008, 121.603251 25.069995, 121.603184 25.069911, 121.603115 25.069833, 121.603045 25.069753, 121.602978 25.069673, 121.602918 25.069587, 121.602847 25.06951, 121.602775 25.069438, 121.602708 25.06936, 121.602639 25.069279, 121.602572 25.069198, 121.602506 25.06912, 121.602441 25.069043, 121.602065 25.068527, 121.602032 25.068442, 121.601983 25.068368, 121.601931 25.068316, 121.601894 25.068247, 121.601814 25.068174, 121.601749 25.068109, 121.6017 25.068059, 121.601654 25.068014, 121.601613 25.067958, 121.601587 25.067913, 121.601547 25.067877, 121.601521 25.067854, 121.601497 25.067807, 121.601467 25.067778, 121.601441 25.067746, 121.601407 25.067707, 121.601373 25.067663, 121.601345 25.067613, 121.601324 25.067564, 121.601284 25.06751, 121.601266 25.067449, 121.601195 25.067388, 121.60114 25.067333, 121.601087 25.067317, 121.601033 25.067287, 121.600996 25.067271, 121.600953 25.067264, 121.600947 25.067252, 121.600942 25.067251, 121.600938 25.067246, 121.600929 25.067252, 121.600913 25.067261, 121.600909 25.067243, 121.600885 25.067221, 121.600847 25.067195, 121.600803 25.067171, 121.600752 25.06715, 121.600697 25.067125, 121.600639 25.067085, 121.600572 25.067053, 121.600502 25.067015, 121.60042 25.06698, 121.60033 25.066951, 121.600235 25.066926, 121.600139 25.066912, 121.600043 25.066899, 121.599938 25.066889, 121.599826 25.066877, 121.599715 25.06687, 121.599599 25.066869, 121.599484 25.066872, 121.59937 25.066883, 121.599259 25.066897, 121.599152 25.066918, 121.599042 25.066942, 121.598935 25.066977, 121.598832 25.067014, 121.598727 25.06705, 121.598621 25.067091, 121.598537 25.067143, 121.598441 25.067202, 121.59834 25.067246, 121.598237 25.067297, 121.59814 25.067351, 121.598042 25.067415, 121.597946 25.067461, 121.597848 25.06751, 121.597749 25.067556, 121.597651 25.067604, 121.597549 25.067657, 121.597444 25.067711, 121.594977 25.068801, 121.594866 25.068838, 121.594659 25.068891, 121.59439 25.068929, 121.592888 25.06901, 121.592774 25.069017, 121.592661 25.069019, 121.59255 25.069013, 121.592436 25.069023, 121.592314 25.069024, 121.592206 25.069018, 121.5921 25.069023, 121.591987 25.069022, 121.591874 25.069015, 121.591773 25.069021, 121.59168 25.069043, 121.590791 25.069012, 121.590511 25.066522, 121.590506 25.066446, 121.590504 25.066364, 121.590499 25.066278, 121.590497 25.066189, 121.59049 25.066098, 121.590477 25.066011, 121.59045 25.06592, 121.590428 25.065823, 121.59041 25.065723, 121.590406 25.06562, 121.590385 25.065516, 121.590352 25.065409, 121.590325 25.065308, 121.590296 25.065216, 121.590272 25.065123, 121.590246 25.06503, 121.590227 25.064935, 121.590214 25.064831, 121.590216 25.064727, 121.590243 25.06463, 121.590286 25.064524, 121.59034 25.064424, 121.59039 25.064331, 121.590444 25.06423, 121.59049 25.064129, 121.590539 25.064031, 121.59058 25.06393, 121.590613 25.063832, 121.590639 25.063736, 121.590656 25.063632, 121.590673 25.063532, 121.590685 25.063434, 121.590696 25.063333, 121.590704 25.06323, 121.590714 25.063129, 121.590729 25.063024, 121.590741 25.062921, 121.590751 25.062818, 121.590758 25.062717, 121.590765 25.062615, 121.590775 25.062513, 121.590784 25.062411, 121.590798 25.062313, 121.590814 25.062213, 121.590831 25.062117, 121.590848 25.062019, 121.590866 25.061926, 121.590891 25.061835, 121.590918 25.061739, 121.59094 25.061638, 121.590962 25.061543, 121.591244 25.060644, 121.591549 25.059985, 121.5946 25.054711, 121.595559 25.0509, 121.592157 25.050067, 121.592111 25.050086, 121.592059 25.050095, 121.592002 25.050096, 121.591933 25.050086, 121.591862 25.050071, 121.591793 25.050058, 121.591719 25.050039, 121.591652 25.050028, 121.591591 25.050016, 121.591539 25.050008, 121.591494 25.050003, 121.591446 25.04999, 121.591409 25.049983, 121.591374 25.049972, 121.591345 25.049961, 121.591329 25.049955, 121.591315 25.04995, 121.591307 25.049947, 121.591297 25.049949, 121.591296 25.049949), (121.591296 25.04995, 121.591297 25.04995, 121.591296 25.049949, 121.591296 25.04995, 121.591295 25.04995, 121.591293 25.049948, 121.59129 25.049947, 121.591287 25.049945, 121.591282 25.049942, 121.591277 25.049932, 121.59127 25.049907, 121.591265 25.049873, 121.59127 25.04983, 121.591295 25.049797, 121.591337 25.049774, 121.59139 25.049772, 121.591439 25.049785, 121.591496 25.049802, 121.591561 25.049812, 121.591642 25.04983, 121.59172 25.04985, 121.591796 25.049867, 121.591872 25.04988, 121.59194 25.049894, 121.59201 25.04991, 121.592077 25.04993, 121.592134 25.049946, 121.592187 25.049966, 121.592235 25.049987, 121.592272 25.05001, 121.595677 25.050861, 121.594726 25.054743, 121.591669 25.060072, 121.591389 25.060678, 121.591105 25.061574, 121.591082 25.061676, 121.591059 25.061776, 121.591037 25.061877, 121.591016 25.061976, 121.590997 25.062075, 121.590977 25.062176, 121.59096 25.062275, 121.590946 25.062374, 121.590933 25.062477, 121.590922 25.062578, 121.590913 25.062679, 121.590904 25.062778, 121.590895 25.062882, 121.590882 25.062986, 121.59087 25.063091, 121.590859 25.063193, 121.590849 25.063292, 121.59084 25.063393, 121.59083 25.063495, 121.59082 25.063597, 121.590819 25.063697, 121.590823 25.0638, 121.59083 25.063901, 121.590841 25.064005, 121.590859 25.064107, 121.590884 25.064206, 121.590911 25.064299, 121.590945 25.064389, 121.590989 25.064481, 121.591028 25.064574, 121.591052 25.064666, 121.591063 25.064757, 121.591044 25.064845, 121.591015 25.064948, 121.590972 25.065042, 121.590921 25.065126, 121.590867 25.06521, 121.590808 25.065299, 121.590752 25.06539, 121.590705 25.065484, 121.590667 25.065581, 121.590639 25.065686, 121.590615 25.065787, 121.590599 25.065886, 121.590592 25.065988, 121.590585 25.066082, 121.590596 25.066187, 121.590608 25.066289, 121.590624 25.066391, 121.590641 25.066495, 121.590942 25.068861, 121.591622 25.068892, 121.591678 25.068893, 121.591745 25.068885, 121.591818 25.068878, 121.591898 25.068874, 121.591982 25.068872, 121.592063 25.068871, 121.592142 25.068868, 121.592223 25.068865, 121.592304 25.068866, 121.592381 25.068863, 121.592469 25.068877, 121.592545 25.068872, 121.592625 25.06887, 121.592706 25.068862, 121.59279 25.068854, 121.59288 25.068855, 121.592973 25.068853, 121.594363 25.068792, 121.594632 25.068748, 121.594823 25.068702, 121.594921 25.068664, 121.597392 25.067548, 121.597492 25.067499, 121.597591 25.067455, 121.59769 25.067411, 121.59779 25.067366, 121.597886 25.067322, 121.597985 25.067277, 121.598083 25.067234, 121.59818 25.067192, 121.598276 25.067147, 121.598372 25.067102, 121.598467 25.067059, 121.598561 25.067014, 121.598654 25.066972, 121.598751 25.066923, 121.598847 25.066878, 121.598944 25.066839, 121.599044 25.066809, 121.599151 25.066792, 121.599253 25.066768, 121.599355 25.066748, 121.599458 25.066737, 121.599562 25.066731, 121.599665 25.066727, 121.599766 25.066724, 121.599865 25.066728, 121.599964 25.066738, 121.600059 25.066744, 121.600153 25.066752, 121.600251 25.066761, 121.600349 25.066777, 121.600441 25.066804, 121.600522 25.066833, 121.600614 25.066862, 121.600692 25.066896, 121.600771 25.066929, 121.600856 25.06697, 121.600934 25.067009, 121.601003 25.067054, 121.601071 25.067097, 121.601134 25.067141, 121.601192 25.067187, 121.60125 25.067235, 121.601294 25.067271, 121.601323 25.06731, 121.601343 25.067328, 121.601348 25.067334, 121.601347 25.067334)'
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
		}
	},
});
