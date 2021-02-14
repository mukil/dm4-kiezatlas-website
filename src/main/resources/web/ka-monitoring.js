$(document).ready(function () {

//_______ Style wird vorher in Variablen definiert und mit den Funktionen dem Layer übergeben

    var selectStyle = new ol.style.Style({
        fill: new ol.style.Fill({
            color: 'rgba(255,255,0,0.3)'
        }),
        stroke: new ol.style.Stroke({
            color: '#ff0000',
            width: 2
        })
    });

    var lookup = {
        "1": [new ol.style.Style({
                fill: new ol.style.Fill({
                    color: '#ce000099'// '#e31a1c'
                }),
                stroke: new ol.style.Stroke({
                    color: "#black"
                })
            })],
        "2": [new ol.style.Style({
                fill: new ol.style.Fill({
                    color: '#9cc30099' //#238b45'
                }),
                stroke: new ol.style.Stroke({
                    color: "black"
                })
            })],
        "3": [new ol.style.Style({
                fill: new ol.style.Fill({
                    color: '#ecf4f799'
                }),
                stroke: new ol.style.Stroke({
                    color: "black"
                })
            })],
        "4": [new ol.style.Style({
                fill: new ol.style.Fill({
                    color: '#fd8d3c99'
                }),
                stroke: new ol.style.Stroke({
                    color: "black"
                })
            })],
        "5": [new ol.style.Style({
                fill: new ol.style.Fill({
                    color: '#ffffb299'
                }),
                stroke: new ol.style.Stroke({
                    color: "black"
                })
            })]

    };


//________ Kartenbereich

    //Hintergrundkarten und Tile-Layer aus Mapbox werden definiert und geladen
    var mapboxLayerHi = new ol.layer.Tile({
        source: new ol.source.XYZ({ // old style id="kiezatlas.map-feifsq6f"
            url: 'https://api.mapbox.com/styles/v1/danielo/cj0b3nxhh00482smt51tb631i/tiles/256/{z}/{x}/{y}@2x?access_token=pk.eyJ1IjoiZGFuaWVsbyIsImEiOiJjajBmY3oxeWQwMDJvMzJyemx3cDQ4aW5uIn0.UPg8pUyhtf_Ecy5vy-2D4w',
            // 'https://api.tiles.mapbox.com/v4/kiezatlas.pd8lkp64/{z}/{x}/{y}.png?access_token=pk.eyJ1Ijoia2llemF0bGFzIiwiYSI6ImNpa3BndjU2ODAwYm53MGxzM3JtOXFmb2IifQ._PcBhOcfLYDD8RP3BS0U_g',
        })
    });

    var mapboxLayerLi = new ol.layer.Tile({
        source: new ol.source.XYZ({
            url: 'https://api.mapbox.com/styles/v1/danielo/cj0fnpcy6007e2smnaakrl98z/tiles/256/{z}/{x}/{y}@2x?access_token=pk.eyJ1IjoiZGFuaWVsbyIsImEiOiJjajBmY3oxeWQwMDJvMzJyemx3cDQ4aW5uIn0.UPg8pUyhtf_Ecy5vy-2D4w',
        })
    });

    var statusLayer = new ol.layer.Vector({
        source: '',
        minResolution: 3,
        maxResolution: 500,
        style: function (feature) {
            var vorzeichen = 0;
            if (feature.get('SI') == 4) {
                vorzeichen = 1;
            } else if (feature.get('SI') == 1) {
                vorzeichen = 2;
            } else if (feature.get('SI') == 3) {
                vorzeichen = 4;
            } else if (feature.get('SI') == 2) {
                vorzeichen = 5;
            } else {
                vorzeichen = 3;
            }
            return lookup[vorzeichen];
        }
    });

    // Geojson laden wird geladen

    $.ajax({
        dataType: "json",
        url: '/de.kiezatlas.website/vendor/monitoring/data/meta2017.geojson',
        success: function (data) {
            populateMap(data)
        }
    });


    // auf callback warten

    function populateMap(y) {
        var source = new ol.source.Vector({
            attributions: [new ol.Attribution({
                html: " | Autoren: D. Methke, L. Friebel, S. Dieckmann | Statistische Daten: <a href='http://www.stadtentwicklung.berlin.de/planen/basisdaten_stadtentwicklung/monitoring/index.shtml' target='_blank'>Monitoring Soziale Stadtentwicklung Berlin 2017 </a> | &#169 <a href='https://www.mapboy.com/about/maps' target='_blank'> Mapbox</a> | &#169 <a href='https://www.openstreetmap.org/copyright' target='_blank'> OpenStreetMap</a> contributors",
                collapsed: false,
                collapsible: false,
            })]
        });

        var format = new ol.format.GeoJSON({
            defaultDataProjection: 'EPSG:4326'
        });
        var features = format.readFeatures(y, {
            dataProjection: 'EPSG:4326',
            featureProjection: 'EPSG:3857'
        });
        source.addFeatures(features);
        statusLayer.setSource(source);
    }

    var popup = new ol.Overlay({
        element: document.getElementById('popupDiv'),
        autoPan: true,
        autoPanAnimation: { duration: 250 }
    })

    //Definition der Maßstabsleiste 
    var scaleLineControl = new ol.control.ScaleLine();

    //Definition des Attribution-Button 
    var attribution = new ol.control.Attribution({
        collapsible: false,
        label: '©',
        collapsed: false,
        tipLabel: 'Zuordnungen'
    });

    //Karte zusammentragen 
    var map = new ol.Map({
        controls: ol.control.defaults({
            attribution: false //verhindert den Standart Attributions-Botton
        }).extend([
            attribution, //setzt den eigenen Attributions-Botton
            scaleLineControl //hier wird die Maßstabsleiste der map hinzugefügt
        ]),
        target: 'mapDiv',
        layers: [mapboxLayerHi, statusLayer, mapboxLayerLi],
        overlays: [popup],
        view: new ol.View({
            center: ol.proj.transform([13.3833, 52.5167], 'EPSG:4326', 'EPSG:3857'),
            zoom: 11,
            minZoom: 9,
            maxZoom: 18,
            extent: [//[minx, miny, maxx, maxy]
                1377841.8942991872,
                6805751.885752681,
                1618465.6593409223,
                6972690.355527506
            ]
        })

    });


    var selectInteraction = new ol.interaction.Select({
        condition: ol.events.condition.singleClick,
        layers: [statusLayer],
        style: selectStyle,
    });

    map.addInteraction(selectInteraction);

//Maus Popup

    map.on('singleclick', function (evt) {
        var pixel = evt.pixel;
        var coordinate = evt.coordinate;
        displayFeatureInfo(pixel, coordinate);
    });

    var displayFeatureInfo = function (pixel, coordinate) {
        var features = [];
        map.forEachFeatureAtPixel(pixel, function (feature, layer) {
            features.push(feature);
        });

        if (features.length > 0) {
            var infoName = '';
            var infoStatus = '';
            var infoDyn = '';
            var infoBR = '';
            var infoBN = '';
            var infoEW = '';
            var infoLink = '';
            for (var i = 0; i < features.length; i++) {
                infoName = features[i].get('NAME');
                infoStatus = features[i].get('S_Summe');
                infoDyn = features[i].get('DK');
                infoBR = features[i].get('BezReg');
                infoBN = features[i].get('BEZname');
                infoEW = features[i].get('EW');
                infoLink = features[i].get('SCHLUESSEL');
            }
            var link = '<a href="https://sozialraumdaten.kiezatlas.de/seiten/2020/06/?lor='+infoLink+'">Link zur Auswertung</a><br/>'
            var statusDyn = 'Status Index: ' + (infoStatus).toFixed(2) + ', ' + 'Dynamik: ' + infoDyn + '<br/>'
            if (infoDyn == null) {
                link = "Keine Auswertung aufgrund zu geringer Einwohnerzahl, "
                statusDyn = ""
            }
            document.getElementById('popup-content').innerHTML = '<b>' + infoName + '</b>, ' + infoBR + ', ' + infoBN + '<br/>' 
                    + link
                    + 'EinwohnerInnen: ' + infoEW + '<br/>'
                    + statusDyn + 'Quelle: Monitoring Soziale Stadt 2017'
            popup.setPosition(coordinate);
        } else {
            document.getElementById('popup-content').innerHTML = '';
            popup.setPosition(undefined);
        }
    };

    document.getElementById('popup-closer').onclick = function () {
        popup.setPosition(undefined);
        document.getElementById('popup-closer').blur();
        return false;
    };

    /** var layerSwitcher = new ol.control.LayerSwitcher({
        tipLabel: 'Legende' // Optional label for button
    });
    map.addControl(layerSwitcher); **/

    // Geocoder

    // Create an instance of the custom provider, passing any options that are
    // required
    var geocoder = new Geocoder('nominatim', {
        provider: 'osm',
        key: '',
        lang: 'de-GER', //en-US, fr-FR
        placeholder: 'Straße, Berlin',
        targetType: 'text-input',
        countrycodes: 'de',
        limit: 7,
        keepOpen: false,
        preventDefault: true
    });

    map.addControl(geocoder);

    geocoder.on('addresschosen', function (evt) {
        if (evt.bbox) {
            map.getView().fit(evt.bbox, { duration: 500 });
        } else {
            map.getView().animate({ zoom: 15, center: evt.coordinate });
        }
        // content.innerHTML = '<p>' + address.formatted + '</p>';
        console.log("Address chosen", evt.feature, evt.address, evt.coordinate)
        // map.setPosition(coord)
        var pixel = map.getPixelFromCoordinate(evt.coordinate)
        var features = [];
        map.forEachFeatureAtPixel(pixel, function (feature, layer) {
            features.push(feature);
        });

        if (features.length > 0) {
            console.log("Feature at address", features[0], features)
            displayFeatureInfo(pixel, evt.coordinate)
        }
    })
    

});
