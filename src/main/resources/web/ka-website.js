

/** --- ka-website.js --- **/

/**
 * - Different Color Palette for Angebote Marker
 * - Permalinks for Selected Marker
 * - Include Category Names in Fulltext Search
 * + Show Place Labels on mouseover
 * + Encode Map Viewport into the URL
 * + Enable deep links into fulltext searches on map
 */

var settings = {
    "webapp_title" : "Kiezatlas 2 Website",
    "history_api_supported" : window.history.pushState
}
var updateURL = true            // If false, updating the url using replaceState is defunct (see text search requests)
var query = undefined           // Search User Input
var parameter = {               // View/Page Parameter
    page: undefined, viewport: undefined
}
var selected_marker = undefined // geoobject or marker id

// Map Input Search
function search_fulltext_geo_objects() {
    query = kiezatlas.get_fulltext_search_input()
    if (query.length >= 1) {
        query = encodeURIComponent(query, "UTF-8")
        if (kiezatlas.is_angebote_mode()) {
            kiezatlas.do_text_search_angebotsinfos(query, true)
        } else {
            kiezatlas.do_text_search_geo_objects(query, undefined, true)
        }
    }
}

function handle_fulltext_search_input(event) {
    if (event.keyCode === 13) {
        do_fulltext_search()
    }
}

// Navigation Bar Search
function do_fulltext_search() {
    query = kiezatlas.get_top_search_input()
    if (query.length >= 1) {
        $('#fulltext-search').val(query)
        kiezatlas.hide_sidebar()
        kiezatlas.do_text_search_geo_objects(query, undefined, true)
    }
}

function cleanUpAddress(addressValue) {
    if (addressValue) {
        return addressValue.replace(' Deutschland', '')
    }
}

