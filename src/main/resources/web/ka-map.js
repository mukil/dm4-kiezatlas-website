
var mapping = {
    "zoomDetailLevel": 15,
    "zoomStreetLevel": 14,
    "zoomKiezLevel": 13,
    "zoomDistrictLevel" : 12,
    "zoomCityLevel": 11,
    "circleMarkerRadius": 5,
    "circleMarkerSelectedRadius": 12,
    "circleSearchRadius": 750,
    "circleSearchControl": undefined,
    "circleSearchActive": true,
    "circleSearchLocked": true,
    "currentLocation": { name: "Neuenburger Straße, Berlin", coordinate: new L.latLng(52.5, 13.4) },
    "maxBounds": L.latLngBounds(L.latLng(52.234807, 12.976094), L.latLng(52.843370, 13.958482)),
    "markerGroup": undefined,
    "controlGroup": L.featureGroup(),
    "districtGroup": L.featureGroup() // Not in use
}

var leafletMap = (function($, L) {

    var map = {}
    var items = []

    map.setup = function(elementId) {
        map.elementId = elementId
        map.map = new L.Map(elementId, {
            dragging: true, touchZoom: true, scrollWheelZoom: false, doubleClickZoom: true,
            zoomControl: false, minZoom: 9, maxBounds: mapping.maxBounds,
        })
        new L.control.zoom( { position: "topright" }).addTo(map.map)
        L.tileLayer('https://api.tiles.mapbox.com/v4/kiezatlas.pd8lkp64/{z}/{x}/{y}.png?' // old style id="kiezatlas.map-feifsq6f"
            + 'access_token=pk.eyJ1Ijoia2llemF0bGFzIiwiYSI6ImNpa3BndjU2ODAwYm53MGxzM3JtOXFmb2IifQ._PcBhOcfLYDD8RP3BS0U_g', {
            attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors,'
            + '<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery &#169; <a href="http://mapbox.com">Mapbox</a>',
            id: 'kiezatlas.m7222ia5'}).addTo(map.map)
        map.map.on('locationfound', map.on_browser_location_found)
        map.map.on('locationerror', map.on_browser_location_error) // ### just if user answers "never"
        map.map.on('dragend', map.on_map_drag_end)
        map.map.on('drag', map.on_map_drag)
        //
        mapping.controlGroup.addTo(leafletMap.map)
        map.map.setView(map.getCurrentLocationCoordinate(), mapping.zoomKiezLevel)
        //
        map.map.on('zoomend', function(e) {
            if (map.map.getZoom() <= 12) {
                mapping.circleMarkerRadius = 3
                mapping.circleMarkerSelectedRadius = 5
            } else if (map.map.getZoom() === 13) {
                mapping.circleMarkerRadius = 5
                mapping.circleMarkerSelectedRadius = 7
            } else if (map.map.getZoom() === 14) {
                mapping.circleMarkerRadius = 7
                mapping.circleMarkerSelectedRadius = 9
            } else if (map.map.getZoom() === 15) {
                mapping.circleMarkerRadius = 8
                mapping.circleMarkerSelectedRadius = 10
            } else if (map.map.getZoom() >= 16) {
                mapping.circleMarkerRadius = 10
                mapping.circleMarkerSelectedRadius = 12
            }
            map.update_geo_object_marker_radius()
        })
    }

    map.clear_circle_marker = function() {
        // TODO revise this (returns straight for e.g. init via districts page)
        if (!mapping.markerGroup) return
        // clear complete marker group, e.g. for fulltext_search
        mapping.markerGroup.eachLayer(function (marker){
            leafletMap.map.removeLayer(marker)
        })
        map.map.removeLayer(mapping.markerGroup)
        mapping.markerGroup = undefined
    }

    map.render_circle_search_control = function(fitBounds) {
        if (mapping.circleSearchControl) {
            mapping.controlGroup.removeLayer(mapping.circleSearchControl)
        }
        if (mapping.circleSearchActive) {
            mapping.circleSearchControl = new L.CircleEditor(
                map.getCurrentLocationCoordinate(), mapping.circleSearchRadius, {
                color: colors.ka_gold, weight: 3, opacity: .4, extendedIconClass: "extend-icon-medium",
                className: "leaflet-search-control", clickable: false, zIndexOffset: 101, fillColor: colors.ka_gold
            })
            mapping.controlGroup.addLayer(mapping.circleSearchControl)
            mapping.circleSearchControl.on('edit', function(event) {
                var new_radius = event.target._mRadius
                map.setCurrentLocationCoordinate(event.target._latlng)
                map.fire_circle_edit(new_radius)
            })
            if (fitBounds) {
                leafletMap.map.fitBounds(mapping.controlGroup.getBounds())
                /** leafletMap.map.setView(
                    mapping.controlGroup.getBounds().getCenter(), mapping.zoomStreetLevel) */
            }
            if (mapping.circleSearchLocked) $('.leaflet-editing-icon').hide()
        }
    }

    map.remove_circle_search_control = function() {
        if (mapping.circleSearchControl) {
            mapping.controlGroup.removeLayer(mapping.circleSearchControl)
        }
    }
    
    map.render_geo_objects = function(set_view_to_bounds) {
        // Note: Here we decide to not render any duplicates
        var list_of_markers = []
        // pre-process results
        var elements = map.getItems()
        for (var el in elements) {
            var geo_object = elements[el]
            if (geo_object === "null" || !geo_object) {
                console.warn("Skipping Geo Object View Model [" + el+ "]", geo_object)
            } else {
                // preventing circle marker duplicates (in result set, e.g. Angebotsinfos)
                if (!map.exist_marker_in_listing(geo_object.id, list_of_markers)) {
                    var geo_marker = map.create_geo_object_marker(geo_object)
                    if (geo_marker) {
                        list_of_markers.push(geo_marker)
                    }
                }
            }
        }
        // merge: maintain also all previously added markers
        if (mapping.markerGroup) {
            mapping.markerGroup.eachLayer(function (marker) {
                // preventing circle marker duplicates (during merge of result sets)
                if (!map.exist_marker_in_listing(marker.options.geo_object_id, list_of_markers)) {
                    list_of_markers.push(marker)
                }
            })
        }
        // ### clear all pre-existing marker from map
        leafletMap.clear_circle_marker()
        // build up: create new markerGroup
        mapping.markerGroup = L.featureGroup(list_of_markers)
        //
        for (var el in list_of_markers) {
            var geoMarker = list_of_markers[el]
             mapping.markerGroup.addLayer(geoMarker)
        }
        leafletMap.map.addLayer(mapping.markerGroup)
        if (set_view_to_bounds && list_of_markers.length > 0) {
            // leafletMap.map.setMaxBounds(mapping.markerGroup.getBounds())
            leafletMap.map.fitBounds(mapping.markerGroup.getBounds())
        }
    }

    /** Sets up an interactive leaflet circle marker for a "ka2.geo_object" */
    map.create_geo_object_marker = function(geo_object) {
        if (geo_object.hasOwnProperty("geo_coordinate_lat")
            && geo_object.hasOwnProperty("geo_coordinate_lon")) {
            // 0) pre-process: geo object has geo coordinate
            var result = geo_object
            // 1) pre-processing: do worldwide coordinate check & log
            if (geo_object.geo_coordinate_lat > 90 || geo_object.geo_coordinate_lon > 180 ||
                geo_object.geo_coordinate_lat < -90 || geo_object.geo_coordinate_lon < -180 ) {
                console.warn("Invalid WGS 84 coordinates spotted at", geo_object)
                return undefined
            }
            // 2) pre-processing: do berlin coordinate check & log
            if (geo_object.geo_coordinate_lon < 10 || geo_object.geo_coordinate_lat < 45 ||
                geo_object.geo_coordinate_lon > 15 || geo_object.geo_coordinate_lat > 55) {
                console.warn("WGS 84 coordinates do look strange in case of Berlin", geo_object)
                return undefined
            }
            // 3) pre-precossing: do kiezatlas deep link check & log
            if (geo_object["bezirksregion_uri"] === "") {
                console.warn("Invalid Geo Object - Missing Bezirksregion URI", geo_object["name"])
                return undefined
            }
            // 4) Create a circle marker
            var coordinate = L.latLng(result["geo_coordinate_lat"], result["geo_coordinate_lon"])
            var circle = L.circleMarker(coordinate, map.calculate_default_circle_options(result))
            circle.setRadius(mapping.circleMarkerRadius)
            circle.on('click', function(e) { map.select_geo_object_marker(e.target) })
            circle.on('mouseover', function(e) { map.fire_marker_mouseover(e) })
            circle.on('mouseout', function(e) { map.fire_marker_mouseout(e) })
            return circle
        } else {
            console.warn("Could not geo object marker caused by missing geo coordinates")
            return undefined
        }
    }

    map.update_geo_object_marker_radius = function() {
        if (mapping.markerGroup) {
            mapping.markerGroup.eachLayer(function (el) {
                var geo_object_id = el.options["geo_object_id"]
                if (geo_object_id) {
                    el.setRadius(mapping.circleMarkerRadius)
                }
            })
        }
    }

    map.select_geo_object_marker = function(marker) {
        // apply default styles to all the rest
        mapping.markerGroup.eachLayer(function (el) {
            var geo_object_id = el.options["geo_object_id"]
            if (geo_object_id) {
                var geo_object_view_model = {
                    "address_id": el.options.address_id, "name": el.options.name,
                    "angebote_count": el.options.angebote_count, "bezirksregion_uri": el.options.bezirksregion_uri,
                    "uri": el.options.uri, "id": geo_object_id
                }
                el.setStyle(map.calculate_default_circle_options(geo_object_view_model))
                el.setRadius(mapping.circleMarkerRadius)
            }
            dummyObject = el.options
        })
        // highlight selected marker
        marker.setStyle(map.calculate_selected_circle_options())
        marker.bringToFront()
        marker.setRadius(mapping.circleMarkerSelectedRadius)
        // gather all items under selection
        var selected_geo_objects = map.find_all_geo_objects(marker.options['location_id'])
        // fire marker selection event
        map.fire_marker_select(selected_geo_objects)
    }

    map.calculate_default_circle_options = function(marker_topic) {
        var hasAngebote = (marker_topic["angebote_count"] > 0) ? true : false
        var angeboteDashArray = map.calculate_geo_object_dash_array(marker_topic)
        return { // ### improve new colors for angebote rendering
            weight: (hasAngebote) ? 3 : 2, opacity: .6, fillColor: (hasAngebote) ? colors.ka_red : colors.bright_grey,
            fillOpacity: (hasAngebote) ? 0.3 : 0.2, lineCap: 'square', dashArray: angeboteDashArray,
            color : (hasAngebote) ? colors.ka_gold : colors.ka_red, title: marker_topic["name"],
            alt: "Markierung von " + marker_topic["name"], location_id: marker_topic["address_id"],
            geo_object_id: marker_topic["id"], uri: marker_topic["uri"], name: marker_topic["name"],// riseOnHover: true,
            bezirksregion_uri: marker_topic["bezirksregion_uri"], z_indexOffset: 1001, uri: marker_topic["uri"],
            angebote_count: marker_topic["angebote_count"], id: marker_topic["id"], address_id: marker_topic["address_id"]
        }
    }

    map.calculate_selected_circle_options = function() {
        return {
            color: colors.ka_gold, weight: 3, opacity: 1,
            fillColor: colors.ka_red, fillOpacity: 1, className: "selected"
        }
    }

    map.calculate_geo_object_dash_array = function(item) {
        var value = item["angebote_count"]
        if (value === 0) return [75]
        if (value === 1) return [2,75]
        if (value === 2) return [2,5, 2,70]
        if (value === 3) return [2,5, 2,5, 2,65]
        if (value === 4) return [2,5, 2,5, 2,5, 2,60]
        if (value === 5) return [2,5, 2,5, 2,5, 2,5, 2,55]
        if (value === 6) return [2,5, 2,5, 2,5, 2,5, 2,5, 2,50]
        if (value === 7) return [2,5, 2,5, 2,5, 2,5, 2,5, 2,5, 2,45]
        if (value === 8) return [2,5, 2,5, 2,5, 2,5, 2,5, 2,5, 2,5, 2,40]
        if (value > 8) return [2,5]
    }

    map.is_initialized = function() {
        return (map.map) ? true : false
    }

    map.deactivate_circle_control = function() {
        mapping.circleSearchActive = false
    }

    map.activate_circle_control = function() {
        mapping.circleSearchActive = true
    }

    map.show_anchor = function(custom_anchor) {
        window.document.location.href = window.document.location.protocol + '//' + window.document.location.host + "/#karte"
        if (custom_anchor) { // but maybe alter anchor name
            window.document.location.href = window.document.location.protocol + '//' + window.document.location.host + "/" + custom_anchor
        }
    }

    // --- Mapping Model Operations

    map.setItems = function(itemList) {
        items = itemList
        console.log("Map Set Items (" + items.length + ")", items)
    }

    map.addItems = function(itemList) {
        // ###
    }
    
    map.getItems = function() {
        return items
    }

    map.getControlCircleRadius = function() {
        if (mapping.circleSearchControl) {
            return mapping.circleSearchControl.getRadius()
        }
        return mapping.circleSearchRadius
    }

    map.getControlCircleBounds = function() {
        return mapping.circleSearchControl.getBounds()
    }

    map.setControlCircleRadiusValue = function(meterVal) {
        if (mapping.circleSearchRadius) {
            mapping.circleSearchRadius = meterVal
        } else {
            console.warn("Circle Search Control is curerntly INACTIVE")
        }
    }

    map.getCurrentLocation = function() {
        return mapping.currentLocation
    }

    map.getCurrentLocationName = function() {
        return mapping.currentLocation.name
    }

    map.getCurrentLocationCoordinate = function() {
        return mapping.currentLocation.coordinate
    }

    map.getCurrentLocationLatitude = function() {
        return mapping.currentLocation.coordinate.lat
    }

    map.getCurrentLocationLongitude = function() {
        return mapping.currentLocation.coordinate.lng
    }

    map.setCurrentLocation = function(obj) {
        mapping.currentLocation = obj
    }

    map.setCurrentLocationName = function(name) {
        mapping.currentLocation.name = name
    }

    map.setCurrentLocationCoordinate = function(coordinate) {
        mapping.currentLocation.coordinate = coordinate
    }

    map.getItemById = function(id) {
        var elements = map.getItems()
        for (var el in elements) {
            var object = elements[el]
            if (object) {
                if (object.id === id) return object
            } else {
                console.warn("Geo Object View Model NOT in Map Items", object)
            }
        }
        return undefined
    }

    map.find_all_geo_objects = function(coordinate_id) {
        var results = []
        mapping.markerGroup.eachLayer(function (el) {
            if (el.options.location_id === coordinate_id) results.push(el)
        })
        return results
    }

    map.exist_marker_in_listing = function(geo_object_id, listing) {
        if (listing) {
            for (var i in listing) {
                if (listing[i].options.geo_object_id === geo_object_id) {
                    return true
                }
            }
        }
        return false
    }

    // --- Event Handling Methods

    map.listen_to = function(event_name, handler) {
        var domElement = document.getElementById(map.elementId)
        domElement.addEventListener(event_name, handler)
    }

    map.fire_drag_end = function() {
        var domElement = document.getElementById(map.elementId)
        domElement.dispatchEvent(new CustomEvent('drag_end'))
    }

    map.fire_drag = function() {
        var domElement = document.getElementById(map.elementId)
        domElement.dispatchEvent(new CustomEvent('drag'))
    }

    map.fire_marker_select = function(selection) {
        var domElement = document.getElementById(map.elementId)
        domElement.dispatchEvent(new CustomEvent('marker_select', {"detail": selection }))
    }

    map.fire_marker_mouseover = function(element) {
        var domElement = document.getElementById(map.elementId)
        domElement.dispatchEvent(new CustomEvent('marker_mouseover', {"detail": element }))
    }

    map.fire_marker_mouseout = function(element) {
        var domElement = document.getElementById(map.elementId)
        domElement.dispatchEvent(new CustomEvent('marker_mouseout', {"detail": element }))
    }

    map.fire_circle_edit = function(new_radius) {
        var domElement = document.getElementById(map.elementId)
        domElement.dispatchEvent(new CustomEvent('circle_control_edit', {"detail": new_radius} ))
    }

    map.fire_location_found = function(valueObj) {
        var domElement = document.getElementById(map.elementId)
        domElement.dispatchEvent(new CustomEvent('locating_success', {"detail": valueObj} ))
    }

    map.fire_location_error = function(message) {
        var domElement = document.getElementById(map.elementId)
        domElement.dispatchEvent(new CustomEvent('locating_error', {"detail": message} ))
    }

    map.on_map_drag = function(e) {
        map.fire_drag()
    }

    map.on_map_drag_end = function(e) {
        map.fire_drag_end()
    }

    map.on_browser_location_found = function(e) {
        map.show_anchor()
        if (!mapping.maxBounds.contains([e.latitude, e.longitude])) {
            handle_locating_error()
        } else {
            map.fire_location_found({"latitude":e.latitude, "longitude": e.longitude})
        }
    }

    map.on_browser_location_error = function(e) {
        map.show_anchor()
        handle_locating_error()
    }

    function handle_locating_error() {
        map.setCurrentLocationName('Ihr Standort liegt au&szlig;erhalb von Berlin, '
            + 'bitte nutzen sie die Umkreissuche oder '
            + '<a href="javascript:kiezatlas.focus_location_input_field()" '+ '>die Texteingabe</a>.')
        map.map.setView(map.getCurrentLocationCoordinate())
        map.map.setZoom(mapping.zoomKiezLevel)
        map.fire_location_error('Ihr Standort ist a&uszlig;erhalb von Berlin.')
    }

    return map

})($, L)
