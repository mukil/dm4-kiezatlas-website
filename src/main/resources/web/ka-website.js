
/**
 * 
 * @type @new;_L5
 */
var kiezatlas = new function () {
    
    var _self = this

    this.default_radius = 750; /* radius in meters*/
    this.radius_control = undefined
    this.max_bounds = L.latLngBounds(L.latLng(52.298000, 12.909336), L.latLng(52.715646, 13.817779))

    this.current_location = { name: "Neuenburger Straße, Berlin", coordinate: new L.latLng(52.5, 13.4) }
    this.alternative_items = [] // near-by search street-alternatives
    this.autocomplete_item = 0
    //
    this.LEVEL_OF_DETAIL_ZOOM = 15 // the map focus when a mapinternal infoWindow is rendered
    this.LEVEL_OF_STREET_ZOOM = 14 // the map focus when a mapinternal infoWindow is rendered
    this.LEVEL_OF_KIEZ_ZOOM = 13
    this.LEVEL_OF_DISTRICT_ZOOM = 12
    this.LEVEL_OF_CITY_ZOOM = 11
    //
    this.location_circle = undefined
    //
    this.historyApiSupported = window.history.pushState
    //
    this.map = undefined
    // 
    this.markerGroup = undefined
    this.controlGroup = L.featureGroup()
    // model of all geo-domain object in client
    this.items = []
    this.db = undefined
    
    this.init_location_selection = function () {
        //
        $('.search-option.a').on('touchend', handle_option_a)
        $('.search-option.a').on('click', handle_option_a)
        //
        $('.search-option.b').on('touchend', _self.focus_location_input_field)
        $('.search-option.b').on('click', _self.focus_location_input_field)
        //
        $('.search-option.c').on('touchend', _self.handle_option_c)
        $('.search-option.c').on('click', _self.handle_option_c)

        function handle_option_a (e) {
            // initiaze map on browsers location
            if (typeof _self.map === "undefined") {
                _self.init_map_area('map', false)
            }
            _self.jump_to_map()
            _self.get_browser_location()
        }

    }

    this.handle_option_c = function (e) {
        // initiate map with edible circle control
        if (typeof _self.map === "undefined") {
            _self.init_map_area('map', true)
        }
        _self.jump_to_map()
        _self.map.setZoom(_self.LEVEL_OF_DISTRICT_ZOOM)
    }

    this.handle_option_b = function (e) {
        // initiate map with edible circle control but focus on street
        if (typeof _self.map === "undefined") {
            _self.init_map_area('map', true)
        }
        _self.jump_to_map()
        _self.map.setZoom(_self.LEVEL_OF_STREET)
    }

    this.jump_to_map = function () {
        window.document.location.href = window.document.location.protocol + '//' + window.document.location.host + "/#karte"
    }

    this.focus_location_input_field = function () {
        // set focus on text input
        $('#location-input #near-by').focus()
    }

    this.start_local_db = function () {
        // PouchDB.debug.enable('*')
        PouchDB.debug.disable()
        _self.db = new PouchDB('kiezatlas_favourites')
    }
    
    this.add_entry_to_local_db = function () {
        // ### perform some kind of existence check
        get_next_id(function (next_id) {
            var entry = { _id : next_id, data: _self.current_location }
            _self.db.put(entry)
            _self.list_entries_in_local_db()
        })
        
        function get_next_id (handler) {
            _self.db.allDocs({include_docs: true})
                .then(function (result) {
                    var next_id = parseInt(result.total_rows)
                    handler("place_" + next_id)
                }).catch(function (err) {
                    console.log(err)
                })
        }
    }
    
    this.list_entries_in_local_db = function () {
        _self.db.allDocs({ include_docs: true, descending: true })
            .then(function (results) {
                if (results.total_rows > 0) {
                    $("#places .entries").empty()
                    for (var i in results.rows) {
                        var entry = results.rows[i]
                        if (typeof entry.doc.data !== "undefined") {
                            var $place_item = $('<li class="ui-menu-item submenu-item"><a id="'+entry.doc._id+'" href="#">' + entry.doc.data.name + '</a></li>')
                                $place_item.click(function (e) {
                                    _self.db.get(e.target.id).then(function (doc) {
                                        _self.go_to_location(doc.data)
                                    }).catch(function (err) {
                                        console.warn(err)
                                    })
                                })
                            $("#places .entries").append($place_item)
                        } else {
                            console.warn("Uncorrect entry", entry)
                        }
                    }
                    $("#places").menu({icons: { "submenu" : "ui-icon-grip-dotted-horizontal" } })
                    $("#places").show()
                }
            }).catch(function (err) {
                console.log(err)
            })
    }

    this.go_to_location = function (object) {
        //
        if (typeof _self.map === "undefined") {
            _self.init_map_area('map', true)
        }
        //
        _self.current_location = object
        _self.update_current_location_label()
        // render radius control at new place
        _self.render_radius_control()
        // then fire query
        _self.query_geo_objects(undefined, undefined, _self.render_geo_objects)
        _self.map.setView(_self.current_location.coordinate, _self.LEVEL_OF_STREET_ZOOM)
    }
    
    this.init_map_area = function (dom_el_id) {
        $('#map').empty()
        $('#map').addClass('outlined')
        $('#map').height('550px')
        $('#map').show()
        $('.search-option.d').css('display', 'inline-block')
        $('#detail-area').show()
        $("button.star").show()
        $("button.star").button()
        $("button.star").hover(function (e) {
            //
            $('button.star img').attr('src', '/de.kiezatlas.website/images/1441217865_black_5_favorite_star-white.png')
        }, function (e) {
            //
            $('button.star img').attr('src', '/de.kiezatlas.website/images/1441217865_black_5_favorite_star.png')
        })
        $('div.legende').show()
        // initiate map
        this.map = new L.Map(dom_el_id, {
            dragging: true, touchZoom: true, scrollWheelZoom: false,
            doubleClickZoom: true, zoomControl: false, minZoom: 9,
            maxBounds: _self.max_bounds,
        })
        // custom zoom control
        new L.control.zoom( { position: "topright" }).addTo(_self.map)
        // tile layer
        L.tileLayer('https://api.tiles.mapbox.com/v4/kiezatlas.map-feifsq6f/{z}/{x}/{y}.png?access_token=pk.eyJ1Ijoia2llemF0bGFzIiwiYSI6InFmRTdOWlUifQ.VjM4-2Ow6uuWR_7b49Y9Eg', {
            attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
            id: '_self.m7222ia5',
            accessToken: 'pk.eyJ1Ijoia2llemF0bGFzIiwiYSI6InFmRTdOWlUifQ.VjM4-2Ow6uuWR_7b49Y9Eg'
        }).addTo(_self.map)
        // paint standard location name
        _self.update_current_location_label()
        // render radius control at new place
        _self.render_radius_control()
        // then fire query
        _self.query_geo_objects(undefined, undefined, _self.render_geo_objects)
        // correct current default viewport
        _self.map.setView(_self.current_location.coordinate, _self.LEVEL_OF_STREET_ZOOM)
        //
        _self.render_location_button()
        _self.map.on('locationfound', _self.on_location_found)
        _self.map.on('locationerror', _self.on_location_error) // ### just if user answers "never"
        // re-render radius control after every zoomlevel-change
        /** _self.map.on('zoomend', function (e) {
            _self.render_radius_control(false)
        }) **/
    }

    /** object.name, object.lat, object.lng */
    this.update_current_location_label = function (hideStarButton) {
        // ### help to reset-view
        if (!_self.current_location.hasOwnProperty("name")) console.warn("Current location has no name")
        if (!_self.current_location.coordinate.hasOwnProperty("lat")) console.warn("Current location has no lat")
        if (!_self.current_location.coordinate.hasOwnProperty("lng")) console.warn("Current location has no lng")
        //
        var latitude, longitude;
            latitude = _self.current_location.coordinate.lat.toFixed(3)
            longitude = _self.current_location.coordinate.lng.toFixed(3)
        // ### sanity check for bigger berlin area before firing a range-query...
        $('.location-label .text').html(_self.current_location.name
            + ' <small>('+latitude+' N, '+longitude+' E)</small>')
        $('button.star').unbind('click')
        $('button.star').click(_self.add_entry_to_local_db)
        //
        if (typeof _self.map === "undefined") {
            _self.init_map_area('map', true)
        }
        //
        if (hideStarButton) {
            $('button.star').button("disable")
        } else {
            $('button.star').button("enable")
        }
    }

    this.render_radius_control = function (fitBounds) {
        // setup radius control
        if (typeof _self.radius_control !== "undefined") {
            _self.controlGroup.removeLayer(_self.radius_control)
            _self.map.removeLayer(_self.controlGroup)
        }
        _self.radius_control = new L.CircleEditor(_self.current_location.coordinate, _self.default_radius, {
            color: "#343434", weight: 3, fillColor: "#FFCC33", /** #666 **/
            fillOpacity: .1, extendedIconClass: "extend-icon-medium",
            className: "leaflet-radius-control", clickable: false, zIndexOffset: 101
        })
        // add raduis control to map
        _self.controlGroup.addLayer(_self.radius_control)
        _self.controlGroup.addTo(_self.map)
        // add event handler to radius control
        _self.radius_control.on('edit', function (event) {
            // fire a new query
            var new_radius = event.target._mRadius
            _self.current_location.coordinate.lat = event.target._latlng.lat
            _self.current_location.coordinate.lng = event.target._latlng.lng
            // console.log("Update circle position event TO", event, _self.current_location)
            // ### on small screens (here, after dragging) our current center should be the mapcenter (fitBounds..)
            _self.query_geo_objects(event.target._latlng, new_radius, _self.render_geo_objects)
            _self.reverse_geocode()
        })
        // update viewport to the programmatically set radius-control
        if (fitBounds) {
            // _self.map.fitBounds(_self.controlGroup.getBounds())
            _self.map.setView(
                _self.controlGroup.getBounds().getCenter(),
                _self.LEVEL_OF_STREET_ZOOM)
        }
    }

    this.query_geo_objects = function (location, radius, success) {
        _self.show_spinning_wheel()
        var location_string = ''
        var radius_value = _self.default_radius
        if (typeof location === "undefined") {
            location_string = _self.current_location.coordinate.lng + ', '+_self.current_location.coordinate.lat
        } else {
            location_string = location.lng + ', '+location.lat
        }
        if (typeof radius !== "undefined") radius_value = radius
        $.getJSON('/kiezatlas/search/'+encodeURIComponent(location_string)+'/' + (radius_value / 1000),
            function (geo_objects) {
                _self.items = geo_objects
                if (typeof success !== "undefined") {
                    _self.clear_markers()
                    _self.hide_spinning_wheel()
                    success(geo_objects)
                }
            })
    }

    this.search_geo_objects = function (text, success) {
        _self.show_spinning_wheel()
        $.getJSON('/kiezatlas/search/?search='+encodeURIComponent(text), 
            function (geo_objects) {
                _self.items = geo_objects
                if (typeof success !== "undefined") {
                    // clear markers after fulltext-search
                    _self.clear_markers()
                    _self.hide_spinning_wheel()
                    success(geo_objects, true) // ####
                }
            })
    }

    this.show_marker_name_info = function (name) {
        $('#marker-name').html('<b>' + name + '</b>')
        $('#marker-name').show()
    }

    this.hide_marker_name_info = function () {
        $('#marker-name').hide()
    }

    this.render_geo_objects = function (data, set_view_to_bounds) {
        // ### if we do not clear markers (which would be nice), we should not render any duplicates ..
        var list_of_markers = []
        for (var el in data) {
            var result = data[el]
            if (result.hasOwnProperty("geo_coordinate_lat") && 
                result.hasOwnProperty("geo_coordinate_lon")) { // client-side sanity check of search results
                var coordinate = L.latLng(result["geo_coordinate_lat"], result["geo_coordinate_lon"])
                /** brighter blue #5a78f3, blue: "#1944fc" **/
                var circle = L.circleMarker(coordinate, {
                        color: "#FFCC33", strokeOpacity: 1, weight: 2, opacity: .5, fillColor: "#FC3", title: result["name"],
                        alt: "Markierung von " + result["name"], location_id: result["address_id"],
                        geo_object_id: result["id"], uri: result["uri"], name: result["name"],// riseOnHover: true,
                        bezirksregion_uri: result["bezirksregion_uri"], z_indexOffset: 1001
                    })// .bindPopup('<b>' + result["name"] + '</b>')
                // ### Level: 14 > 8px e.g. Level: 13 > 5px
                circle.setRadius(10)
                circle.on('click', function (e) {
                    _self.select_map_entry(e.target)
                })
                circle.on('mouseover', function (e) {
                    console.log("mouseover", e)
                    // ### display all geo_objects at this markers location
                    // var geo_objects_under_marker = _self.find_all_geo_objects(marker.options['location_id'])
                    _self.show_marker_name_info(e.target.options.name)
                })
                circle.on('mouseout', function (e) {
                    _self.hide_marker_name_info()
                })
                    // ### on hover show name in In-Map detail-window
                list_of_markers.push(circle)
            }
        }
        // maintain also all previously added markers
        if (typeof _self.markerGroup !== "undefined") {
            _self.markerGroup.eachLayer(function (marker) {
                if (!_self.exist_in_marker_listing(marker.options.geo_object_id, list_of_markers)) {
                    list_of_markers.push(marker)
                }
            })
        }
        // create updated/new feature/markerGroup
        _self.markerGroup = L.featureGroup(list_of_markers)
        _self.markerGroup.addTo(_self.map)
        if (set_view_to_bounds && list_of_markers.length > 0) {
            // _self.map.setMaxBounds(_self.markerGroup.getBounds())
            _self.map.fitBounds(_self.markerGroup.getBounds())
        }
    }

    this.select_map_entry = function (marker) {
        _self.markerGroup.eachLayer(function (el) {
            el.setStyle({ color: "#FFCC33", fillColor: "#FC3" })
            if (el.options['geo_object_id'] === marker.options['geo_object_id']) {
                // ### adding class name to path does not work
                marker.setStyle({ color: "#1944fc", weight: 3, fillColor: "#1944fc", className: "selected" })
                // marker.redraw()
            }
        })
        var geo_objects_under_marker = _self.find_all_geo_objects(marker.options['location_id'])
        _self.clear_details_area()
        _self.render_selected_details(geo_objects_under_marker)
    }

    this.render_selected_details = function (result_list) {
        // console.log("> render details for", result_list)
        for (var i in result_list) {
            $.getJSON('/kiezatlas/topic/'+result_list[i].options['geo_object_id'],
                function (geo_object) {
                    if (typeof geo_object !== "undefined") {
                        // make linkage work
                        if (typeof geo_object.bezirksregion_uri !== "undefined") {
                            var web_alias = geo_object.bezirksregion_uri.slice(18)
                            var topic_id = geo_object.uri.slice(19)
                            $('#detail-area').append('<div class="entry-card">'
                                + '<h3>'+geo_object.name+'</h3>'
                                + '<div class="details"><p>'+geo_object.address_name.toString()
                                + '</p>'
                                + '<a href="http://www.kiezatlas.de/map/'+web_alias+'/p/'+topic_id+'">Mehr Infos im Stadtplan</a>'
                                + '<a href="https://fahrinfo.bvg.de/Fahrinfo/bin/query.bin/dn?Z='+geo_object.address_name.toString()+'&REQ0JourneyStopsZA1=2&start=1&pk_campaign=_self.de"><img src="/de.kiezatlas.website/images/fahrinfo.gif"></a>'
                                + '</div>'
                            + '</div>')   
                        } else {
                            console.warn("Geo Object Bezirksregionen URI undefined", geo_object)
                        }
                    }
                }
            )
        }
    }

    this.clear_markers = function () {
        _self.map.eachLayer(function (el) {
            // ### do not remove control group
            if (el.hasOwnProperty('options') && el.options.hasOwnProperty('geo_object_id')) {
                _self.map.removeLayer(el)
            }
            _self.map.addLayer(_self.controlGroup)
        })
    }

    this.clear_details_area = function () {
        $('.search-option.d').remove()
        $('.entry-card').remove()
    }

    this.show_spinning_wheel = function (isLocating) {
        if (isLocating) {
            $('#location-input .spinning-wheel').show()
        } else {
            $('#spinning-wheel').show()
        }
    }

    this.hide_spinning_wheel = function (isLocating) {
        if (isLocating) {
            $('#location-input .spinning-wheel').hide()
        } else {
            $('#spinning-wheel').hide()
        }
    }

    this.find_all_geo_objects = function (coordinate_id) {
        var results = []
        _self.markerGroup.eachLayer(function (el) {
            if (el.options.location_id === coordinate_id) results.push(el)
        })
        return results
    }

    this.exist_in_marker_listing = function (geo_object_id, listing) {
        if (typeof listing !== "undefined") {
            for (var i in listing) {
                if (listing[i].options.geo_object_id === geo_object_id) {
                    // console.warn("Skipping to add an (already present) Geo Object ID to marker group list", geo_object_id)
                    return true
                }   
            }
        }
        return false
    }

    this.render_location_button = function () {
        var locateButton = '<a class="leaflet-control-zoom-loc" href="#" title="Your Location"></a>'
        $(locateButton).insertBefore(".leaflet-control-zoom-in")
        $(".leaflet-control-zoom-loc").click(_self.get_browser_location);
    }

    this.get_browser_location = function (options) {
        //
        if (!navigator.geolocation) {
            console.warn("Geolocation is not supported by your browser")
            return
        }
        //
        if (typeof options === "undefined") { // ??? do this options work for us?
            options =  {
                "setView" : true, "maxZoom" : _self.LEVEL_OF_DETAIL_ZOOM
            }
        }
        _self.map.locate(options)
    }

    this.on_location_found = function (e) {
        if (!_self.max_bounds.contains([e.latitude, e.longitude])) {
            // ### enable button for reset-view
            _self.current_location.name = 'Ihr aktueller Standort liegt au&szlig;erhalb '
                + 'unseres momentanen Einflu&szlig;bereichs. Wir k&ouml;nnen ihnen lediglich Daten aus dem '
                + 'Gro&szlig;raum Berlin anbieten. Bitte geben sie dazu z.B.: bei <a href="javascript:kiezatlas.focus_location_input_field()" '
                + '>B)</a> einen Stra&szlig;ennamen ein.'
            _self.update_current_location_label(true)
            // correct current map-viewport to default  (after a correct but insane location-query result)
            _self.map.setView(_self.current_location.coordinate, _self.LEVEL_OF_STREET_ZOOM)
        } else {
            _self.current_location.coordinate.lat = e.latitude
            _self.current_location.coordinate.lng = e.longitude
            // ### if location in berlin, do something smart (suggest to save location to favourites'db
                // ### complete error handling, for geo-name lookup
            _self.reverse_geocode()
        }
    }

    /**
      * As it turns out this is just called if location will \"never\" be shared with this website
      * but NOT if user decides to share location \"not this time\" (available in Firefox).
      */
    this.on_location_error = function (e) {
        _self.hide_spinning_wheel(true)
        _self.map.setView(_self.current_location.coordinate, _self.LEVEL_OF_DISTRICT_ZOOM)
        if (_self.max_bounds.contains([_self.current_location.coordinate.lat, _self.current_location.coordinate.lng])) {
            // render radius control at standard place
            _self.render_radius_control()
            // then fire query
            _self.query_geo_objects(undefined, undefined, _self.render_geo_objects)
        }
    }

    this.reverse_geocode = function (e) {
        $.getJSON('/kiezatlas/reverse-geocode/' + _self.current_location.coordinate.lat
                + ',' + _self.current_location.coordinate.lng, function (geo_names) {
            _self.hide_spinning_wheel(true)
            if (geo_names.results.length > 0) {
                var first_result = geo_names.results[0]
                var components = first_result.address_components
                var o = { coordinates : "" + _self.current_location.coordinate.lat + "," + _self.current_location.coordinate.lng }
                for (var i in components) {
                    var el = components[i]
                    if (el.types[0] === "route") {
                        o.street = el.long_name
                    } else if (el.types[0] === "sublocality_level_2") {
                        o.area = el.long_name
                    } else if (el.types[0] === "street_number") {
                        if (typeof el.long_name !== "undefined") o.street_nr = el.long_name
                    } else if (el.types[0] === "locality") {
                        o.city = el.long_name
                    } else if (el.types[0] === "postal_code") {
                        o.postal_code= el.long_name
                    }
                }
                _self.current_location.name = o.street + " " + o.street_nr + ", " + o.city
                if (typeof o.area !== "undefined") _self.current_location.name += " " + o.area
                _self.update_current_location_label()
            }
        })
    }

}
