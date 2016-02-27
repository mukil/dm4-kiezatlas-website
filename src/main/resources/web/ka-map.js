
var mapping = {
    "zoomDetailLevel": 15,
    "zoomStreetLevel": 14,
    "zoomKiezLevel": 13,
    "zoomDistrictLevel" : 12,
    "zoomCityLevel": 11,
    "defaultRadiusMeter" : 750,
    "isMapCircleLocked": true,
    "max_bounds": L.latLngBounds(L.latLng(52.298000, 12.909336), L.latLng(52.715646, 13.817779)),
    "current_location": { name: "Neuenburger Straße, Berlin", coordinate: new L.latLng(52.5, 13.4) },
    "markerGroup": undefined,
    "controlGroup": L.featureGroup(),
    "districtGroup": L.featureGroup(),
    // "location_circle": undefined,
    "circle_search_control": undefined
}

var leafletMap = (function($, L) {

    var map = {}
    
    map.setup = function(elementId) {
        // Iinitiate Leaflet Map Object
        map.elementId = elementId
        map.map = new L.Map(elementId, {
            dragging: true, touchZoom: true, scrollWheelZoom: false,
            doubleClickZoom: true, zoomControl: false, minZoom: 9//,
            // TODO: Increase max_bounds to not interfere with a locked circle
            // maxBounds: _self.max_bounds,
        })
        new L.control.zoom( { position: "topright" }).addTo(map.map)
        L.tileLayer('https://api.tiles.mapbox.com/v4/kiezatlas.map-feifsq6f/{z}/{x}/{y}.png?'
            + 'access_token=pk.eyJ1Ijoia2llemF0bGFzIiwiYSI6ImNpa3BndjU2ODAwYm53MGxzM3JtOXFmb2IifQ._PcBhOcfLYDD8RP3BS0U_g', {
            attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors,'
            + '<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery &#169; <a href="http://mapbox.com">Mapbox</a>',
            id: 'kiezatlas.m7222ia5'}).addTo(map.map)
        // register handlers
        map.map.on('locationfound', map.on_browser_location_found)
        map.map.on('locationerror', map.on_browser_location_error) // ### just if user answers "never"
        map.map.on('dragend', map.on_map_drag_end)
        map.map.on('zoomend', function(e) {
            console.log("map zoom level > ", leafletMap.map.getZoom())
        })
        map.map.on('drag', map.on_map_drag)
        // correct current default viewport
        leafletMap.map.setView(mapping.current_location.coordinate, mapping.zoomKiezLevel)
        if (mapping.isMapCircleLocked) $('.leaflet-editing-icon').hide() // ### duplicate, fix circle initialization
    }
    
    map.isInitialized = function() {
        return (map.map) ? true : false
    }
    
    map.on_map_drag = function(e) {
        map.fire_drag()
    }

    map.on_map_drag_end = function(e) {
        map.fire_drag_end()
    }
    
    /** Defunct **/
    map.on_browser_location_found = function(e) {
        //
        map.show_anchor()
        //
        if (!_self.max_bounds.contains([e.latitude, e.longitude])) {
            // ### enable button for reset-view
            mapping.current_location.name = 'Ihr Standort liegt au&szlig;erhalb von Berlin, '
                + 'bitte nutzen sie die Umkreissuche auf der Karte um Einrichtungen zu finden oder '
                + '<a href="javascript:kiezatlas.focus_location_input_field()" '+ '>die Texteingabe</a>.'
            _self.render_current_location_label(true)
            // correct current map-viewport to default after a seemingly correct (but not sane location-query result)
            leafletMap.map.setView(_self.current_location.coordinate, mapping.zoomStreetLevel)
        } else {
            mapping.current_location.coordinate.lat = e.latitude
            mapping.current_location.coordinate.lng = e.longitude
            // render radius control at new place
            _self.render_circle_search_control()
            // then fire query
            _self.do_circle_search(undefined, undefined)
            // correct current default viewport
            leafletMap.map.setView(_self.current_location.coordinate, mapping.zoomStreetLevel)
            // ### if location in berlin, do something smart (suggest to save location to favourites'db
                // ### complete error handling, for geo-name lookup
            _self.reverse_geocode()
        }
    }

    /**
      * As it turns out this is just called if location will \"never\" be shared with this website
      * but NOT if user decides to share location \"not this time\" (available in Firefox) or just clicks into the
      * void of our page (Chromium).
      */
    map.on_browser_location_error = function(e) {
        // _self.hide_spinning_wheel(true)
        // leafletMap.map.setView(_self.current_location.coordinate, mapping.zoomDistrictLevel)
        if (_self.max_bounds.contains([_self.current_location.coordinate.lat, _self.current_location.coordinate.lng])) {
            // render radius control at standard place
            _self.render_circle_search_control()
            // then fire query
            _self.do_circle_search(undefined, undefined)
        }
        _self.show_message("Tipp: Bewegen sie den Kartenausschnitt oder w&auml;hlen sie "
            + "<em>Unlock Circle</em>, so k&ouml;nnen sie Einrichtungen in einer ganz bestimmten Gegend aufdecken.",
            7000)
    }
    
    map.show_anchor = function(custom_anchor) {
        // jump to map in any case
        window.document.location.href = window.document.location.protocol + '//' + window.document.location.host + "/#" + map.elementId
        if (custom_anchor) { // but maybe alter anchor name
            window.document.location.href = window.document.location.protocol + '//' + window.document.location.host + "/" + custom_anchor
        }
    }
    
    // --- Event Handling Methods

    map.listen_to = function(event_name, handler) {
        var domElement = document.getElementById(map.elementId)
        domElement.addEventListener(event_name, handler)
        console.log("Registered LeaefletMap Listener", domElement)
    }

    map.fire_drag_end = function() {
        var domElement = document.getElementById(map.elementId)
        domElement.dispatchEvent(new CustomEvent('drag_end'))
    }

    map.fire_drag = function() {
        var domElement = document.getElementById(map.elementId)
        domElement.dispatchEvent(new CustomEvent('drag'))
    }

    /** function fire_(items) {
        svg_panel.node().dispatchEvent(new CustomEvent('multi_selection', { detail: items }))
    }

    function fire_rendered_topicmap() {
        svg_panel.node().dispatchEvent(new CustomEvent('rendered_topicmap', { detail: map_topic }))
    }

    function fire_map_transformation(value) {
        svg_panel.node().dispatchEvent(new CustomEvent('topicmap_transformed', { detail: value }))
    }

    function fire_map_zoom(value) {
        svg_panel.node().dispatchEvent(new CustomEvent('topicmap_zoomed', { detail: value }))
    } */

    return map

})($, L)
