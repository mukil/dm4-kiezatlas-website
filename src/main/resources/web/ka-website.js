
// Register Fulltext Search Handler
function search_fulltext_geo_objects() {
    var query = kiezatlas.get_fulltext_search_input()
    if (query.length >= 1) {
        query = encodeURIComponent(query + "*", "UTF-8")
        if (kiezatlas.getAngebotsinfoFilter()) {
            kiezatlas.do_text_search_angebotsinfos(query)
        } else {
            kiezatlas.do_text_search_geo_objects(query)
        }
    }
}

// Register Near-By Text Search Handler
function search_location_by_text() {
    var streetFocus = $("#near-by").val() + ' Berlin, Deutschland'
        streetFocus = encodeURIComponent(streetFocus, "UTF-8")
    $('.location-search-info').hide()
    // if a district filter is set on the website, remove it
    if (kiezatlas.district) kiezatlas.clear_district_filter()
    // GUI
    kiezatlas.show_spinning_wheel(true)
    //
    restc.do_geocode(streetFocus, function(response) {
        // GUI
        kiezatlas.hide_spinning_wheel(true)
        // Handling Response
        if (response.hasOwnProperty('results')) {
            // OK
            kiezatlas.set_locationsearch_results(response.results)
            kiezatlas.set_autocomplete_item(0) // Select the first
            if (response.results.length === 1) { // Easy, Focus, Hide Alternatives
                kiezatlas.focus_locationsearch_result()
                $('#street-alternatives').hide()
            } else if (response.results.length > 1) { // Focus, Render Alternatives
                kiezatlas.focus_locationsearch_result()
                kiezatlas.show_locationsearch_alternatives()
            } else {
                $('.location-search-info').html('Keinen Ort f&uuml;r diese Anfrage gefunden')
                $('.location-search-info').show()
            }
        } else { // ERROR
            console.warn("ERROR", "x: " + x + " s: " + s + " e: " + e)
            $('.location-search-info').html('Es ist in Fehler bei der Suche aufgetreten bitte probieren'
                + ' sie es erneut. Sollte dieser Fehler wiederholt auftreten bitte informieren sie uns per'
                + ' Email unter <a href="mailto:support@kiezatlas.de">support@kiezatlas.de</a>.')
            $('.location-search-info').show()
        }
    })
}

// kiezatlas hex colors
var colors = {
    "ka_blue": "#002856",       // circle control
    "blue": "#1944fc",          // unused
    "b_blue": "#5a78f3",        // unused
    "ka_water": "#ccdddd",      // unused
    "ka_red": "#8f1414",        // districs layer polygon outline
    "m_blue": "#5784b8",        // marker: medium blue outline and fill-in (selected)
    "ka_gold": "#EACA8F",       // marker: yellow fill-ine and outline (selected)
    "darkgrey": "#343434",      // unused
    "bright_grey": "#a9a9a9",   // unused
    "grey": "#868686",          // unused
    "yellow": "#FFCC33"         // circle control
}

var settings = {
    "webappTitle" : "Kiezatlas 2 Website",
    "historyApiSupported" : window.history.pushState
}