/** function show_search_options() {
    $('#options-menu').show()
    $('#options-spacer').show("slow")
}

function hide_search_options() {
    $('#options-menu').hide()
    $('#options-spacer').hide("slow")
} **/

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
    karestc.do_geocode(streetFocus, function(response) {
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

var month_names_de = [ "Januar", "Februar", "März", "April", "Mai", "Juni",
    "Juli", "August", "September", "Oktober", "November", "Dezember" ];

// kiezatlas hex colors
var colors = {
    "ka_blue": "#002856",       // circle control
    "ka_red": "#8f1414",        // districs layer polygon outline
    "m_blue": "#5784b8",        // marker: medium blue outline and fill-in (selected)
    "ka_gold": "#EACA8F",       // marker: yellow fill-ine and outline (selected)
    "bright_grey": "#a9a9a9",   // circlemarker: fill-in
    "yellow": "#FFCC33",        // circle control
    "darkgrey": "#343434",      // unused
    "blue": "#1944fc",          // unused
    "b_blue": "#5a78f3",        // unused
    "ka_water": "#ccdddd",      // unused
    "grey": "#868686"           // unused
}

var kiezatlas = (function($, leafletMap, restc, favourites) {

    // Website Application Model
    var model = {
        "district": undefined,        // Selected Bezirk Topic: Applies a ID-Filter to all subsequent Requests
        "districts": [],              // Bezirks- & Bezirksregionen Child Topics
        "locationsearch_results": [], // near-by search street-alternatives
        "autocomplete_item": 0,
        "view_angebote" : false,
        // the new web application states
        "site_info" : undefined,
        "site_id" : undefined,
        "map_controls_results": false // false, means: map_controls_query
    }
    // District Page Specifics
    this.set_district = function(district) { model.district = district } // deprecated
    this.get_gistrict = function() { return model.district } // deprecated
    // Citymap Specific
    this.set_site_info = function(topic) { model.site_info = topic }
    this.set_site_id = function(topicId) { model.site_id = topicId }
    this.get_site_info = function() { return model.site_info }
    this.get_site_id = function() { return model.site_id }
    // Frontpage Specifics
    this.set_districts = function(districts) { model.districts = districts }
    this.get_districts = function() { return model.districts }
    this.set_frontpage_mode = function() {
        _self.set_site_info(undefined)
        _self.set_site_id(undefined)
    }
    // 
    this.set_angebotsfilter = function(value) { model.view_angebote = value }
    this.set_mapcontrol_mode_results = function() {
        model.map_controls_results = true
        leafletMap.deactivate_circle_control()
        leafletMap.remove_circle_search_control()
    }
    this.set_mapcontrol_mode_query = function(fitBounds) {
        model.map_controls_results = false
        if (!leafletMap.is_circle_query_active()) {
            leafletMap.activate_circle_control()
            leafletMap.render_circle_search_control(fitBounds)
            console.log("Activating circle query control...")
        } else {
            leafletMap.render_circle_search_control(fitBounds)
        }
    }
    // 
    this.is_kiezatlas_site = function() { return (model.siteId) }
    this.is_map_result_control = function() { return model.map_controls_results }
    this.is_map_query_control = function() { return !model.map_controls_results }
    this.is_angebote_mode = function() { return (model.view_angebote) }

    var _self = this

    this.do_logout = function() {
        restc.logout()
        window.document.location.reload()
    }

    this.init_page_navigation = function() {
        if (settings.history_api_supported) {
            window.onpopstate = function(e) {
                if (e.state) {
                    parameter = e.state
                    if (parameter.page === "#gesamt") {
                        parameter.viewport = e.state.viewport
                        // ### _self.render_gesamtstadtplan() ?
                    } else if (e.state.page === "#angebote") {
                        // ### render angebote page?
                    } else {
                        console.log("Pop Render Districts or Citymap Page", e.state)
                    }
                    // Currently we only pan the map if map is in "query" mode
                    if (parameter.viewport) {
                        var coords = L.latLng(parameter.viewport.center)
                        leafletMap.set_zoom(parameter.viewport.zoom)
                        leafletMap.pan_to(coords)
                        if (kiezatlas.is_map_query_control()) {
                            leafletMap.set_current_location_coords(coords)
                            leafletMap.activate_circle_control()
                            leafletMap.render_circle_search_control()
                            _self.do_circle_search()
                            _self.do_reverse_geocode()
                        }
                    } else {
                        console.log("No Viewport Parameter")
                    }
                }
            }
        }
    }

    this.get_search_keywords = function(query) {
        restc.load_search_keywords(query, function(els) {
            console.log("Loaded Search Keywords for ", query, "...", els)
        })
    }

    this.push_page_view = function(viewportState) {
        if (settings.history_api_supported) {
            if (viewportState && parameter) {
                var url = "/" +parameter.page + viewportState
                window.history.replaceState(parameter, settings.webapp_title, url)
            }
        } else {
            console.warn("window.history manipulation not supported", window.navigator)
        }
        console.log("Pushing page view parameter in ka-website.js")
    }

    this.create_viewport_parameter = function () {
        var mapView = leafletMap.get_map_viewport()
        var viewportState = undefined
        if (mapView) {
            viewportState = "?koordinate=" + mapView.center.lat.toFixed(5) + "," + mapView.center.lng.toFixed(5) + "&zoomstufe=" + mapView.zoom
        }
        return viewportState
    }

    this.update_page_parameter = function () {
        if (_self.is_kiezatlas_site()) {
            console.log("Kiezatlas Citymap", _self.get_site_id(), _self.get_site_info())
        } else if (_self.get_site_id()) {
            console.log("Kiezatlas Website Mode", _self.get_site_id(), _self.get_site_info().value)
        } /**else if (_self.is_map_result_control() && query) {
            if (_self.is_angebote_mode()) {
                parameter.page = "#angebotssuche=" + query
            } else {
                parameter.page = "#ortssuche=" + query
            }
        } else if (_self.is_angebote_mode()) {
            parameter.page = "#angebote"
        } else {
            parameter.page = "#gesamt"
        } **/
        parameter.page = "website"
        var viewportState = _self.create_viewport_parameter()
        _self.push_page_view(viewportState)
    }

    this.get_map_viewport_from_url = function() {
        var zoomStart = window.location.search.indexOf('&zoomstufe=')
        var zoomstufe = undefined
        if (zoomStart !== -1) {
            zoomstufe = window.location.search.slice(zoomStart + '&zoomstufe='.length)
        }
        var koordStart = window.location.search.indexOf('?koordinate=')
        var mapCenter = undefined
        if (koordStart !== -1) {
            var koordinate = window.location.search.slice(koordStart + '?koordinate='.length, zoomStart)
            mapCenter = L.latLng(koordinate.split(','))
        }
        if (!mapCenter && !zoomstufe) return undefined
        return { center: mapCenter, zoom: zoomstufe }
    }

    this.get_page_parameter_from_url = function() {
        var viewport = undefined // _self.get_map_viewport_from_url()
        var locationHash = window.location.hash
        var hashStart = 0, questStart = -1
        if (window.location.hash.indexOf("?") !== -1) { // Correcting Hash
            hashStart = window.location.hash.indexOf("#")
            questStart = window.location.hash.indexOf("?")
            locationHash = window.location.hash.slice(hashStart, questStart)
        }
        return {
            page: locationHash, viewport: viewport
        }
    }

    /** Renders either the
     *  - Standard Frontpage (Berlin wide) with Einrichtungen or Angeboten
     *  - District Frontpage (District Infos, District Fulltext search)
     *  - Kiezatlas Website
     **/
    this.render_page = function(name) {

        // 1) Render Bezirks-Gesamtstadtplan, Citymap (with specific Frontpage State)
        if (!name) { // get current page alias
            parameter = _self.get_page_parameter_from_url()
            var subdomain_mitte = (window.location.host.indexOf("mitte.") !== -1 || window.location.hostname.indexOf("mitte.") !== -1) ? true : false
            var bezirksTopic = undefined
            // RENDER SPECIFIC PAGE
            if (parameter.page) {
                if (parameter.page === "#gesamt") {
                    _self.render_gesamtstadtplan() // Renders GESAMTSTADTPLAN
                } else if (parameter.page === "#angebote") {
                    _self.show_angebote_page() // Renders ANGEBOTE_STADTPLAN
                } else if (parameter.page.indexOf("suche") !== -1) {
                    _self.render_search_page() // Renders SEARCH RESULTS STADTPLAN
                } else {
                    _self.load_district_topics(function() {
                        bezirksTopic = _self.get_bezirks_topic_by_hash(parameter.page)
                        if (bezirksTopic) { // Renders BEZIRKSPAGE
                            _self.render_bezirkspage(bezirksTopic)
                        } else {
                            _self.render_gesamtstadtplan() // Renders GESAMTSTADTPLAN
                            console.warn("Entschudligung, die Seite "+parameter.page+" konnte nicht geladen werden. ")
                        }
                     })
                }
            } else {
                 if (subdomain_mitte) {
                    _self.load_district_topics(function(e) {
                        bezirksTopic = _self.get_bezirks_topic_by_hash("#mitte")
                        _self.render_bezirkspage(bezirksTopic)  // Renders BEZIRKSPAGE
                    })
                 } else {
                    console.log("Fallback to render Gesamtstadtplan caused by Page Name",
                        name,"Anchor", parameter.page, "and unspecific Subdomain")
                    _self.render_gesamtstadtplan() // Renders GESAMTSTADTPLAN
                 }
            }

        // 2) Render Berlin-Gesamtstadtplan (with specific Frontpage State)
        } else {
            _self.render_gesamtstadtplan()
        }
    }

    this.render_gesamtstadtplan = function() {
        // render main kiezatlas page
        parameter.page = "#gesamt"
        if (parameter.viewport)  {
            leafletMap.set_current_location_coords(parameter.viewport.center)
            _self.render_map(true, { zoom: parameter.viewport.zoom, center: parameter.viewport.center }, false) // detectLocation=true
        } else {
            _self.render_map(true, undefined, false) // detectLocation=true
        }
        // render_district_menu() // should do "Gesamtstadtplan"
    }

    this.render_search_page = function() {
        var hashParam = window.location.hash
        _self.render_map(false, { zoom: parameter.viewport.zoom, center: parameter.viewport.center }, true) // detectLocation=true
        // ### re-use our set of client-side cacehd bezirks topics
        _self.load_district_topics(function(e) {
            _self.render_district_menu() // should do "Gesamtstadtplan"
        })
        if (parameter.page.indexOf("#angebotssuche") !== -1) { // RENDER ANGEBOTE SEARCH RESULT
            var searchParam = undefined
            if (hashParam.indexOf("?") !== -1) {
                searchParam = hashParam.slice("#angebotssuche=".length, hashParam.indexOf("?"))
            } else {
                searchParam = hashParam.slice("#angebotssuche=".length)
            }
            $('#fulltext-search').val(searchParam)
            _self.set_angebotsfilter(true)
        } else if (parameter.page.indexOf("#ortssuche") !== -1) { // RENDER PLACE SEARCH RESULT
            var searchParam = undefined
            if (hashParam.indexOf("?") !== -1) {
                searchParam = hashParam.slice("#ortssuche=".length, hashParam.indexOf("?"))
            } else {
                searchParam = hashParam.slice("#ortssuche=".length)
            }
            $('#fulltext-search').val(searchParam)
            _self.set_angebotsfilter(false)
        }
        _self.set_mapcontrol_mode_results()
        search_fulltext_geo_objects()
    }

    this.void = function() {
        //
    }

    this.render_bezirkspage = function(bezirksTopic) {
        if (bezirksTopic) {
            _self.set_site_info(bezirksTopic)
            _self.set_site_id(bezirksTopic.id)
            _self.load_marker_cluster_scripts()
            _self.render_map(false, parameter.viewport, false, true) // detectLocation=false
            // sets district filter
            _self.show_district_page(_self.get_site_info().id)
            _self.render_district_menu(bezirksTopic)
        } else {
            console.error("Critical - could not render bezirkspage due to missing bezirkstopic")
        }
    }

    this.render_kiezatlas_site = function(pageAlias) {
        citymap.render_kiezatlas_site(pageAlias)
    }

    this.load_marker_cluster_scripts = function() {
        var clusterStyle1 = document.createElement("link")
            clusterStyle1.setAttribute("href", "/de.kiezatlas.website/vendor/leaflet-1.3.1/MarkerCluster.css")
            clusterStyle1.setAttribute("rel", "stylesheet")
        var clusterStyle2 = document.createElement("link")
            clusterStyle2.setAttribute("href", "/de.kiezatlas.website/vendor/leaflet-1.3.1/MarkerCluster.Default.css")
            clusterStyle2.setAttribute("rel", "stylesheet")
        var clusterScript = document.createElement("script")
            clusterScript.setAttribute("src", "/de.kiezatlas.website/vendor/leaflet-1.3.1/leaflet.markercluster.js")
        document.head.appendChild(clusterStyle1)
        document.head.appendChild(clusterStyle2)
        document.head.appendChild(clusterScript)
        mapping.do_cluster_marker = true
    }

    this.render_map = function(ask_location, viewport, jump_to_map, mousewheelzoom, skipCircleSearch) {
        if (!leafletMap.is_initialized()) {
            _self.setup_map_area('map', mousewheelzoom, skipCircleSearch)
        }
        if (jump_to_map) {
            console.log("Render Map with Srolling into View...")
            // leafletMap.scroll_into_view()
        }
        if (ask_location) {
            _self.get_browser_location()
        }
        if (viewport) {
            if (viewport.zoom) {
                leafletMap.set_zoom(viewport.zoom)
            }
            if (viewport.center) {
                leafletMap.pan_to(viewport.center)
            }
        }
    }

    this.handle_bezirks_item_click = function(e) {
        var click_href = e.target.getAttribute("href")
        if (click_href.indexOf("/") === 0) {
            click_href = click_href.substr(1)
        }
        console.log("District Menu Item Clicked", click_href, "onStartseite", frontpage, "ka-website.js")
        if (frontpage && click_href === "#gesamt") {
            kiezatlas.clear_district_page()
            render_page("gesamt")
        } else if (frontpage) {
            var bezirksTopic = get_bezirks_topic_by_hash(click_href)
            searchContext = bezirksTopic.id
            render_page("bezirk")
        } else {
            window.document.location.assign(window.document.location.origin + "/website" + click_href)
        }
        // _self.hide_sidebar()
    }

    this.hide_sidebar = function() {
        if ($sidebarUi) {
            $sidebarUi.sidebar('hide')
        }
    }

    this.render_district_menu = function(districtVal) {
        var bezirke = _self.get_districts()
        var $bezirk = $('#bezirksauswahl')
            $bezirk.empty()
        // Render inactive/active "Gesamtstadtplan" button
        var $gesamt = $('<a href="#gesamt" id="gesamt" class="item gesamt">Gesamtstadtplan</a>')
            $gesamt.click(_self.handle_bezirks_item_click)
        if (!districtVal) $gesamt.addClass("active")
        $bezirk.append($gesamt)
        // ... Bezirke
        for (var idx in bezirke) {
            var bezirk = bezirke[idx]
            var anchor_name = '#' + encodeURIComponent(bezirk.value.toLowerCase())
            var $menuitem = $('<a href="'+anchor_name+'" id="'+encodeURIComponent(bezirk.value.toLowerCase())+'" class="item '+anchor_name+'">'+ bezirk.value +'</a>')
            if (districtVal) if (bezirk.id === districtVal.id) $menuitem.addClass('active')
            if (anchor_name.indexOf("marzahn") !== -1 || anchor_name.indexOf("reinickendorf") !== -1 || anchor_name.indexOf("pankow") !== -1) {
                $menuitem.addClass("disabled")
            } else {
                $menuitem.click(_self.handle_bezirks_item_click)
            }
            $bezirk.append($menuitem)
        }
    }

    this.show_angebote_page = function() {
        if (_self.is_angebote_mode()) {
            query = undefined
            $('#fulltext-search').val()
        }
        _self.set_angebotsfilter(true)
        _self.render_map(false, undefined, false, true)
        leafletMap.set_angebote_mode(true)
        _self.update_page_parameter()
        _self.set_fulltext_search_placeholder("Volltextsuche in Angeboten")
        var $legende = $('div.legende')
        if ($legende.children('a.circle-control').length === 0) {
            $legende.append('<a class="circle-control" href="javascript:kiezatlas.clear_angebote_page()">'
                + 'Einrichtungssuche</a>')
        } else {
            $('a.circle-control').show()
        }
        $('a.lock-control').hide()
        $('a.district-control').hide()
        $('span.angebote-btn').addClass('bold')
        $('span.einrichtungen-btn').removeClass('bold')
        _self.set_mapcontrol_mode_results()
        //
        restc.load_current_angebotsinfos(function(offers) {
            leafletMap.set_angebote_mode(true)
            leafletMap.clear_marker()
            leafletMap.set_items(offers)
            leafletMap.render_geo_objects(true)
        })
        // ### re-use our set of client-side cacehd bezirks topics
        _self.load_district_topics(function(e) {
            _self.render_district_menu() // should do "Gesamtstadtplan"
        })
    }

    this.clear_angebote_page = function() {
        $('span.einrichtungen-btn').addClass('bold')
        $('span.angebote-btn').removeClass('bold')
        _self.set_fulltext_search_placeholder("Volltextsuche Berlinweit")
        $('a.circle-control').hide()
        $('a.district-control').hide()
        $('a.lock-control').show()
        _self.set_angebotsfilter(false)
        leafletMap.set_angebote_mode(false)
        leafletMap.set_current_location_coords(leafletMap.get_map_center())
        leafletMap.map.setView(leafletMap.get_current_location_coords(), mapping.zoom_street)
        leafletMap.activate_circle_control()
        leafletMap.render_circle_search_control()
        _self.do_circle_search(undefined, undefined)
        _self.do_reverse_geocode()
        _self.update_page_parameter()
    }

    /** ### Refactor method signature... */
    this.show_district_page = function(topic_id) {
        _self.set_site_info(_self.get_bezirks_topic_by_id(topic_id))
        var bezirk_html = _self.get_site_info().html
        var bezirk_name = _self.get_site_info().value
        var bezirk_feed_url = _self.get_site_info().newsfeed
        $('.location-label .text').html("Berlin " + bezirk_name) // duplicate, use render_current_location_label
        $('.top.menu a.star').hide()
        // TODO: rewrite filter button container
        if ($('div.legende').children('a.district-control').length === 0) {
            $('div.legende').append('<a class="district-control" href="javascript:kiezatlas.clear_district_page()">'
                + 'Bezirksfilter aufheben</a>')
        }
        _self.set_fulltext_search_placeholder("Volltextsuche für " + bezirk_name)
        $('a.lock-control').hide()
        $('a.circle-control').hide()
        $('#site-area').show("flex")
        $('#site-area .content-area').html(bezirk_html + '<br/>'
            + '<a href="'+_self.get_site_info().imprint+'">Impressum</a>')
        // leafletMap.scroll_into_view()
        _self.set_mapcontrol_mode_results()
        _self.show_message("Die Volltextsuche liefert ab jetzt nur Ergebnisse aus dem Bezirk <em>"
            + bezirk_name + "</em>. W&auml;hlen sie <em>Bezirksfilter aufheben</em> um wieder Berlinweit"
            + " Einrichtungen zu finden.", 7000)
        _self.update_document_title(undefined, bezirk_name)
        _self.show_spinning_wheel()
        // Load Newsfeed in District
        _self.show_newsfeed_area(topic_id, bezirk_feed_url)
        // Load Geo Objects in District
        restc.load_district_topics(topic_id, function(response) {
            leafletMap.clear_marker()
            _self.hide_spinning_wheel()
            leafletMap.set_items(response)
            if (parameter.viewport) {
                leafletMap.render_geo_objects(false)
            } else {
                leafletMap.render_geo_objects(true)
            }
        })
    }

    this.show_newsfeed_area = function(topic_id, feedUrl) {
        restc.load_news_items(topic_id, function(results) {
            var html_item
            if (!results) {
                $('#site-area .news-area').hide()
            } else if (results.length > 0) {
                html_item = "<h2>Neuigkeiten</h2>"
                for (var r in results) {
                    html_item += '<div class="news-item">'
                        + '<span class="label date">' + _self.format_date(results[r].published) + '</span>'
                        + '<h3>' + results[r].title + '&nbsp;<a href="' + results[r].link+'" target="_blank">mehr Infos</a></h3>'
                    + '</div>'
                }
            } else {
                html_item = '<h2>Entschuldigen Sie bitte</h2>'
                html_item += '<div class="news-item">Der Newsfeed f&uuml;r diese Site (<a target="_blank" href="'
                        + feedUrl + '">Link</a>) konnte gerade nicht geladen werden.</div>'
            }
            $('#site-area .news-area').html(html_item)
        })
    }

    this.clear_district_page = function() {
        $('#site-area').hide()
        _self.clear_district_filter()
        mapping.do_cluster_marker = false
        leafletMap.set_current_location_coords(leafletMap.get_map_center())
        _self.set_mapcontrol_mode_query(true)
        leafletMap.set_zoom(mapping.zoom_kiez)
        _self.do_circle_search(undefined, undefined)
        _self.do_reverse_geocode()
    }

    this.clear_district_filter = function() {
        _self.set_frontpage_mode()
        _self.set_fulltext_search_placeholder("Volltextsuche Berlinweit")
        $('a.district-control').remove()
        $('a.lock-control').show()
        // leafletMap.map.doubleClickZoom.disable();
        // leafletMap.scroll_into_view()
    }

    this.show_favourite_location = function(object) {
        if (!leafletMap.is_initialized()) {
            _self.setup_map_area('map')
        }
        leafletMap.set_current_location(object)
        leafletMap.map.setView(leafletMap.get_current_location_coords(), mapping.zoom_street)
        leafletMap.activate_circle_control()
        leafletMap.render_circle_search_control()
        _self.do_circle_search(undefined, undefined)
        _self.render_current_location_label()
    }

    this.setup_map_area = function(dom_el_id, mouseWheelZoom, skipCircleSearch) {
        var $map = $('#map')
            $map.empty()
            $map.show()
        var $star_button = $('.top.menu a.star')
            $star_button.show()
            // $star_button.button()
            /** $star_button.hover(function (e) {
                $('button.star img').attr('src', '/de.kiezatlas.website/images/1441217865_black_5_favorite_star-white.png')
            }, function (e) {
                $('button.star img').attr('src', '/de.kiezatlas.website/images/1441217865_black_5_favorite_star.png')
            }) **/
        $('.search-option.d').css('display', 'inline-block')
        $('#detail-area').show("inline")
        $('div.legende').show()
        //
        leafletMap.setup(dom_el_id, mouseWheelZoom)
        _self.register_map_listeners()
        _self.render_browser_location_button()
        _self.render_current_location_label()
        if (!skipCircleSearch) leafletMap.render_circle_search_control()
    }

    this.register_map_listeners = function() {
        var mapMovedSkipLocating = false // a local var to influence the outcome of the "browser locating" query
        leafletMap.listen_to('drag', function(e) {
            if (leafletMap.is_circle_control_fixed() && _self.is_map_query_control()) {
                leafletMap.set_current_location_coords(leafletMap.get_map_center())
                leafletMap.set_circle_control_radius(leafletMap.get_circle_control_radius())
                leafletMap.activate_circle_control()
                leafletMap.render_circle_search_control(false)
            }
        })
        leafletMap.listen_to('zoom_end', function(e) {
            _self.update_page_parameter()
        })
        leafletMap.listen_to('drag_end', function(e) {
            if (e.detail >= 8) {
                if (leafletMap.is_circle_query_active() && leafletMap.is_circle_control_fixed()
                    && !_self.is_kiezatlas_site() && _self.is_map_query_control()) {
                    _self.do_circle_search(undefined, undefined)
                    _self.do_reverse_geocode()
                }
            }
            mapMovedSkipLocating = true
            _self.update_page_parameter()
        })
        leafletMap.listen_to('marker_select', function(e) {
            _self.clear_details_area()
            _self.show_selected_geo_details(e.detail)
            mapMovedSkipLocating = true
            selected_marker = e
        })
        leafletMap.listen_to('angebot_marker_select', function(e) {
            _self.clear_details_area()
            var geo_objects_under_marker = leafletMap.find_all_geo_objects(e.detail.options['address_id'])
            _self.show_selected_angebot_detail(e.detail, geo_objects_under_marker)
            mapMovedSkipLocating = true
            selected_marker = e
        })
        leafletMap.listen_to('marker_mouseover', function(e) {
            var geo_objects_under_marker = leafletMap.find_all_geo_objects(e.detail.target.options['address_id'])
            _self.show_marker_name_info(geo_objects_under_marker)
        })
        leafletMap.listen_to('marker_mouseout', function(e) {
            _self.hide_marker_name_info()
        })
        leafletMap.listen_to('circle_control_edit', function(e) {
            // ### on small screens (here, after dragging) our current center should be the mapcenter (fitBounds..)
            // ### TODO: dont query if given location and given radius "equals" our latest "query settings"
            leafletMap.set_circle_control_radius(e.detail)
            _self.do_circle_search(leafletMap.get_current_location_coords(), e.detail)
            _self.do_reverse_geocode()
            mapMovedSkipLocating = true
        })
        leafletMap.listen_to('locating_success', function(e) {
            console.info("location success by browser", window.navigator)
            if (!mapMovedSkipLocating) {
                leafletMap.set_current_location_coords(new L.latLng(e.detail.latitude, e.detail.longitude))
                leafletMap.activate_circle_control()
                leafletMap.render_circle_search_control()
                _self.do_circle_search(leafletMap.get_current_location_coords(), undefined)
                // leafletMap.map.fitBounds(leafletMap.get_circle_control_bounds())
                _self.do_reverse_geocode()
                _self.update_page_parameter()
            } else {
                console.log("Skip locatiing_error as user already interacted with the map", e)
            }
        })
        leafletMap.listen_to('locating_error', function(e) {
            if (!mapMovedSkipLocating) {
                console.warn("locating error detected by browser", window.navigator)
                leafletMap.render_circle_search_control()
                _self.render_current_location_label()
                _self.do_circle_search(undefined, undefined)
                _self.do_reverse_geocode()
            } else {
                console.log("Skip locatiing_error as user already interacted with the map", e)
            }
        })
    }

    this.focus_locationsearch_result = function() {
        var item = model.locationsearch_results[model.autocomplete_item]
        if (item) {
            if (!mapping.max_bounds.contains([item.geometry.location.lat, item.geometry.location.lng])) {
                // ### Message will not FIT if result is NOT in Bounds AND there is just ONE result!
                leafletMap.set_current_location_name('Der erste gefundene Standort liegt au&szlig;erhalb '
                    + 'von Berlin, bitte w&auml;hlen sie eine der Alternativen rechts:')
                _self.render_current_location_label(true)
                leafletMap.scroll_into_view()
                leafletMap.map.setView(leafletMap.get_current_location_coords(), mapping.zoom_street)
            } else {
                leafletMap.scroll_into_view()
                leafletMap.set_current_location_coords(new L.latLng(item.geometry.location.lat, item.geometry.location.lng))
                leafletMap.set_circle_control_radius(900) // adapt circle size for this search a bit ###
                leafletMap.set_current_location_name(item['formatted_address'])
                leafletMap.activate_circle_control()
                leafletMap.render_circle_search_control()
                leafletMap.map.panTo(leafletMap.get_current_location_coords())
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
        var location = leafletMap.get_current_location()
        if (!location.hasOwnProperty("name")) console.warn("Current location has no name")
        if (!location.coordinate.hasOwnProperty("lat")) console.warn("Current location has no lat")
        if (!location.coordinate.hasOwnProperty("lng")) console.warn("Current location has no lng")
        var latitude, longitude;
            latitude = leafletMap.get_current_location_lat().toFixed(3)
            longitude = leafletMap.get_current_location_lng().toFixed(3)
        $('.location-label .text').html(leafletMap.get_current_location_name()
            + ' <small>('+latitude+' N, '+longitude+' E)</small>')
        if (favourites.is_available()) {
            var $star_button = $('.top.menu a.star')
                $star_button.unbind('click')
                $star_button.click(function(e) {
                    favourites.add_entry_to_local_db(leafletMap.get_current_location())
                })
            if (hideFavBtn) {
                // $star_button.button("disable")
                $star_button.hide()
            } else {
                $star_button.show()
                // $star_button.button("enable")
            }
        }
        var newPageTitle = leafletMap.get_current_location_name()
        if (newPageTitle.indexOf("Ihr Standort liegt") === -1) {
            _self.update_document_title(leafletMap.get_current_location_name())
        }
    }

    this.show_selected_geo_details = function(result_list) {
        var list_of_marker_ids = []
        var $sidebar = $('#map-sidebar')
            $sidebar.empty()
            $sidebar.show()
        for (var i in result_list) {
            var marker_model = result_list[i].options
            var marker_id = marker_model['id']
            $sidebar.append('<div class="entry"><h3>' + marker_model.name + '</h3><a href="/website/geo/' + marker_id + '">'
                + '<i class="icon caret right"></i>mehr Infos</a></div>')
            list_of_marker_ids.push(marker_id)
            restc.load_geo_object_detail(marker_id, function(result) {
                _self.render_selected_details_card(result)
            })
        }
    }

    this.show_selected_angebot_detail = function(marker, geo_objects) {
        var model = marker.options
        var einrichtung = {id: model['location_id'], name: model['name'], address: model['address'] }
        restc.load_related_angebotsinfos(model['location_id'], function(results) {
            _self.render_selected_angebot_details_card(results, einrichtung)
        })
    }

    this.render_selected_angebot_details_card = function(results, location) {
        var angeboteHTML = ""
        for (var r in results) {
            var angebot = results[r]
            angeboteHTML += '<p><a class="ui button olive" href="/angebote/' + angebot.angebots_id + '" title="mehr Infos zum Angebot">'
                + angebot.angebots_name + ' ...</a></p>'
        }
        $('#detail-area').append('<div class="entry-card" id="details-'+location.id+'">'
            + '<h3>'+location.name+'</h3>'
            + '<div class="details angebote">'
            + '<p>' + cleanUpAddress(location.address) + '</p>'
            + '<p class="label">Aktuell ' + results.length + ' Angebot/e</p>' + angeboteHTML + '</div></div>')
    }

    this.render_selected_details_card = function(object) {
        var imprint_html = _self.get_imprint_html(object)
        var contact = object.kontakt
        var opening_hours = object.oeffnungszeiten
        var lor_link = _self.get_lor_link(object)
        var fahrinfoLink = '<a href="https://fahrinfo.bvg.de/Fahrinfo/bin/query.bin/dn?Z=' + object.address_name.toString()
                + '&REQ0JourneyStopsZA1=2&start=1&pk_campaign=kiezatlas.de">'
                + '<img src="/de.kiezatlas.website/images/fahrinfo.gif"></a>'
        var angebote_link = ''
        if (object.angebote_count > 0) {
            angebote_link = '<div class="angebote-link">'
                + '<a class="button" href="/website/geo/' + object.id + '">Aktuelle Angebote anzeigen</a></div>'
        }
        if (_self.get_site_info() && !_self.get_site_info().fahrinfoLink) {
            fahrinfoLink = ''
            console.log("Fahrinfo Link Disabled")
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
            body_text += '<p><b>Kontakt</b> ' + contact_text + '</p>'
        }
        if (typeof opening_hours !== "undefined"
            && opening_hours.length > 0) body_text += '<p><b>&Ouml;ffnungszeiten</b>' + opening_hours + '</p>'
        // _append_ to dom
        var unconfirmedClass = (object.unconfirmed) ? " unconfirmed" : ""
        $('#detail-area').append('<div class="entry-card' + unconfirmedClass + '" id="details-'+object.id+'">'
            + '<h3>'+object.name+'</h3>'
            + '<div class="details">'
            + '<p>'
                + object.address_name.toString() + '<br/>'
                + '' + body_text + ''
            + '</p>'
            + angebote_link
            + '<a href="/website/geo/' + object.id + '" title="Zeige Details" class="ui button olive">mehr Infos</a>'
            + fahrinfoLink
            + '</div>'
            + lor_link
            + imprint_html
        + '</div>')
    }

    // --- Kiezatlas API Service helper

    this.load_district_topics = function(callback) {
        restc.load_districts(function(results) {
            _self.set_districts(results.sort(restc.value_sort_asc))
            if (callback) callback()
        })
    }

    this.show_district_listing = function() {
        var bezirke = _self.get_districts()
        for (var i in bezirke) {
            var district = bezirke[i]
            var bezirke_html = '<li ' + 'class="bezirk ' + district.uri + '">'
                    bezirke_html += '<a class="district-button" id="' + district.id
                    + '" title="zur Bezirksseite '+ district.value
                    + '" href="javascript:kiezatlas.show_district_page('
                    + district.id + ')">' + district["value"] + '</a>'
                /** bezirke_html += '<ul class="bezirksregionen">'
                var subdistricts = district.childs.sort(_self.name_sort_asc)
                for (var k in subdistricts) {
                    var region = subdistricts[k]
                    // console.log("ka_subdistrict", region)
                    bezirke_html += '<li><a id="' + region["id"] + '">' + region["name"] + '</a></li>'
                }
                bezirke_html += '</ul>' **/
                bezirke_html += '</li>'
            var $bezirke = $(bezirke_html)
            $('ul.bezirke').append($bezirke)
        }
    }

    this.create_location_string = function(location) {
        var location_string = ''
        if (!location) {
            location_string = leafletMap.get_current_location_lng() + ', '+ leafletMap.get_current_location_lat()
        } else {
            location_string = location.lng.toFixed(4) + ', '+location.lat.toFixed(4)
        }
        return location_string
    }

    this.do_circle_search = function(location, radius) {
        _self.show_spinning_wheel()
        _self.set_mapcontrol_mode_query()
        var location_string = _self.create_location_string(location)
        var radius_value = radius
        if (!radius) radius_value = leafletMap.get_circle_control_radius()
        $.getJSON('/website/search/'+encodeURIComponent(location_string)+'/' + (radius_value / 1000),
            function (geo_objects) {
                if (geo_objects.length > 0) {
                    leafletMap.set_items(geo_objects) // ### let markers add up
                    leafletMap.clear_marker()
                    leafletMap.render_geo_objects(false)
                } else {
                    _self.show_message('Keine Treffer in diesem Umkreis', 2000)
                }
                _self.hide_spinning_wheel()
        })
    }

    this.do_text_search_geo_objects = function(text, callback, fitBounds) {
        _self.set_mapcontrol_mode_results()
        var queryUrl = '/website/search/?search='+text
        if (_self.get_site_id()) {
            queryUrl = '/website/search/' + _self.get_site_id() + '/?search=' + text
        }
        _self.show_searching_indicator()
        _self.show_spinning_wheel()
        $('span.einrichtungen-btn').addClass('bold')
        $('span.angebote-btn').removeClass('bold')
        $.getJSON(queryUrl, function (geo_objects) {
            // If search results are not zero
            if (geo_objects.length > 0) {
                // ### Todo: for resultsets bigger than 100 implement an incremental rendering method
                leafletMap.set_items(geo_objects)
                leafletMap.clear_marker()
                if (fitBounds) {
                    leafletMap.render_geo_objects(true) // fit bounds
                } else {
                    leafletMap.render_geo_objects(false)
                }
                _self.hide_spinning_wheel()
                _self.hide_searching_indicator()
            } else {
                _self.hide_spinning_wheel()
                _self.hide_searching_indicator()
                _self.show_message('Keine Treffer f&uuml;r diese Suche')
            }
            if (callback) callback(geo_objects)
        })
        if (updateURL) {
            _self.update_page_parameter()
        }
    }

    this.do_text_search_angebotsinfos = function(text, fitBounds) { // Remove Duplicate Lines
        var queryUrl = '/website/search/angebote?search=' + text
        // _self.clear_details_area()
        _self.set_mapcontrol_mode_results()
        _self.show_spinning_wheel()
        $.getJSON(queryUrl, function (geo_objects) {
            // TODO: If search results are zero
            if (geo_objects.length > 0) {
                // ### for resultsets bigger than 100 implement an incremental rendering method
                leafletMap.set_items(geo_objects)
                leafletMap.clear_marker()
                if (fitBounds) {
                    leafletMap.render_geo_objects(true) // fit bounds
                } else {
                    leafletMap.render_geo_objects(false)
                }
                _self.hide_spinning_wheel()
            } else {
                _self.hide_spinning_wheel()
                _self.show_message('Keine Treffer f&uuml;r diese Suche')
            }
        })
        if (updateURL) {
            _self.update_page_parameter()
        }
    }

    this.do_reverse_geocode = function(e) {
        restc.do_reverse_geocode(leafletMap, _self)
    }

    // --- Simple HTML click handler

    this.toggle_circle_search_lock_button = function(e) {
        // toggle state
        var state = (leafletMap.is_circle_control_fixed()) ? false : true
        leafletMap.set_circle_control_fixed(state)
        if (state) {
            if (_self.is_angebote_mode()) {
                _self.clear_angebote_page()
            }
            $('.lock-control').text('Umkreissuche')
            $('.leaflet-editing-icon').hide()
        } else {
            $('.leaflet-editing-icon').show()
            $('.lock-control').text('Kreis fixieren')
        }
    }

    this.toggle_location_menu = function(show) {
        if (show) {
            $('#nearby-area .options').show()
            return
        }
        $('#nearby-area .options').toggle()
    }

    this.add_page_input_handler = function() {
        $('.sidebar .bezirke .menu a').click(_self.handle_bezirks_item_click)
        // $('#text-search').on("keyup", handle_fulltext_search_input)
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
            _self.render_map(true, undefined, true, true)
        }

    }

    this.handle_option_c = function(e) {
        // initiate map with edible circle control
        _self.render_map(false, { zoom: mapping.zoom_kiez }, true, true)
    }

    this.handle_option_b = function(e) {
        // initiate map with edible circle control but focus on street
        _self.render_map(false, { zoom: mapping.zoom_street }, true, true)
    }

    // --- GUI Manipulation Utility Methods
    
    this.set_fulltext_search_placeholder = function(hint) {
        // $('#text-search').attr("placeholder", hint)
        $('#fulltext-search').attr("placeholder", hint)
    }

    this.get_fulltext_search_input = function() {
        return $('#fulltext-search').val()
    }

    this.get_top_search_input = function() {
        return $('#text-search').val()
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
            $marker_name.show()
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

    this.hide_searching_indicator = function() {
        $('.ui.search button .icon').removeClass("loading").removeClass("circle").removeClass('notched')
        $('.ui.search button .icon').addClass("search")
    }

    this.show_searching_indicator = function() {
        $('.ui.search button .icon').addClass("loading").addClass("circle").addClass('notched')
        $('.ui.search button .icon').removeClass("search")
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
        var $entryCards = $('.entry-card')
        $entryCards.hide(200, "linear", function () { $entryCards.remove() })
    }

    // Location based service helper

    this.get_browser_location = function(options) {
        //
        if (!navigator.geolocation) {
            console.warn("Geolocation is not supported by your browser")
        } else {
            //
            if (typeof options === "undefined") { // ??? do this options work for us?
                options =  {
                    "setView": true, "maxZoom": mapping.zoom_detail, enableHighAccuracy: true
                }
            }
            leafletMap.map.locate(options)
        }
    }

    // --- Util

    this.get_imprint_html = function(entry) {
        var bezirk = _self.get_bezirks_topic(entry.bezirk_uri)
        var html = '<div class="imprint">'
        if (bezirk) {
            html += '<a href="' + bezirk.imprint + '" target="_blank" '
                + 'title="Impressum: Bezirksamt ' + bezirk.value + '">Impressum</a></div>'
        } else {
            console.warn("Could not fetch Bezirks Topic by URI", bezirk, entry)
            html += '</div>'
        }
        return html
    }

    this.get_lor_link = function(entry) {
        if (!entry.hasOwnProperty("lor_id")) return ""
        var html = '<div class="lor-link">'
            + '<a href="http://sozialraumdaten.kiezatlas.de/seiten/2017/06/?lor=' + entry.lor_id
            + '" title="zur Einwohnerstatistik des Raums (LOR Nr. ' + entry.lor_id +')">Sozialraumdaten</a></div>'
        return html
    }

    this.update_document_title = function(titlePrefix, titleAddon) {
        if (titlePrefix) window.document.title = titlePrefix + " - " + settings.webapp_title
        if (titleAddon) window.document.title = settings.webapp_title + " - " + titleAddon
    }

    this.name_sort_asc = function(a, b) {
        var nameA = a.name
        var nameB = b.name
        //
        if (nameA.toLowerCase() > nameB.toLowerCase()) // sort string ascending
          return 1
        if (nameA.toLowerCase() < nameB.toLowerCase())
          return -1
        return 0 //default return value (no sorting)
    }

    // --- Website Model Operations

    this.get_current_location = function() {
        return leafletMap.get_current_location()
    }

    this.get_bezirks_topic = function(uri) {
        for (var i in _self.get_districts()) {
            var element = _self.get_districts()[i]
            if (element.uri === uri) return element
        }
        return undefined
    }

    this.get_bezirks_topic_by_id = function(id) {
        for (var i in _self.get_districts()) {
            if (_self.get_districts()[i].id === id) return _self.get_districts()[i]
        }
    }

    this.get_bezirks_topic_by_hash = function(hash) {
        for (var i in _self.get_districts()) {
            var bezirk = _self.get_districts()[i]
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

    this.format_date = function(timestamp) {
        try {
            var date = new Date(timestamp)
            var minutes = (date.getMinutes() < 10) ? "0" + date.getMinutes() : date.getMinutes()
            var hours = (date.getHours() < 10) ? "0" + date.getHours() : date.getHours()
            var date_string = '' + date.getDate() + '.' + month_names_de[date.getMonth()] + ' '
                        + date.getFullYear() + ', ' + date.getHours() + ':' + minutes + ' Uhr'
            return date_string
        } catch (e) {
            throw Error(e)
        }
    }

    return this

})($, leafletMap, karestc, favourites)
