
/** --- ka-map.js --- **/

var mapping = {
    "zoom_detail": 15,
    "zoom_street": 14,
    "zoom_kiez": 13,
    "zoom_district" : 12,
    "zoom_city": 11,
    "marker_radius_fixed": false,
    "marker_radius": 5,
    "marker_radius_selected": 15, // max
    "circle_search_radius": 750,
    "circle_search_control": undefined,
    "circle_query": true,
    "circle_locked": true,
    "current_location": { name: "Tucholskystraße, 10117 Berlin", coordinate: new L.latLng(52.524256, 13.392192) },
    "max_bounds": L.latLngBounds(L.latLng(52.234807, 12.976094), L.latLng(52.843370, 13.958482)),
    "marker_group": undefined,
    "control_group": L.featureGroup(),
    "do_cluster_marker" : false,
    "fit_bounds_padding": 30
}

var leafletMap = (function($, L) {

    var map = {}
    var items = []

    map.setup = function(elementId, mouseWheelZoom) {
        map.elementId = elementId
        // console.log("Set up Leaflet Map #"+ elementId + ", mouseWheelZoom", mouseWheelZoom)
        map.map = new L.Map(elementId, {
            dragging: true, touchZoom: true, scrollWheelZoom: (!mouseWheelZoom) ? false : mouseWheelZoom, doubleClickZoom: true,
            zoomControl: false, minZoom: 9, max_bounds: mapping.max_bounds,
        })
        map.zoom = L.control.zoom({ position: "topright" })
        map.zoom.addTo(map.map)
        L.control.scale( { imperial: false, updateWhenIdle: true } ).addTo(map.map)
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
        mapping.control_group.addTo(map.map)
        map.map.setView(map.get_current_location_coords(), mapping.zoom_kiez)
        //
        map.map.on('zoomend', function(e) {
            if (mapping.marker_radius_fixed) return;
            if (map.map.getZoom() <= 12) {
                mapping.marker_radius = 3
                mapping.marker_radius_selected = 7
            } else if (map.map.getZoom() === 13) {
                mapping.marker_radius = 5
                mapping.marker_radius_selected = 9
            } else if (map.map.getZoom() === 14) {
                mapping.marker_radius = 7
                mapping.marker_radius_selected = 11
            } else if (map.map.getZoom() === 15) {
                mapping.marker_radius = 8
                mapping.marker_radius_selected = 13
            } else if (map.map.getZoom() >= 16) {
                mapping.marker_radius = 10
                mapping.marker_radius_selected = 15
            }
            map.update_geo_object_marker_radius()
        })
    }

    map.fit_to_height = function(minus) {
        var value = window.innerHeight
        if (minus) value -= minus
        $('#' + map.elementId).height(value)
        map.map.invalidateSize()
    }

    map.set_zoom = function(obj) {
        map.map.setZoom(obj)
    }

    map.clear_marker = function() {
        // TODO revise this (returns straight for e.g. init via districts page)
        if (!mapping.marker_group) return;
        // clear complete marker group, e.g. for fulltext_search
        mapping.marker_group.eachLayer(function (marker){
            map.map.removeLayer(marker)
        })
        map.map.removeLayer(mapping.marker_group)
        mapping.marker_group = undefined
    }

    map.render_circle_search_control = function(fitBounds) {
        if (mapping.circle_search_control) {
            mapping.control_group.removeLayer(mapping.circle_search_control)
        }
        if (map.is_circle_query_active()) {
            mapping.circle_search_control = new L.CircleEditor(
                map.get_current_location_coords(), mapping.circle_search_radius, {
                color: colors.ka_gold, weight: 3, opacity: .4, extendedIconClass: "extend-icon-medium",
                className: "leaflet-search-control", clickable: false, zIndexOffset: 101, fillColor: colors.ka_gold
            })
            mapping.control_group.addLayer(mapping.circle_search_control)
            mapping.circle_search_control.on('edit', function(event) {
                var new_radius = event.target._mRadius
                map.set_current_location_coords(event.target._latlng)
                map.fire_circle_edit(new_radius)
            })
            if (fitBounds) {
                map.map.fitBounds(mapping.control_group.getBounds(), { padding: [30, 30] })
            }
            if (map.is_circle_control_fixed()) $('.leaflet-editing-icon').hide()
        }
    }

    map.remove_circle_search_control = function() {
        if (mapping.circle_search_control) {
            mapping.control_group.removeLayer(mapping.circle_search_control)
        }
    }
    
    map.render_geo_objects = function(set_view_to_bounds) {
        // Note: Here we decide to not render any duplicates
        var list_of_markers = []
        // pre-process results
        var elements = map.get_items()
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
        if (mapping.marker_group) {
            mapping.marker_group.eachLayer(function (marker) {
                // preventing circle marker duplicates (during merge of result sets)
                if (!map.exist_marker_in_listing(marker.options.id, list_of_markers)) {
                    list_of_markers.push(marker)
                }
            })
        }
        // ### clear all pre-existing marker from map
        map.clear_marker()
        // build up: create new marker_group
        if (mapping.do_cluster_marker) {
            mapping.marker_group = L.markerClusterGroup({
                spiderfyOnMaxZoom: true, spiderfyDistanceMultiplier: 2, showCoverageOnHover: false, maxClusterRadius: 60
            })
            mapping.marker_group.addLayers(list_of_markers)
            mapping.marker_group.on('clusterclick', function(e) {
                console.log("Clusterclick", e)
                // map.select_geo_object_marker(e.target)
            })
        } else {
            mapping.marker_group = L.featureGroup(list_of_markers)
        }
        //
        for (var el in list_of_markers) {
            var geoMarker = list_of_markers[el]
             mapping.marker_group.addLayer(geoMarker)
        }
        map.map.addLayer(mapping.marker_group)
        if (set_view_to_bounds && list_of_markers.length > 0) {
            map.map.fitBounds(mapping.marker_group.getBounds(), { padding: [30, 30] } )
        }
    }

    /** Sets up an interactive leaflet circle marker for a "ka2.geo_object" */
    map.create_geo_object_marker = function(geo_object) {
        if (geo_object.hasOwnProperty("latitude")
            && geo_object.hasOwnProperty("longitude")) {
            // 0) pre-process: geo object has geo coordinate
            var result = geo_object
            // 1) pre-processing: do worldwide coordinate check & log
            if (geo_object.latitude > 90 || geo_object.longitude > 180 ||
                geo_object.latitude < -90 || geo_object.longitude < -180 ) {
                console.warn("Invalid WGS 84 coordinates spotted at", geo_object)
                return undefined
            }
            // 2) pre-processing: do berlin coordinate check & log
            if (geo_object.longitude < 10 || geo_object.latitude < 45 ||
                geo_object.longitude > 15 || geo_object.latitude > 55) {
                console.warn("WGS 84 coordinates do look strange in case of Berlin", geo_object)
                return undefined
            }
            // 3) pre-precossing: if topic is neither in a bezirks-citymap nor in a bezirksregion citymap
            if (geo_object["bezirksregion_uri"] === "" && geo_object["bezirk_uri"] === "") {
                console.warn("Invalid Geo Object - Missing Bezirksregion & Bezirk URI", geo_object["name"])
                return undefined
            }
            // 4) Create a circle marker
            var coordinate = L.latLng(result["latitude"], result["longitude"])
            var circle = L.circleMarker(coordinate, map.calculate_default_circle_options(result))
            circle.setRadius(mapping.marker_radius)
            circle.on('click', function(e) {
                map.select_geo_object_marker(e.target)
            })
            circle.on('mouseover', function(e) {
                circle.setRadius(mapping.marker_radius + 5)
                circle.setStyle({
                    color: colors.ka_gold, weight: 3, opacity: 1,
                    fillColor: colors.ka_red, fillOpacity: 1, className: "selected"
                })
                map.fire_marker_mouseover(e)
            })
            circle.on('mouseout', function(e) {
                circle.setRadius(mapping.marker_radius)
                circle.setStyle(map.calculate_default_circle_options(result))
                map.fire_marker_mouseout(e)
            })
            return circle
        } else {
            console.warn("Could not geo object marker caused by missing geo coordinates")
            return undefined
        }
    }

    map.update_geo_object_marker_radius = function() {
        if (mapping.marker_group) {
            mapping.marker_group.eachLayer(function (el) {
                var marker_id = el.options["id"]
                if (marker_id) {
                    el.setRadius(mapping.marker_radius)
                }
            })
        }
    }

    map.highlight_geo_object_marker_by_id = function(topicId, focusOnMap) {
        mapping.marker_group.eachLayer(function (el) {
            var marker_id = el.options["id"]
            if (marker_id == topicId) {
                if (!mapping.do_cluster_marker) {
                    el.setStyle(map.calculate_selected_circle_options())
                    el.bringToFront()
                    el.setRadius(mapping.marker_radius_selected)
                }
                if (focusOnMap) map.map.setView(el.getLatLng(), mapping.zoom_street)
            } else {
                var geo_object_view_model = {
                    "name": el.options.name, "bezirksregion_uri": el.options.bezirksregion_uri, "uri": el.options.uri,
                    "angebote_count": el.options.angebote_count, "angebots_id": el.options.angebots_id,
                    "id": marker_id, "address_id": el.options.address_id
                }
                el.setStyle(map.calculate_default_circle_options(geo_object_view_model))
                el.setRadius(mapping.marker_radius)
            }
        })
    }

    map.select_geo_object_marker = function(marker) {
        // apply default styles to all the rest
        mapping.marker_group.eachLayer(function (el) {
            var marker_id = el.options["id"]
            if (marker_id) {
                var geo_object_view_model = {
                    "name": el.options.name, "bezirksregion_uri": el.options.bezirksregion_uri, "uri": el.options.uri,
                    "angebote_count": el.options.angebote_count, "angebots_id": el.options.angebots_id,
                    "id": marker_id, "address_id": el.options.address_id
                }
                el.setStyle(map.calculate_default_circle_options(geo_object_view_model))
                el.setRadius(mapping.marker_radius)
            }
            dummyObject = el.options
        })
        // highlight selected marker
        marker.setStyle(map.calculate_selected_circle_options())
        marker.bringToFront()
        marker.setRadius(mapping.marker_radius_selected)
        if (marker.options.angebots_id) {
            map.fire_angebot_marker_select(marker)
        } else {
            // gather all items under selection
            var selected_geo_objects = map.find_all_geo_objects(marker.options['address_id'])
            // fire marker selection event
            map.fire_geo_marker_select(selected_geo_objects)
        }
    }

    /** TODO: Visually differentiate between geo object and angebot markers */
    map.calculate_default_circle_options = function(marker_topic) {
        var hasAngebote = (marker_topic["angebote_count"] > 0) ? true : false
        var angeboteDashArray = map.calculate_geo_object_dash_array(marker_topic)
        var angeboteId = (marker_topic.hasOwnProperty("angebots_id")) ? marker_topic["angebots_id"] : undefined
        return { // ### improve new colors for angebote rendering
            weight: (hasAngebote) ? 3 : 2, opacity: (hasAngebote) ? 1 : 0.6, fillColor: (hasAngebote) ? colors.ka_red : colors.bright_grey,
            fillOpacity: (hasAngebote) ? 0.6 : 0.2, lineCap: 'square', dashArray: angeboteDashArray,
            color : (hasAngebote) ? colors.ka_gold : colors.ka_red, title: marker_topic["name"],
            alt: "Markierung von " + marker_topic["name"], bezirk_uri: marker_topic["bezirk_uri"],
            uri: marker_topic["uri"], name: marker_topic["name"],// riseOnHover: true,
            bezirksregion_uri: marker_topic["bezirksregion_uri"], z_indexOffset: 1001, uri: marker_topic["uri"],
            angebote_count: marker_topic["angebote_count"], angebots_id: angeboteId,
            id: marker_topic["id"], address_id: marker_topic["address_id"]
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
        if (value === 0) return [100]
        if (value === 1) return [2,75]
        if (value === 2) return [2,5, 2,70]
        if (value === 3) return [2,5, 2,5, 2,65]
        if (value === 4) return [2,5, 2,5, 2,5, 2,60]
        if (value === 5) return [2,5, 2,5, 2,5, 2,5, 2,55]
        if (value === 6) return [2,5, 2,5, 2,5, 2,5, 2,5, 2,50]
        if (value === 7) return [2,5, 2,5, 2,5, 2,5, 2,5, 2,5, 2,45]
        if (value === 8) return [2,5, 2,5, 2,5, 2,5, 2,5, 2,5, 2,5, 2,40]
        if (value === 9) return [2,5, 2,5, 2,5, 2,5, 2,5, 2,5, 2,5, 2,5, 2,40]
        if (value > 9) return [2,5]
    }

    map.is_initialized = function() {
        return (map.map) ? true : false
    }

    map.deactivate_circle_control = function() {
        mapping.circle_query = false
    }

    map.activate_circle_control = function() {
        mapping.circle_query = true
    }

    map.set_circle_control_fixed = function(val) {
        return mapping.circle_locked = val
    }

    map.is_circle_control_fixed = function() {
        return mapping.circle_locked
    }

    map.is_circle_query_active = function() {
        return mapping.circle_query
    }

    map.scroll_into_view = function(custom_anchor) {
        if (custom_anchor) { // but maybe alter anchor name
            document.getElementById(custom_anchor).scrollIntoView()
        } else {
            document.getElementById(map.elementId).scrollIntoView()
        }
    }

    // --- Mapping Model Operations

    map.set_items = function(itemList) {
        items = itemList
    }

    map.get_items = function() {
        return items
    }

    map.get_circle_control_radius = function() {
        if (mapping.circle_search_control) {
            return mapping.circle_search_control.getRadius()
        }
        return mapping.circle_search_radius
    }

    map.set_circle_control_radius = function(meterVal) {
        if (mapping.circle_search_radius) {
            mapping.circle_search_radius = meterVal
        } else {
            console.warn("Circle Search Control is curerntly INACTIVE")
        }
    }

    map.get_circle_control_bounds = function() {
        return mapping.circle_search_control.getBounds()
    }

    map.get_map_center = function() {
        return map.map.getCenter()
    }

    map.set_map_fit_bounds = function(boundingBox) {
        return map.map.fitBounds(boundingBox)
    }

    map.get_current_location = function() {
        return mapping.current_location
    }

    map.get_current_location_name = function() {
        return mapping.current_location.name
    }

    map.get_current_location_coords = function() {
        return mapping.current_location.coordinate
    }

    map.get_current_location_lat = function() {
        return mapping.current_location.coordinate.lat
    }

    map.get_current_location_lng = function() {
        return mapping.current_location.coordinate.lng
    }

    map.set_current_location = function(obj) {
        mapping.current_location = obj
    }

    map.set_marker_radius = function(val) {
        mapping.marker_radius = val
    }

    map.set_marker_fixed_radius = function(val) {
        mapping.marker_radius_fixed = val
    }

    map.set_marker_selected_radius = function(val) {
        mapping.marker_radius_selected = val
    }

    map.set_current_location_name = function(name) {
        mapping.current_location.name = name
    }

    map.set_current_location_coords = function(coordinate) {
        mapping.current_location.coordinate = coordinate
    }

    map.get_item_by_id = function(id) {
        var elements = map.get_items()
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

    map.find_all_geo_objects = function(address_id) {
        var results = []
        mapping.marker_group.eachLayer(function (el) {
            if (el.options.address_id === address_id) results.push(el)
        })
        return results
    }

    map.exist_marker_in_listing = function(marker_id, listing) {
        if (listing) {
            for (var i in listing) {
                if (listing[i].options.id === marker_id) {
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

    map.fire_drag_end = function(e) {
        var domElement = document.getElementById(map.elementId)
        // domElement.dispatchEvent(new CustomEvent('drag_end'))
        fire_custom_event(domElement, 'drag_end', e.distance)
    }

    map.fire_drag = function() {
        var domElement = document.getElementById(map.elementId)
        // domElement.dispatchEvent(new CustomEvent('drag'))
        fire_custom_event(domElement, 'drag')
    }

    map.fire_geo_marker_select = function(selection) {
        var domElement = document.getElementById(map.elementId)
        fire_custom_event(domElement, 'marker_select', selection)
    }

    map.fire_angebot_marker_select = function(selection) {
        var domElement = document.getElementById(map.elementId)
        fire_custom_event(domElement, 'angebot_marker_select', selection)
    }

    map.fire_marker_mouseover = function(element) {
        var domElement = document.getElementById(map.elementId)
        fire_custom_event(domElement, 'marker_mouseover', element)
    }

    map.fire_marker_mouseout = function(element) {
        var domElement = document.getElementById(map.elementId)
        fire_custom_event(domElement, 'marker_mouseout', element)
    }

    map.fire_circle_edit = function(new_radius) {
        var domElement = document.getElementById(map.elementId)
        fire_custom_event(domElement, 'circle_control_edit', new_radius)
    }

    map.fire_location_found = function(valueObj) {
        var domElement = document.getElementById(map.elementId)
        fire_custom_event(domElement, 'locating_success', valueObj)
    }

    map.fire_location_error = function(message) {
        var domElement = document.getElementById(map.elementId)
        fire_custom_event(domElement, 'locating_error', message)
    }

    map.on_map_drag = function(e) {
        map.fire_drag()
    }

    map.on_map_drag_end = function(e) {
        map.fire_drag_end(e)
    }

    map.on_browser_location_found = function(e) {
        map.scroll_into_view()
        if (!mapping.max_bounds.contains([e.latitude, e.longitude])) {
            handle_locating_error()
        } else {
            map.fire_location_found({"latitude":e.latitude, "longitude": e.longitude})
        }
    }

    map.on_browser_location_error = function(e) {
        map.scroll_into_view()
        handle_locating_error()
    }

    function handle_locating_error() {
        map.set_current_location_name('Ihr Standort liegt au&szlig;erhalb von Berlin, '
            + 'bitte nutzen sie die Umkreissuche oder '
            + '<a href="javascript:kiezatlas.focus_location_input_field()" '+ '>die Texteingabe</a>.')
        map.map.setView(map.get_current_location_coords())
        map.map.setZoom(mapping.zoom_kiez)
        map.fire_location_error('Ihr Standort ist a&uszlig;erhalb von Berlin.')
    }

    function fire_custom_event(element, eventName, details) {
        if (is_msie) {
            var customEvent = document.createEvent('CustomEvent')
                customEvent.initCustomEvent(eventName, true, false, details)
            element.dispatchEvent(customEvent)
        } else {
            element.dispatchEvent(new CustomEvent(eventName, {"detail": details} ))
        }
    }

    // Current MSIE Check here for our PouchDB Favourite Feature courtesy of http://www.javascriptkit.co
    function is_msie() {
        var ie11andabove = navigator.userAgent.indexOf('Trident') != -1 && navigator.userAgent.indexOf('MSIE') == -1 // IE11 or above Boolean
        var ie10andbelow = navigator.userAgent.indexOf('MSIE') != -1 // IE10 or below Boolean
        return (ie11andabove || ie10andbelow)
    }

    return map

})($, L)