var kiezatlas = (function($, angebote, leafletMap, restc, favourites) {

    // Website Application Model
    var model = {
        "district": undefined,        // Selected Bezirk Topic: Applies a ID-Filter to all subsequent Requests
        "districts": [],              // Bezirks- & Bezirksregionen Child Topics
        "locationsearch_results": [], // near-by search street-alternatives
        "autocomplete_item": 0,
        "view_angebote" : false
    }

    this.setDistrict = function(district) { model.district = district }
    this.getDistrict = function() { return model.district }
    this.setAngebotsinfoFilter = function(value) { model.view_angebote = value }
    this.getAngebotsinfoFilter = function() { return model.view_angebote }
    this.setDistricts = function(districts) { model.districts = districts }
    this.getDistricts = function() { return model.districts }

    var _self = this

    /** Renders either the
     *  - Standard Frontpage (Berlin wide) with Einrichtungen or Angeboten
     *  - District Frontpage (District Infos, District Fulltext search)
     **/
    this.render_page = function(name) {
        // get current page alias
        var hash = window.location.hash
        if (!hash || hash === "#karte" || hash === "#logout/") {
            // render main kiezatlas page
            _self.render_map(true, undefined, false) // detectLocation=true
            _self.load_district_topics(function(e) {
                _self.show_district_listing()
            })
        } else if (name === "angebote" || hash === "#angebote") {
            _self.render_map(false, undefined, false) // detectLocation=false
            _self.show_angebote_page()
            _self.load_district_topics(function(e) {
              _self.show_district_listing()
            })
        } else {
            _self.load_district_topics(function() {
                _self.show_district_listing()
                var bezirksTopic = _self.get_bezirks_topic_by_hash(hash)
                _self.setDistrict(bezirksTopic)
                if (_self.getDistrict()) {
                    _self.render_map(false, undefined, false) // detectLocation=false
                    // sets mitte filter
                    _self.show_district_page(_self.getDistrict().id)
                }
            })
        }
    }

    this.render_map = function(detectLocation, zoomLevel, jumpToMap) {
        if (!leafletMap.is_initialized()) {
            _self.setup_map_area('map', false)
        }
        if (jumpToMap) leafletMap.show_anchor()
        if (detectLocation) _self.get_browser_location()
        if (zoomLevel) leafletMap.map.setZoom(zoomLevel)
    }

    this.render_user_menu = function(state) {
        if (state) {
            $('li.login').remove()
            $('li.new a').attr("href", "/website/topic/create")
            $('li.logout').show()
        } else {
            $('li.angebote-my').hide()
            $('li.login').show()
            $('li.logout').hide()
        }
    }

    this.show_angebote_page = function() {
        _self.set_anchor("angebote")
        _self.setAngebotsinfoFilter(true)
        _self.set_fulltext_search_placeholder("Volltextsuche in Angeboten")
        var $legende = $('div.legende')
        if ($legende.children('a.angebote-control').length === 0) {
            $legende.append('<a class="angebote-control" href="javascript:kiezatlas.clear_angebote_page()">'
                + 'Umkreissuche aktivieren</a>')
        } else {
            $('a.angebote-control').show()
        }
        $('a.lock-control').hide()
        $('a.district-control').hide()
        leafletMap.deactivate_circle_control()
        leafletMap.remove_circle_search_control()
        //
        restc.load_current_angebotsinfos(function(offers) {
            _self.render_map(false, undefined, false)
            leafletMap.clear_circle_marker()
            leafletMap.setItems(offers)
            leafletMap.render_geo_objects(true)
        })
    }

    this.clear_angebote_page = function() {
        _self.set_anchor("")
        _self.setAngebotsinfoFilter(false)
        _self.set_fulltext_search_placeholder("Volltextsuche")
        $('a.angebote-control').hide()
        $('a.district-control').hide()
        $('a.lock-control').show()
        leafletMap.clear_circle_marker()
        leafletMap.activate_circle_control()
        leafletMap.setCurrentLocationCoordinate(leafletMap.map.getCenter())
        leafletMap.render_circle_search_control(true)
        _self.do_circle_search(undefined, undefined)
        _self.do_reverse_geocode()
    }

    this.show_district_page = function(topic_id) {
        _self.setDistrict(_self.get_bezirks_topic_by_id(topic_id))
        var bezirk_html = _self.getDistrict().html
        var bezirk_name = _self.getDistrict().value
        var anchor_name = '#' + encodeURIComponent(bezirk_name.toLowerCase())
        $('.location-label .text').html("Berlin " + bezirk_name) // duplicate, use render_current_location_label
        $('button.star').hide()
        // TODO: rewrite filter button container
        if ($('div.legende').children('a.district-control').length === 0) {
            $('div.legende').append('<a class="district-control" href="javascript:kiezatlas.clear_district_page()">'
                + 'Bezirksfilter aufheben</a>')
        }
        _self.set_fulltext_search_placeholder("Volltextsuche für " + bezirk_name)
        $('a.lock-control').hide()
        $('#district-area').html(bezirk_html).show()
        // ### leafletMap.map.doubleClickZoom.enable();
        leafletMap.show_anchor(anchor_name)
        leafletMap.deactivate_circle_control()
        leafletMap.remove_circle_search_control()
        _self.show_message("Hinweis: Die Volltextsuche liefert ab jetzt nur noch Ergebnisse aus dem Bezirk <em>"
            + bezirk_name + "</em>. W&auml;hlen sie <em>Bezirksfilter aufheben</em> um wieder Berlinweit"
            + " Einrichtungen zu finden.", 7000)
        _self.update_document_title(undefined, bezirk_name)
        _self.show_spinning_wheel()
        $.getJSON('/website/bezirk/' + topic_id, function (response) {
            leafletMap.clear_circle_marker()
            _self.hide_spinning_wheel()
            leafletMap.setItems(response)
            leafletMap.render_geo_objects(true)
        })
    }

    this.clear_district_page = function() {
        $('#district-area').hide()
        _self.clear_district_filter()
        leafletMap.clear_circle_marker()
        leafletMap.activate_circle_control()
        leafletMap.setCurrentLocationCoordinate(leafletMap.map.getCenter())
        leafletMap.render_circle_search_control(false) // fitBounds=false
        leafletMap.map.setZoom(mapping.zoomKiezLevel)
        _self.do_circle_search(undefined, undefined)
        _self.do_reverse_geocode()
    }

    this.clear_district_filter = function() {
        _self.setDistrict(undefined)
        _self.set_fulltext_search_placeholder("Volltextsuche")
        $('a.district-control').remove()
        $('a.lock-control').show()
        // leafletMap.map.doubleClickZoom.disable();
        leafletMap.show_anchor() // ### this updates address bar too
    }

    this.show_favourite_location = function(object) {
        if (!leafletMap.is_initialized()) {
            _self.setup_map_area('map', true)
        }
        leafletMap.setCurrentLocation(object)
        leafletMap.map.setView(leafletMap.getCurrentLocationCoordinate(), mapping.zoomStreetLevel)
        leafletMap.render_circle_search_control()
        _self.do_circle_search(undefined, undefined)
        _self.render_current_location_label()
    }

    this.setup_map_area = function(dom_el_id) {
        var $map = $('#map')
            $map.empty()
            $map.addClass('outlined')
            $map.height('550px')
            $map.show()
        var $star_button = $("button.star")
            $star_button.show()
            $star_button.button()
            $star_button.hover(function (e) {
                $('button.star img').attr('src', '/de.kiezatlas.website/images/1441217865_black_5_favorite_star-white.png')
            }, function (e) {
                $('button.star img').attr('src', '/de.kiezatlas.website/images/1441217865_black_5_favorite_star.png')
            })
        $('.search-option.d').css('display', 'inline-block')
        $('#detail-area').show()
        $('div.legende').show()
        //
        leafletMap.setup(dom_el_id)
        leafletMap.listen_to('drag', function(e) {
            if (mapping.circleSearchLocked) {
                leafletMap.setCurrentLocationCoordinate(leafletMap.map.getCenter())
                leafletMap.setControlCircleRadiusValue(leafletMap.getControlCircleRadius())
                leafletMap.render_circle_search_control(false)
            }
        })
        leafletMap.listen_to('drag_end', function(e) {
            if (e.detail >= 8) {
                if (mapping.circleSearchActive && mapping.circleSearchLocked && !_self.getDistrict()) {
                    _self.do_circle_search(undefined, undefined)
                    _self.do_reverse_geocode()
                }
            }
        })
        leafletMap.listen_to('marker_select', function(e) {
            _self.clear_details_area()
            _self.show_selected_details(e.detail)
        })
        leafletMap.listen_to('marker_mouseover', function(e) {
            var geo_objects_under_marker = leafletMap.find_all_geo_objects(e.detail.target.options['location_id'])
            _self.show_marker_name_info(geo_objects_under_marker)
        })
        leafletMap.listen_to('marker_mouseout', function(e) {
            _self.hide_marker_name_info()
        })
        leafletMap.listen_to('circle_control_edit', function(e) {
            // ### on small screens (here, after dragging) our current center should be the mapcenter (fitBounds..)
            // ### TODO: dont query if given location and given radius "equals" our latest "query settings"
            _self.do_circle_search(leafletMap.getCurrentLocationCoordinate(), e.detail)
            _self.do_reverse_geocode()
        })
        leafletMap.listen_to('locating_success', function(e) {
            leafletMap.setCurrentLocationCoordinate(new L.latLng(e.detail.latitude, e.detail.longitude))
            leafletMap.activate_circle_control()
            leafletMap.render_circle_search_control()
            _self.setDistrict(undefined)
            _self.do_circle_search(leafletMap.getCurrentLocationCoordinate(), undefined)
            leafletMap.map.fitBounds(leafletMap.getControlCircleBounds())
            _self.do_reverse_geocode()
        })
        leafletMap.listen_to('locating_error', function(e) {
            leafletMap.render_circle_search_control()
            _self.render_current_location_label()
            _self.do_circle_search(undefined, undefined)
            _self.do_reverse_geocode()
        })
        _self.render_browser_location_button()
        _self.render_current_location_label()
        leafletMap.render_circle_search_control()
    }

    this.focus_locationsearch_result = function() {
        var item = model.locationsearch_results[model.autocomplete_item]
        if (item) {
            if (!mapping.maxBounds.contains([item.geometry.location.lat, item.geometry.location.lng])) {
                // ### Message will not FIT if result is NOT in Bounds AND there is just ONE result!
                leafletMap.setCurrentLocationName('Der erste gefundene Standort liegt au&szlig;erhalb '
                    + 'von Berlin, bitte w&auml;hlen sie eine der Alternativen rechts:')
                _self.render_current_location_label(true)
                leafletMap.show_anchor()
                leafletMap.map.setView(leafletMap.getCurrentLocationCoordinate(), mapping.zoomStreetLevel)
            } else {
                leafletMap.show_anchor()
                leafletMap.setCurrentLocationCoordinate(new L.latLng(item.geometry.location.lat, item.geometry.location.lng))
                leafletMap.setControlCircleRadiusValue(900) // adapt circle size for this search a bit ###
                leafletMap.setCurrentLocationName(item['formatted_address'])
                leafletMap.activate_circle_control()
                leafletMap.render_circle_search_control()
                leafletMap.map.panTo(leafletMap.getCurrentLocationCoordinate())
                _self.setDistrict(undefined)
                _self.render_current_location_label()
                _self.do_circle_search(undefined, undefined)
            }
            /*** $("#near-by").val(item['formatted_address'])
            // Display marker at found location
            if (_self.location_circle) leafletMap.map.removeLayer(_self.location_circle)
            _self.location_circle = new L.circle(item.geometry.location, 200, {"stroke": true,
                "clickable": false, "color": "#dae3f8", "fillOpacity": 0.6, "opacity": 0.8, "weight":10})
            leafletMapf.map.addLayer(_self.location_circle, {"clickable" : false}) **/
        } else {
            throw new Error("Autocomplete item is undefined", item, model.autocomplete_item)
        }
    }

    this.show_locationsearch_alternatives = function() {
        var prev_location = model.locationsearch_results[model.autocomplete_item - 1]
        var next_location = model.locationsearch_results[model.autocomplete_item + 1]
        var $prev = "", $next = ""
        if (prev_location) {
            $prev = $('<a class="prev-location" title="'+ prev_location['formatted_address'] +'"><</a>')
            $prev.click(function(e) {
                model.autocomplete_item = model.autocomplete_item - 1
                _self.focus_locationsearch_result()
                _self.show_locationsearch_alternatives()
            })
        } else { // empty "prev" button
            $prev = $('<a class="prev-location defused" title=""><</a>')
        }

        if (next_location) {
            $next = $('<a class="next-location" title="'+ next_location['formatted_address'] +'">></a>')
            $next.click(function(e) {
                model.autocomplete_item = model.autocomplete_item + 1
                _self.focus_locationsearch_result()
                _self.show_locationsearch_alternatives()
            })
        } else { // empty "next" button
            $next = $('<a class="next-location defused" title="">></a>')
        }
        $('#street-alternatives').html(model.locationsearch_results.length + ' Ergebnisse').append($prev).append($next)
        $('#street-alternatives').css("display", "inline-block")
        $('#street-alternatives').show()
    }

    this.render_current_location_label = function(hideFavBtn) {
        var currentLocation = leafletMap.getCurrentLocation()
        if (!currentLocation.hasOwnProperty("name")) console.warn("Current location has no name")
        if (!currentLocation.coordinate.hasOwnProperty("lat")) console.warn("Current location has no lat")
        if (!currentLocation.coordinate.hasOwnProperty("lng")) console.warn("Current location has no lng")
        var latitude, longitude;
            latitude = leafletMap.getCurrentLocationLatitude().toFixed(3)
            longitude = leafletMap.getCurrentLocationLongitude().toFixed(3)
        $('.location-label .text').html(leafletMap.getCurrentLocationName()
            + ' <small>('+latitude+' N, '+longitude+' E)</small>')
        if (favourites.is_available()) {
            var $star_button = $('button.star')
                $star_button.unbind('click')
                $star_button.click(function(e) {
                    favourites.add_entry_to_local_db(leafletMap.getCurrentLocation())
                })
            if (hideFavBtn) {
                $star_button.button("disable")
            } else {
                $star_button.button("enable")
            }
        }
        _self.update_document_title(leafletMap.getCurrentLocationName())
    }

    this.show_selected_details = function(result_list) {
        if (result_list.length > 0) $('#district-area').hide()
        var list_geo_object_ids = []
        for (var i in result_list) {
            var geo_object_id = result_list[i].options['geo_object_id']
            list_geo_object_ids.push(geo_object_id)
            restc.load_geo_object_detail(geo_object_id, function(result) {
                _self.render_selected_details_card(result)
            })
        }
        angebote.load_geo_objects_angebote(list_geo_object_ids)
    }

    this.render_selected_details_card = function(object) {
        var imprint_html = _self.get_imprint_html(object)
        var web_alias = object.bezirksregion_uri.slice(18) // ### number of chars the prefix has
        var topic_id = object.uri.slice(19) // ### number of chars the prefix has)
        // var description = object.beschreibung
        var contact = object.kontakt
        var opening_hours = object.oeffnungszeiten
        var lor_link = _self.get_lor_link(object)
        var angebote_link = ''
        if (object.angebote_count > 0) {
            angebote_link = '<div class="angebote-link">'
                + '<a class="button" href="/website/topic/' + object.id + '">Aktuelle Angebote anzeigen</a></div>'
        }
        var body_text = ""
        // if (description) body_text += '<p><b>Info</b> ' + description + '</p>'
        if (typeof contact !== "undefined" && contact.value.length > 0) {
            // var fax = undefined, email = undefined, telefon = undefined, person = undefined
            var contact_text = "<br/>"
            // skipping ansprechpartner and email
            if (contact.childs.hasOwnProperty('ka2.kontakt.telefon')
                && contact.childs['ka2.kontakt.telefon'].value.length > 0) {
                contact_text += 'Tel.: ' + contact.childs['ka2.kontakt.telefon'].value  + '<br/>'
            }
            if (contact.childs.hasOwnProperty('ka2.kontakt.fax')
                && contact.childs['ka2.kontakt.fax'].value.length > 0) {
                contact_text += 'Fax: ' + contact.childs['ka2.kontakt.fax'].value
            }
            body_text += '<p><b>Kontakt</b>' + contact_text + '</p>'
        }
        if (typeof opening_hours !== "undefined"
            && opening_hours.length > 0) body_text += '<p><b>&Ouml;ffnungszeiten</b>' + opening_hours + '</p>'
        // _append_ to dom
        $('#detail-area').append('<div class="entry-card" id="details-'+object.id+'">'
            + '<h3>'+object.name+'</h3>'
            + '<div class="details">'
            + '<p>'
                + object.address_name.toString() + '<br/>'
                + '' + body_text + ''
            + '</p>'
            + angebote_link
            + '<a href="/website/topic/' + object.id + '" title="Zeige Details">Details zur Einrichtung</a>'
            /* + '<a href="http://www.kiezatlas.de/map/'+web_alias+'/p/'+topic_id+'" title="Diesen'
                + ' Datensatz in seinem ursprünglichen Stadtplan anzeigen">Details im Stadtplan</a>' **/
            + '<a href="https://fahrinfo.bvg.de/Fahrinfo/bin/query.bin/dn?Z=' + object.address_name.toString()
                + '&REQ0JourneyStopsZA1=2&start=1&pk_campaign=kiezatlas.de">'
                + '<img src="/de.kiezatlas.website/images/fahrinfo.gif"></a>'
            + '</div>'
            + lor_link
            + imprint_html
        + '</div>')
    }

    // --- Kiezatlas API Service helper

    this.load_district_topics = function(callback) {
        restc.load_district_topics(function(results) {
            _self.setDistricts(results.sort(_self.value_sort_asc))
            if (callback) callback()
        })
    }

    this.show_district_listing = function() {
        var bezirke = _self.getDistricts()
        for (var i in bezirke) {
            var district = bezirke[i]
            var bezirke_html = '<li ' + 'class="bezirk">'
                    bezirke_html += '<a class="district-button" id="' + district.id
                    + '" title="zur Bezirksseite '+ district.value
                    + '" href="javascript:kiezatlas.show_district_page('
                    + district.id + ')">' + district["value"] + '</a>'
                bezirke_html += '<ul class="bezirksregionen">'
                var subdistricts = district.childs.sort(_self.name_sort_asc)
                for (var k in subdistricts) {
                    var region = subdistricts[k]
                    // console.log("ka_subdistrict", region)
                    bezirke_html += '<li><a id="' + region["id"] + '">' + region["name"] + '</a></li>'
                }
                bezirke_html += '</ul>'
                bezirke_html += '</li>'
            var $bezirke = $(bezirke_html)
            $('ul.bezirke').append($bezirke)
        }
    }

    this.do_circle_search = function(location, radius) {
        _self.show_spinning_wheel()
        var location_string = ''
        var radius_value = radius
        if (!radius) radius_value = leafletMap.getControlCircleRadius()
        if (!location) {
            location_string = leafletMap.getCurrentLocationLongitude() + ', '+ leafletMap.getCurrentLocationLatitude()
        } else {
            location_string = location.lng + ', '+location.lat
        }
        $.getJSON('/website/search/'+encodeURIComponent(location_string)+'/' + (radius_value / 1000),
            function (geo_objects) {
                if (geo_objects.length > 0) {
                    leafletMap.setItems(geo_objects) // ### let markers add up
                    leafletMap.clear_circle_marker()
                    leafletMap.render_geo_objects(false)
                } else {
                    _self.show_message('Keine Treffer in diesem Umkreis', 2000)
                }
                _self.hide_spinning_wheel()
            })
    }

    this.do_text_search_geo_objects = function(text) {
        var queryUrl = '/website/search/?search='+text
        var district = _self.getDistrict()
        if (district)  queryUrl = '/website/search/' + district.id + '/?search=' + text
        _self.clear_details_area()
        _self.show_spinning_wheel()
        $.getJSON(queryUrl, function (geo_objects) {
                console.log("> Text based Geo Object Search returned", geo_objects)
                // If search results are not zero
                if (geo_objects.length > 0) {
                    // ### for resultsets bigger than 100 implement an incremental rendering method
                    leafletMap.setItems(geo_objects)
                    leafletMap.clear_circle_marker()
                    leafletMap.render_geo_objects(true)
                    _self.hide_spinning_wheel()
                } else {
                    _self.hide_spinning_wheel()
                    _self.show_message('Keine Treffer f&uuml;r diese Suche')
                }
            })
    }

    this.do_text_search_angebotsinfos = function(text) { // Remove Duplicate Lines
        var queryUrl = '/angebote/search/geoobjects/?search=' + text
        _self.clear_details_area()
        _self.show_spinning_wheel()
        $.getJSON(queryUrl, function (geo_objects) {
                console.log("> Text based Angebotsinfo Search returned", geo_objects)
                // TODO: If search results are zero
                if (geo_objects.length > 0) {
                    // ### for resultsets bigger than 100 implement an incremental rendering method
                    leafletMap.setItems(geo_objects)
                    leafletMap.clear_circle_marker()
                    leafletMap.render_geo_objects(true)
                    _self.hide_spinning_wheel()
                } else {
                    _self.hide_spinning_wheel()
                    _self.show_message('Keine Treffer f&uuml;r diese Suche')
                }
            })
    }

    this.do_reverse_geocode = function(e) {
        $.getJSON('/website/reverse-geocode/' + leafletMap.getCurrentLocationLatitude()
                + ',' + leafletMap.getCurrentLocationLongitude(), function (geo_names) {
            _self.hide_spinning_wheel(true)
            if (geo_names.results.length > 0) {
                var first_result = geo_names.results[0]
                var components = first_result.address_components
                var o = { coordinates : "" + leafletMap.getCurrentLocationLatitude() + "," + leafletMap.getCurrentLocationLongitude() }
                for (var i in components) {
                    var el = components[i]
                    if (el.types[0] === "route") {
                        if (typeof el.long_name !== "undefined") o.street = el.long_name
                    } else if (el.types[0] === "sublocality_level_1") {
                        if (typeof el.long_name !== "undefined" && el.long_name) o.district = el.long_name.replace("Bezirk ", "")
                    } else if (el.types[0] === "street_number" ) {
                        if (typeof el.long_name !== "undefined" && el.long_name) o.street_nr = el.long_name
                    } else if (el.types[0] === "locality") {
                        if (typeof el.long_name !== "undefined" && el.long_name) o.city = el.long_name
                    } else if (el.types[0] === "postal_code") {
                        if (typeof el.long_name !== "undefined" && el.long_name) o.postal_code= el.long_name
                    }
                }
                // console.log("Reverse Geo Code, Street: " + o.street + " Hausnr: " + o.street_nr + " City: " + o.city + " PLZ: " + o.postal_code)
                var location_name  = o.street + " "
                // Append street nr to street name
                if (o.street_nr) location_name += o.street_nr + ", "
                // Append name of District OR (if unknown) City
                if (o.district) {
                    location_name += " " + o.district
                } else if (o.city) {
                    location_name += " " + o.city
                }
                leafletMap.setCurrentLocationName(location_name)
                _self.render_current_location_label()
            }
        })
    }

    // --- Simple HTML click handler

    this.toggle_circle_search_lock_button = function(e) {
        mapping.circleSearchLocked = (mapping.circleSearchLocked) ? false : true;
        if (mapping.circleSearchLocked) {
            $('.lock-control').text('Unlock circle')
            $('.leaflet-editing-icon').hide()
            leafletMap.setCurrentLocationCoordinate(leafletMap.map.getCenter())
            leafletMap.setControlCircleRadiusValue(leafletMap.getControlCircleRadius())
            leafletMap.render_circle_search_control()
        } else {
            $('.leaflet-editing-icon').show()
            $('.lock-control').text('Lock circle')
        }
    }

    this.toggle_location_menu = function(show) {
        if (show) {
            $('#main-menu .options').show()
            return
        }
        $('#main-menu .options').toggle()
    }

    this.add_nearby_button_handler = function() {
        var $option_a = $('.search-option.a')
            $option_a.on('touchend', handle_option_a)
            $option_a.on('click', handle_option_a)
        var $option_b = $('.search-option.b')
            $option_b.on('touchend', _self.focus_location_input_field)
            $option_b.on('click', _self.focus_location_input_field)
        var $option_c = $('.search-option.c')
            $option_c.on('touchend', _self.handle_option_c)
            $option_c.on('click', _self.handle_option_c)

        function handle_option_a (e) {
            // initialize map on browser location
            _self.render_map(true, null, true)
        }

    }

    this.handle_option_c = function(e) {
        // initiate map with edible circle control
        _self.render_map(false, mapping.zoomKiezLevel, true)
    }

    this.handle_option_b = function(e) {
        // initiate map with edible circle control but focus on street
        _self.render_map(false, mapping.zoomStreetLevel, true)
    }

    // --- GUI Manipulation Utility Methods
    
    this.set_fulltext_search_placeholder = function(hint) {
        $('#fulltext-search').attr("placeholder", hint)
    }

    this.get_fulltext_search_input = function() {
        return $('#fulltext-search').val()
    }

    this.show_marker_name_info = function(objects) {
        var names_html = ""
        var max_count = 4
        for (var o in objects) {
            names_html += "<b>" + objects[o].options.name + "</b><br/>"
            if (o === max_count) {
                names_html += "..."
                break
            }
        }
        var $marker_name = $('#marker-name', "#map")
        if ($marker_name.children().length > 0) {
            $marker_name.html(names_html)
            $marker_name.show()
        } else {
            $marker_name = $('<div id="marker-name">')
            $marker_name.html(names_html)
            $('#map').append($marker_name)
        }
    }

    this.hide_marker_name_info = function() {
        $('#marker-name', '#map').hide()
    }

    this.focus_location_input_field = function() {
        _self.toggle_location_menu(true)
        $('#location-input #near-by').focus()
    }

    this.show_spinning_wheel = function(isLocating) {
        if (isLocating) {
            $('#location-input .spinning-wheel').show()
        } else {
            $('#spinning-wheel').show()
        }
    }

    this.hide_spinning_wheel = function(isLocating) {
        if (isLocating) {
            $('#location-input .spinning-wheel').hide()
        } else {
            if ($('#spinning-wheel').css("display") !== "none")
                $('#spinning-wheel').hide()
        }
    }

    this.show_message = function(message, timeout) {
        $('#notification').show(200, "linear", function(e) {
            // set message (if any)
            if (message) {
                $('.message', this).html(message)
            }
            timer = (timeout) ? timeout : 4500
            // hide automatically
            setTimeout(function(e) {
                _self.hide_message_window(500)
            }, timer)
        })
    }

    this.close_message_window = function() {
        _self.hide_message_window(100)
    }

    this.hide_message_window = function(duration) {
        $('#notification').hide(duration, "linear")
    }

    this.render_browser_location_button = function() {
        var locateButton = '<a class="leaflet-control-zoom-loc" href="#" title="Your Location"></a>'
        $(locateButton).insertBefore(".leaflet-control-zoom-in")
        $(".leaflet-control-zoom-loc").click(_self.get_browser_location);
    }

    this.clear_details_area = function() {
        $('.search-option.d').remove()
        $('.entry-card').hide(200, "linear", function (e) { this.remove() })
    }

    // Location based service helper

    this.get_browser_location = function(options) {
        //
        if (!navigator.geolocation) {
            console.warn("Geolocation is not supported by your browser")
            return
        }
        //
        if (typeof options === "undefined") { // ??? do this options work for us?
            options =  {
                "setView" : true, "maxZoom" : mapping.zoomDetailLevel
            }
        }
        leafletMap.map.locate(options)
    }

    this.set_anchor = function(custom_anchor) {
        if (custom_anchor) {
            window.document.location.href = window.document.location.protocol + '//' + window.document.location.host + "/#" + custom_anchor
        }
    }

    // --- Util

    this.get_imprint_html = function(entry) {
        var bezirk = _self.get_bezirks_topic(entry.bezirk_uri)
        var html = '<div class="imprint">'
        if (bezirk) {
            html += '<a href="' + bezirk.imprint + '" title="Impressum: Bezirksamt ' + bezirk.value + '">Impressum</a></div>'
        } else {
            console.warn("Missing Bezirks URI", entry)
            html += '</div>'
        }
        return html
    }

    this.get_lor_link = function(entry) {
        if (!entry.hasOwnProperty("lor_id")) return ""
        var html = '<div class="lor-link">'
            + '<a href="http://sozialraumdaten.kiezatlas.de/seiten/2014/12/?lor=' + entry.lor_id
            + '" title="zur Einwohnerstatistik des Raums (LOR Nr. ' + entry.lor_id +')">Sozialraumdaten</a></div>'
        return html
    }

    this.update_document_title = function(titlePrefix, titleAddon) {
        if (titlePrefix) window.document.title = titlePrefix + " - " + settings.webappTitle
        if (titleAddon) window.document.title = settings.webappTitle + " - " + titleAddon
    }

    this.name_sort_asc = function(a, b) {
        var nameA = a.name
        var nameB = b.name
        //
        if (nameA.toLowerCase() > nameB.toLowerCase()) // sort string descending
          return 1
        if (nameA.toLowerCase() < nameB.toLowerCase())
          return -1
        return 0 //default return value (no sorting)
    }

    // --- Website Model Operations

    this.get_current_location = function() {
        return leafletMap.getCurrentLocation()
    }

    this.get_bezirks_topic = function(uri) {
        for (var i in _self.getDistricts()) {
            var element = _self.getDistricts()[i]
            if (element.uri === uri) return element
        }
        return undefined
    }

    this.get_bezirks_topic_by_id = function(id) {
        for (var i in _self.getDistricts()) {
            if (_self.getDistricts()[i].id === id) return _self.getDistricts()[i]
        }
    }

    this.get_bezirks_topic_by_hash = function(hash) {
        for (var i in _self.getDistricts()) {
            var bezirk = _self.getDistricts()[i]
            var anchor_name = '#' + encodeURIComponent(bezirk.value.toLowerCase())
            if (anchor_name === hash) return bezirk
        }
    }

    this.set_autocomplete_item = function(index) {
        model.autocomplete_item = index
    }

    this.get_autocomplete_item = function() {
        return model.autocomplete_item
    }

    this.set_locationsearch_results = function(results) {
        model.locationsearch_results = results
    }

    this.get_locationsearch_results = function() {
        return model.locationsearch_results
    }

    return this

})($, angebote, leafletMap, restc, favourites)
