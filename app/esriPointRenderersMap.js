(function() {
	'use strict';
	angular.module('AngularEsriPlaygroundApp').controller('PointRenderersController', ['$scope', 'appConfig', function($scope, appConfig) {
		$scope.subtitle = appConfig.pointRenderers.subtitle;
		$scope.$emit('subtitle-change', $scope.subtitle);

		$scope.mapLoaded = false;

		$scope.rendererActive = appConfig.pointRenderers.rendererActive;
		$scope.renderers = appConfig.pointRenderers.renderers;

		$scope.heatmapRendererParams = appConfig.pointRenderers.heatmapRendererParams;
		$scope.clusterTolerance = appConfig.pointRenderers.clusterTolerance;

		$scope.basemapActive = appConfig.basemapActive;
		$scope.basemaps = appConfig.basemapsGrouped;
	}]);

	angular.module('AngularEsriPlaygroundApp').directive('esriPointRenderersMap', ['$q', '$log', 'appConfig', function($q, $log, appConfig) {
		return {
			// element only directive
			restict: 'E',

			// isolate the scope
			scope: {
				// 1-way string binding
				rendererActive: '@',
				// 2-way object binding
				mapLoaded: '=',
				basemapActive: '=',
				clusterTolerance: '=',
				heatmapRendererParams: '='
			},

			compile: function($element, $attrs) {
				// remove the id attribute from the main element
				$element.removeAttr('id');
				// append a new div inside this element, this is where we will create our map
				$element.append('<div id=' + $attrs.id + '></div>');
				// since we are using compile we need to return our linker function
				// the 'link' function handles how our directive responds to changes in $scope
				// jshint unused: false
				return function(scope, element, attrs, controller) {};
			},

			controller: function($scope, $element, $attrs) {
				var mapDeferred = $q.defer();
				var esriApp = {};

				require([
					'dojo/dom-class',

					'esri/layers/FeatureLayer',
					'esri/map',
					'esri/renderers/HeatmapRenderer',

					'lib/dojo/clusterfeaturelayer'
				], function(
					domClass,
					FeatureLayer, Map, HeatmapRenderer,
					ClusterFeatureLayer
				) {
					// map-related functions and business logic
					var createMapLayers = function() {
						var layerUrl = appConfig.pointRenderers.layerUrl;
						var layersToAdd = [];

						esriApp.clusterLayer = new ClusterFeatureLayer({
							url: layerUrl,
							distance: $scope.clusterTolerance,
							id: 'clusterLayer',
							// labelColor: '#fff',
							resolution: esriApp.map.extent.getWidth() / esriApp.map.width,
							// singleTemplate: infoTemplate,
							useDefaultSymbol: false,
							zoomOnClick: true,
							showSingles: true,
							objectIdField: 'FID',
						});
						layersToAdd.push(esriApp.clusterLayer);

						var heatmapRenderer = new HeatmapRenderer({
							colors: ['rgba(0, 0, 255, 0)', 'rgb(0, 0, 255)', 'rgb(255, 0, 255)', 'rgba(255, 0, 0)'],
							blurRadius: $scope.heatmapRendererParams.blurRadius,
							minPixelIntensity: $scope.heatmapRendererParams.minPixelIntensity,
							maxPixelIntensity: $scope.heatmapRendererParams.maxPixelIntensity
						});
						esriApp.heatmapLayer = new FeatureLayer(layerUrl, {
							id: 'heatmapLayer'
						});
						esriApp.heatmapLayer.setRenderer(heatmapRenderer);
						layersToAdd.push(esriApp.heatmapLayer);

						esriApp.map.addLayers(layersToAdd);
					};

					var toggleMapLayers = function(rendererActive) {
						var rendererLayer = rendererActive + 'Layer';
						esriApp.clusterLayer.setVisibility((esriApp.clusterLayer.id === rendererLayer));
						esriApp.heatmapLayer.setVisibility((esriApp.heatmapLayer.id === rendererLayer));
						if (esriApp.map.infoWindow.isShowing) {
							esriApp.map.infoWindow.hide();
						}
					};

					var changeHeatmapParameters = function(heatmapParams) {
						if (heatmapParams.blurRadius) {
							esriApp.heatmapLayer.renderer.setBlurRadius(heatmapParams.blurRadius);
						}
						if (heatmapParams.minPixelIntensity) {
							esriApp.heatmapLayer.renderer.setMinPixelIntensity(heatmapParams.minPixelIntensity);
						}
						if (heatmapParams.maxPixelIntensity) {
							esriApp.heatmapLayer.renderer.setMaxPixelIntensity(heatmapParams.maxPixelIntensity);
						}
						esriApp.heatmapLayer.redraw();
					};

					var changeClusterTolerance = function(clusterTolerance) {
						esriApp.clusterLayer._clusterTolerance = clusterTolerance;
						esriApp.clusterLayer.updateClusters();
					};

					var changeBasemap = function(basemap) {
						if (esriApp.map.getBasemap() !== basemap) {
							esriApp.map.setBasemap(basemap);
						}
					};

					// construct the map
					esriApp.map = new Map($attrs.id, {
						basemap: $scope.basemapActive,
						center: appConfig.pointRenderers.mapOptions.center,
						zoom: appConfig.pointRenderers.mapOptions.zoom
					});

					// after map is loaded, add layers and set up angular $scope watches
					esriApp.map.on('load', function(e) {
						createMapLayers();
						mapDeferred.resolve(esriApp);
					});

					mapDeferred.promise.then(function(esriApp) {
						$scope.$watch('mapLoaded', function(newValue) {
							$log.log('mapLoaded: ', newValue);
						});

						$scope.$watch('basemapActive', function(newValue) {
							changeBasemap(newValue);
						});

						$scope.$watch('rendererActive', function(newValue) {
							toggleMapLayers(newValue);
						});

						$scope.$watchGroup([
							'heatmapRendererParams.blurRadius',
							'heatmapRendererParams.minPixelIntensity',
							'heatmapRendererParams.maxPixelIntensity'
						], function(newValues, oldValues) {
							if (!angular.equals(newValues, oldValues)) {
								changeHeatmapParameters($scope.heatmapRendererParams);
							}
						});

						$scope.$watch('clusterTolerance', function(newValue) {
							changeClusterTolerance(newValue);
						});

						// loaded should be true by now
						$scope.mapLoaded = esriApp.map.loaded;

						// manually add material design whiteframe class to map zoom buttons
						domClass.add('map_zoom_slider', 'md-whiteframe-z2');
						// resize just to be safe
						esriApp.map.resize();

						// clean up
						$scope.$on('$destroy', function() {
							esriApp.map.destroy();
						});
					});
				});
			}
		};
	}]);
})(angular);