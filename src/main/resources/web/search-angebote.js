


// --- Angebote Search UI Model -- Client State ---

var location_input = undefined
var location_coords = undefined
var location_radius = 1.5
var available_radiants = [ 0.5, 1.0, 1.5, 2.5, 5.0 ] //  10.0, 15.0
var search_input = []
var leading_wildcard = false
var street_coordinates = []
var street_coords_idx = 0
var time_parameter = undefined

var show_intersecting = true // flag if, by default the client should only
    // ... show search result items contained in all queries (spatial, time and fulltext)
// var show_inactive_offers = false// flag if, offers without an active assignment should be included

/** function init_search_page() {
    // load_username()
    // load tag cloud
    load_and_render_tag_search_dialog()
    // do search by time
    render_search_frontpage()
    tagging.init("query", function(e) {
        // console.log("Tag selection input handler received", e)
        fire_angebote_search()
    })
    if (window.history) {
        window.onpopstate = function(event) {
            render_search_frontpage()
        }
    }
    $sidebarUi = $('.ui.sidebar').sidebar('setting', 'dimPage', false)
} **/

// ----------------------------------  The Major Search Operations --------- //

function fire_angebote_search(query, callback) {
    var queryString = (typeof query === "undefined") ? searchText : query
    // leading_wildcard = $('.ui.checkbox.toggle').checkbox('is checked')
    if (queryString.length === 0 && !location_coords) {
        $('#query').attr("placeholder", "Bitte Suchbegriff eingeben").focus().attr("style", "border: 1px solid red")
        console.log("Aborted angebote search cause of missing user input")
        return
    }
    if (queryString === "*") {
        console.warn("Please specifiy a word to search for")
        return
    }
    // show_search_loading_sign()
    var dateTime = new Date().getTime()
    if (time_parameter) { // de-activate time parameter display
        time_parameter = undefined
    }
    var locationValue = undefined
    if (location_coords) { // existing geo-coodinates values have a higher priority
        locationValue = encodeURIComponent(location_coords.longitude.toFixed(4) + ","+ location_coords.latitude.toFixed(4))
    }
    // Parse text search parameter and prepare lucene query
    var text_input = queryString.split(",") // split by tag delimiter // ### clean up value
    search_input = []
    var luceneQueryString = ""
    for (var el in text_input) {
        var searchValue = ""
        var inputValue = text_input[el]
        if (text_input.length === 1) {
            if (leading_wildcard && !inputValue.startsWith("*")) searchValue += "*"
            searchValue += inputValue.trim()
            luceneQueryString = searchValue
            search_input.push(searchValue)
        // if more elements entered seperated by comma, ignore empty values " "
        } else if (text_input.length > 1 && inputValue.trim().length > 0) {
            if (leading_wildcard && !inputValue.startsWith("*")) searchValue += "*"
            searchValue += inputValue.trim()
            luceneQueryString += " " + searchValue
            search_input.push(searchValue)
        }
    }
    // display text parameter
    // ### render_query_parameter()
    // if (!noupdate) update_search_location_parameter()
    console.log("Angebote Query: " + luceneQueryString + ", Location", locationValue, "Radius", location_radius, "DateTime", dateTime, "Search Input", search_input)
    $.getJSON('/angebote/search?query=' + luceneQueryString + '&location=' + locationValue + '&radius='
            + location_radius + '&datetime=' + dateTime, function(angebote_results) {
        results = angebote_results
        if (callback) callback(angebote_results)
    })
}

function fire_angebote_timesearch() {
    var result = JSON.parse($.ajax('/angebote/filter/' + new Date().getTime(),
        { async: false, dataType: 'json' }).responseText)
    angebotsinfos = result // .timely query results are also assigned to .spatial (server side)
    render_angebote_search_results()
}

function focus_text_query() {
    $('#query').focus()
}

function focus_location_query() {
    $('#nearby').focus()
}

// ----------------------------------  Two Utility Search Operations -------- //

function do_search_streetcoordinates() {
    var locationString = $('#nearby').val().trim()
    searchNearby = locationString
    console.log("Staring nearby search for", searchNearby)
    show_results_container()
    show_loading_search()
    var $listing = $('.result-list .container')
    $.getJSON('/website/search/coordinates?query=' + encodeURIComponent(searchNearby), function(results) {
        if (results && results.length > 0) {
            street_coordinates = results
            select_locationsearch_parameter()
            if (get_search_input().length === 0) {
                $('.search-results .count').text("...")
                var message = "Wir konnten ihren gew&uuml;nschten Standort ermitteln ben&ouml;tigen jedoch noch einen Suchbegriff.<br/>"
                $listing.html(message)
                focus_text_query()
            } else {
                console.log("Found coordinates, firing angebote search...")
                do_angebote_search() 
            }
            replace_page_parameters()
        } else {
            console.log("Geo coding was unsuccesfull...")
            $('.search-results .count').text("0")
            var message = "F&uuml;r die Umkreissuche konnten wir mithilfe von Google leider keinen Standort ermitteln.<br/>"
                + '<br/>Bitte versuchen Sie es erneut.</br>'
            $listing.html(message)
        }
    }).fail(function() {
        console.log("Geo coding was unsuccesfull...")
        $('.search-results .count').text("0")
        var message = "Bei der Kommunikation mit der Google Maps Geo Coding API ist ein Fehler aufgetreten, wir konnten leider keinen Standort ermitteln.<br/>"
            + '<br/>Bitte versuchen Sie es erneut.</br>'
        $listing.html(message)
    })
}

function do_browser_location() {
    var $loc_status = $('.filter-area .parameter.location')
    if ($loc_status.length === 0) {
        $loc_status = $('<div class="parameter location">Standortermittlung angefragt ...</div>')
        $('.filter-area .query-parameter').append($loc_status)
    } else {
        $loc_status.html('Standortermittlung angefragt...')
    }
    // functionality provided by ka-locating.js script (dm4-kiezatlas-website)
    locating.get_browser_location(function(ok) {
        console.log("Location Detected", ok.coords, "Time Attribute", time_parameter, "Search Input", search_input)
        location_coords = ok.coords
        time_parameter = undefined
        $loc_status.empty()
        do_angebote_search()
    }, function(error) {
        var reason = "Position unavailable"
        if (error.code === 1) {
            reason = "Permission denied"
            $loc_status.html('<a class="close" href="javascript:remove_location_parameter()">x</a>Wir konnten deinen '
                + 'aktuellen Standort leider nicht automatisch ermitteln (' + reason + ')')
        } else if (error.code === 2) {
            $loc_status.html('<a class="close" href="javascript:remove_location_parameter()">x</a>Wir konnten deinen '
                + 'aktuellen Standort leider nicht automatisch ermitteln (' + reason + ')')
        } else if (error.code === 3) {
            reason = "Timeout"
        } else {
            console.warn("Standortermittlung fehlerhaft", error, reason)
        }
        location_coords = undefined
    }, {
        enableHighAccuracy: true, timeout: 7000, maximumAge: 0
    })
}

// ----------------------------------  Tagcloud Search View --------- //

function load_and_render_tag_search_dialog() {
    // $.getJSON('/tag/with_related_count/ka2.angebot', function(result) {
    $.getJSON('/angebote/tags', function(result) {
        result.sort(value_sort_desc)
        var $tags = $('.tag-view')
        for (var r in result) {
            var tag = result[r]
            var name = tag["value"]
            var tagHTML = '<a onclick="handle_tag_button_select(this)" id="'
                    + tag.id + '" class="few" ' // class="' + tag["view_css_class"] +'" '
                + 'title="Finde Angebotsinfos unter dem Stichwort ' + name + '">' + name + '</a>'
            if (r < result.length - 1) tagHTML += ", "
            $tags.append(tagHTML)
        }
    })
}

// --------------------------- GUI methods for rendering all Search UI elements ------------ //

/** function render_search_frontpage() {
    var queryParams = get_search_location_parameter()
    if (queryParams.length > 0 && queryParams[0] !== "") {
        search_input = queryParams
        location_coords = undefined
        // set search input to #query field..
        $('#query').val(search_input.join(", "))
        fire_angebote_search(true)
        // update_search_location()
    } else {
        fire_angebote_timesearch()
        time_parameter = "Heute"
        location_coords = undefined
        search_input = []
        render_query_parameter()
    }
} **/

/** 
 * 
 * @param {type} distinct_results   Render distinct result sets (both) for spatial and fulltext search.
 * @returns {undefined}
 */
function render_angebote_search_results(distinct_results) {
    var $listing = $('.result-list .container')
    var result_length = 0
    // ### maybe at some time, allow display of inactive offers, too
    if (angebotsinfos) {
        result_length = angebotsinfos.fulltext.length + angebotsinfos.spatial.length
    }
    // console.log("Split Search Results By Time", split_angebote_results_by_time(angebotsinfos))
    $listing.empty()
    if (!check_for_distinct_results_rendering() && !distinct_results) {  // Rendering of text and spatial search results combined
        // fetch intersecting search result items
        var intersection = preprocess_angebotsinfos()
        if (intersection.length > 0) {
            // apply spatial sorting
            intersection.sort(angebote_compare_by_distance_nearest_first)
            // render_result_header(intersection, $listing, '')
            for (var el in intersection) {
                var element = intersection[el]
                render_spatial_list_item(element, $listing)
            }
            $('.search-results .count').text(intersection.length)
        } else {
            var $header = $('<div>')
            if (angebotsinfos.spatial.length > 0 || angebotsinfos.fulltext > 0) {
                var count = (angebotsinfos.spatial.length + angebotsinfos.fulltext.length)
                $header.html('<p>Keine &Uuml;bereinstimmungen gefunden</p>'
                    + '<p>'+count+' Ergebnisse entsprechen zumindest <em>einem</em> der beiden Suchparameter</p>')
                var $button = $('<button class="ui basic small button">Alle Suchergebnisse anzeigen</button>')
                $button.click(function(e) {
                    // show_intersecting = false
                    render_angebote_search_results(true) // render distinct results
                })
                $header.append($button)
            } else {
                $header.html('<p class="status">Leider konnten wir f&uuml;r beide Suchparameter '
                    + '(<em>Standort</em> und <em>Stichwort</em>) keine aktuellen Angebote finden.</p>')
            }
            $listing.append($header)
        }
    } else { // Rendering of distinct search results per parameter
        if (angebotsinfos.spatial) {
            // special sorting by distance
            angebotsinfos.spatial.sort(angebote_compare_by_distance_nearest_first)
            // render_result_header(angebotsinfos.spatial, $listing, 'in der N&auml;he des Standorts')
            for (var el in angebotsinfos.spatial) {
                var element = angebotsinfos.spatial[el]
                render_spatial_list_item(element, $listing)
            }
        }
        // overall (text search listing) not necessarily with locations assigned
        if (angebotsinfos.fulltext) {
            angebotsinfos.fulltext.sort(angebote_compare_by_end_earliest_last)
            // render_result_header(angebotsinfos.fulltext, $listing, 'in der Stichwortsuche')
            for (var el in angebotsinfos.fulltext) {
                var element = angebotsinfos.fulltext[el]
                render_fulltext_list_item(element, $listing)
            }
        }
        $('.search-results .count').text(result_length)
    }
    // update status gui
    // var message = (result_length === 1) ? "1 Angebot" : result_length + " Angebote"
    if (result_length === 0) {
        $('.search-results .count').text("0")
        var message = "F&uuml;r diese Suche konnte wir leider keine aktuellen Angebote finden.<br/>"
            + '<br/>Sie k&ouml;nnen uns aber gerne helfen neue oder aktuelle '
            + 'Angebote in unsere <a class="create-link" href=\"/sign-up/login\">Datenbank aufzunehmen</a>.</br>'
        $listing.html(message)
    }
}

function check_for_distinct_results_rendering() {
    // Check if there are results of two query parameters to intersect
    if (angebotsinfos.spatial.length > 0 && angebotsinfos.fulltext.length > 0) {
        // Check if intersection is switched on and we do not have results for a timely search (frontpage only)
        if (show_intersecting && angebotsinfos.timely.length === 0) return false
    }
    return true
}

function preprocess_angebotsinfos() {
    var results = []
    for (var r in angebotsinfos.spatial) {
        var element = angebotsinfos.spatial[r]
        if (is_contained(element.angebots_id, angebotsinfos.fulltext)) {
            results.push(element)
        }
    }
    return results
}

function is_contained(elementId, list) {
    for (var li in list) {
        if (list[li].id === elementId) return true
    }
    return false
}

// ### @see show_inactive_offers
function split_angebote_results_by_time(items_to_render) {
    var split_time = new Date().getTime()
    // var latest_end = get_latest_angebote_end_time(element)
    var complete_resultset = {
        current: [], outdated: []
    }
    for (var idx in items_to_render) {
        for (var el in items_to_render[idx]) {
            var element = items_to_render[idx][el]
            // render_overall_list_item(element, $listing)
            var latest_end = get_latest_angebote_end_time(element)
            if (split_time > latest_end) {
                complete_resultset.outdated.push(element)
            } else {
                complete_resultset.current.push(element)
            }
        }
    }
    return complete_resultset
}

// -------------------------------------- Search UI Helper and Utility Methods ------------------- //

function select_locationsearch_parameter(idx) {
    if (street_coordinates.length > 0 && !idx) {
        location_coords = street_coordinates[0]
    } else if (street_coordinates.length > 0 && idx) {
        location_coords = street_coordinates[idx]
        street_coords_idx = idx
    } else {
        location_coords = undefined
    }
    time_parameter = undefined // clear "Heute"
    render_query_parameter()
}

function select_prev_locationsearch_result() {
    prev_idx = street_coords_idx - 1
    if (street_coords_idx === 0) {
        prev_idx = street_coordinates.length - 1
    }
    select_locationsearch_parameter(prev_idx)
}

function select_next_locationsearch_result() {
    next_idx = street_coords_idx + 1
    if (street_coords_idx === street_coordinates.length - 1) {
        next_idx = 0
    }
    select_locationsearch_parameter(next_idx)
}

function toggle_leading_wildcard() {
    fire_angebote_search()
}

function toggle_location_parameter_display($filter_area) {
    if (location_coords && searchType === "event") {
        // ### geo-coded address value has no "name" attribute
        var $locationParameter = $('.query-parameter .parameter.location')
        var parameterHTML = '<select id="nearby-radius" class="ui select" '
            + 'onchange="handle_location_form()" title="Entfernungsangabe für die Umkreissuche">'
        for (var ridx in available_radiants) {
            var option_value = available_radiants[ridx]
            if (location_radius == option_value) {
                parameterHTML += '<option value="'+option_value+'" selected>' + option_value + 'km</option>'
            } else {
                parameterHTML += '<option value="'+option_value+'">' + option_value + 'km</option>'
            }
        }
        parameterHTML += '</select>'
        parameterHTML += '&nbsp;in der N&auml;he von'
        parameterHTML += '<div class="name">'
        if (location_coords.name) { // cleanup location name
            if (location_coords.name.indexOf(', Germany') !== -1) {
                location_coords.name = location_coords.name.replace(', Germany', '')
            }
            if (location_coords.name.indexOf(' Berlin') !== -1) {
                location_coords.name = location_coords.name.replace(' Berlin', '')
            }
            parameterHTML += ' \"' + location_coords.name + '\"'
        }
        parameterHTML += ' <span class="coord-values">(' + location_coords.longitude.toFixed(3)
            + ', ' + location_coords.latitude.toFixed(3) + ')</span>'
        parameterHTML += '<a class="close" title="Standortfilter entfernen" href="javascript:remove_location_parameter()">x</a>'
        if (street_coordinates.length > 1) {
            parameterHTML += '<a class="prev close" title="Alternatives Ergebnis der Standortsuche nutzen" href="javascript:select_prev_locationsearch_result()">&#8592;</a>'
                + '<a class="next close" title="Nächstes Ergebnis der Standortsuche nutzen" href="javascript:select_next_locationsearch_result()">&#8594;</a> '
                + '<span class="alt-count">('+street_coordinates.length +' Standorte gefunden)</span>'
        }
        if ($locationParameter.length === 0) {
            $filter_area.append('<div class="parameter location" title="Standort-Suchfilter">' + parameterHTML + '</div>')
        } else {
            $locationParameter.html(parameterHTML)
        }
    } else {
        $('.query-parameter .parameter.location').remove()
    }
}

function toggle_time_parameter_display($filter_area) {
    if (time_parameter) {
        var $timeParameter = $('.filter-area .parameter.time')
        var parameterHTML = 'Heute<a class="close" title="Datumsfilter entfernen" href="javascript:remove_time_parameter(true)">x</a>'
        if ($timeParameter.length === 0) {
            $filter_area.append('<div class="parameter time" title="Zeitfilter der Anfrage">'+parameterHTML+'</div>')
        } else {
            $timeParameter.html(parameterHTML)
        }
    } else {
        $('.filter-area .parameter.time').remove()
    }
}

function render_text_parameter_display($filter_area) {
    // clean up gui
    $('.query-parameter .parameter.text').remove()
    if (search_input) {
        // paint gui
        for (var i in search_input) { // contains unique elements only
            var text_param = search_input[i].trim()
            if (text_param.length > 0) {
                $filter_area.append("<div class=\"parameter text " + text_param + "\" title=\"Text Suchfilter\">"
                    + "\"<span class=\"search-value\">" + text_param + "</span>\""
                    + "<a class=\"close\" title=\"Stichwortfilter entfernen\" onclick=\"javascript:remove_text_parameter('" + text_param + "', true)\">x</a></div>")
            }
        }
    }
}

function render_query_parameter() {
    var $query_area = $('.query-parameter')
    //
    toggle_location_parameter_display($query_area)
    //
    toggle_time_parameter_display($query_area)
    //
    render_text_parameter_display($query_area)
    //
    if (!search_input && !location_coords && !time_parameter) {
        $('.list-area .status').html("Bitte gib einen Suchbegriff ein oder w&auml;hle einen Standort")
    }
}

function update_search_location_parameter() {
    var newUrl = "/angebote?stichworte="
    if (search_input.length >= 1) {
        var newUrl = "?stichworte="
        for (var s in search_input) {
            newUrl += encodeURIComponent(search_input[s])
            if (s < search_input.length) newUrl += ";"
        }
    } else {
        newUrl = "/angebote"
    }
    if (window.history && newUrl !== "/angebote") {
        window.history.pushState({ data : search_input }, "", newUrl)
    }
}

function get_search_location_parameter() {
    var start = window.document.location.href.lastIndexOf("=")
    var parameter = []
    var containleadingWildcard = false
    if (start > 0) {
        var pathinfo = window.document.location.href.substr(start+1)
        if (pathinfo.lastIndexOf("#") !== -1) {
            pathinfo = pathinfo.substr(0, pathinfo.lastIndexOf("#"))
        }
        var args = pathinfo.split(";")
        for (var p in args) { // clean up url param ### fixme: complete
            var dm = args[p]
            if (dm.indexOf("%20") !== -1) dm = dm.split("%20").join(" ")
            if (dm.indexOf("*") !== -1) {
                containleadingWildcard = true
                dm = dm.split("*").join(" ")
            }
            parameter.push(dm)
        }
    } // else: clean up pathinfo about #query too
    if (containleadingWildcard) {
        $('.ui.checkbox.toggle').checkbox('check')
    }
    return parameter
}

function show_search_loading_sign() {
    $('.list-area .loading-indicator .icon').removeClass('hidden')
    $('.list-area .status').text('Suche Angebote')
    $('.list-area .results').empty()
}

function hide_search_loading_sign() {
    $('.list-area .loading-indicator .icon').addClass('hidden')
    $('#query').attr("style", "")
}

function remove_location_parameter() {
    location_coords = undefined
    $('#nearby').val('')
    render_query_parameter()
    if (!search_input && !time_parameter) {
        angebotsinfos = undefined
        render_angebote_search_results()
    } else {
        do_angebote_search()
    }
}

function remove_time_parameter(fireSearch) {
    time_parameter = undefined
    render_query_parameter()
    if (!search_input && !location_input) {
        angebotsinfos = undefined
        render_angebote_search_results()
    }
    if (fireSearch) do_angebote_search()
}

function remove_text_parameter(name, fireSearch) {
    // build up new list of parameter
    var new_search_input = []
    for (var i in search_input) {
        var el = search_input[i].trim()
        if (el !== name) {
            new_search_input.push(el)
        }
    }
    // paint new text parameter gui
    if (new_search_input.length === 0) {
        remove_all_text_parameter()
    } else {
        search_input = new_search_input
        // paint new list of parameter
        $('#query').val(new_search_input.join(","))
        render_query_parameter()
        // update_search_location()
        angebotsinfos = undefined
    }
    if (fireSearch) do_angebote_search()
}

function remove_all_text_parameter(e) {
    search_input = []
    $('#query').val("")
    render_query_parameter()
    update_search_location_parameter()
    angebotsinfos = undefined
}

function handle_tag_button_select(e) {
    var tagname = e.text
    remove_all_text_parameter(false)
    remove_time_parameter(false)
    $("#query").val(tagname + ", ")
    scroll_to_element("query")
    fire_angebote_search()
}

function handle_location_form(e) {
    var radiusSelection = document.getElementById("nearby-radius");
    if (radiusSelection) {
        location_radius = radiusSelection.options[radiusSelection.selectedIndex].value;
        // fire_angebote_search()
        do_angebote_search()
    }
}


var URL_ANGEBOT_LISTING     = "/angebote/"
var URL_MY_ANGEBOT_LIST     = "/angebote/my"
var URL_ANGEBOT_DETAIL      = "/angebote/"
var URL_ANGEBOT_EDIT        = "/angebote/edit/"
var URL_ANGEBOT_ASSIGNMENT  = "/angebote/zuordnen/"
var URL_EINRICHTUNG_EDIT    = "/website/geo/edit/"
var URL_EINRICHTUNG         = "/website/geo/"
var URL_EINRICHTUNG_CREATE  = "/website/geo/create/simple"

var TIMEZONE_SUFFIX = "UTC+01:00"
var WORKSPACE_COOKIE_NAME   = "dm4_workspace_id"

// ---- Methods to CREATE/UPDATE Screen --- //
/**

restc.login = function(authorization) {
    this.request("POST", "/accesscontrol/login", undefined, undefined, {"Authorization": authorization}, undefined,
        function() {return false})      // by returning false the error handler prevents the global error handler
}
restc.logout = function() {
    this.request("POST", "/accesscontrol/logout")
}
restc.get_username = function() {
    return this.request("GET", "/accesscontrol/user", undefined, undefined, undefined, "text")
    // Note: response 204 No Content yields to undefined result
}

restc.load_view_permissions = function(callback) {
    $.getJSON('/website/menu', function(results) {
        callback(results)
    })
}
**/

function _void() {}

// ---- Generic Methods used ACROSS all screens ---- //

function show_saving_icon(domSelector) {
    $(domSelector).addClass("loading").addClass("circle").removeClass("save")
}

function hide_saving_icon(domSelector) {
    $(domSelector).removeClass("loading").removeClass("circle").addClass("save")
}

function load_username(renderer) {
    $.ajax({
        type: "GET", url: "/accesscontrol/user",
        success: function(obj) {
            if (renderer) renderer(obj)
        },
        error: function(x, s, e) {
            console.warn("ERROR", "x: " + x + " s: " + s + " e: " + e)
        }
    })
}

function fetch_angebote_workspace() {
    var angebote_workspace_uri = "de.kiezatlas.angebote_ws"
    $.getJSON('/core/topic/by_value/uri/' + angebote_workspace_uri, function(result){
        js.remove_cookie(WORKSPACE_COOKIE_NAME)
        js.set_cookie(WORKSPACE_COOKIE_NAME, result.id)
        console.log("Set Angebote Workspace Cookie", result.id)
        // ### Remove Topicmap ID Cookie
    })
}

function has_angebote_membership(callback) {
    $.get('/angebote/membership/', function(response) {
        if (callback) callback(JSON.parse(response))
    })
}

function is_angebote_creator(id, callback) {
    $.get('/angebote/' + id + '/creator', function(response) {
        if (callback) callback(JSON.parse(response))
    })
}

function go_edit_einrichtung_form(id) {
    window.document.location = URL_EINRICHTUNG_EDIT + id
}

function go_edit_einrichtung(id) {
    window.document.location = URL_EINRICHTUNG + id
}

function go_edit_angebot(id) {
    window.document.location = URL_ANGEBOT_EDIT + id
}

function scroll_to_element(domId) {
    try {
        document.getElementById(domId).scrollIntoView()
    } catch(e) { console.warn("Element could not be scrolled into viewport", domId, e) }
}

function go_edit_assignments(id) {
    window.document.location = URL_ANGEBOT_ASSIGNMENT + id
}

function go_to_angebot_assignment(id) {
    if (id) {
        window.document.location = URL_ANGEBOT_ASSIGNMENT + id
    } else {
        setTimeout(function(e) {
            go_to_my_angebot_listing()
        }, 1500)
    }
}

function go_to_frontpage() {
    window.document.location = "/"
}

function go_to_my_angebot_listing() {
    window.document.location = URL_MY_ANGEBOT_LIST
}


function is_empty(stringValue) {
    return (stringValue === "" || stringValue === " ")
}

function get_random_int_inclusive(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function autocorrect_url(current_url) {
    if (current_url.length <= 4) return true
    var PROTOCOL_START = "http"
    if (!current_url.indexOf("http") === 0) {
        $('#angebot-webpage').val(PROTOCOL_START + '://' + current_url)
        console.log('Wir haben ein HTTP hinzugef&uuml;gt', current_url)
    }
    return is_valid_url(current_url)

    function is_valid_url(url) {
        var parser = document.createElement('a')
        try {
            parser.href = url
            return (parser.hostname !== "localhost" && !!parser.hostname)
        } catch (e) {
            return false
        }
    }
}

function parse_angebots_id() {
    var start = window.document.location.pathname.lastIndexOf("/")
    var topicId = window.document.location.pathname.substr(start+1)
    return topicId
}

function get_latest_angebote_end_time(a) {
    var latestEndTime = 0
    for (var ai in a.locations) {
        var assignment = a.locations[ai]
        if (assignment["ende_timestamp"] > latestEndTime) latestEndTime = assignment["ende_timestamp"]
    }
    return latestEndTime
}

function angebote_compare_by_end_earliest_last(a, b) {
    var oldestEndA = get_latest_angebote_end_time(a)
    var oldestEndB = get_latest_angebote_end_time(b)
    if (oldestEndA < oldestEndB) // sort string ascending
        return -1
    if (oldestEndA > oldestEndB)
        return 1
    return 0 //default return value (no sorting)
}

function angebote_compare_by_last_modified(a, b) {
    var oldestEndA = a.childs["dm4.time.modified"].value
    var oldestEndB = b.childs["dm4.time.modified"].value
    if (oldestEndA < oldestEndB) // sort string ascending
        return 1
    if (oldestEndA > oldestEndB)
        return -1
    return 0 //default return value (no sorting)
}

function angebote_compare_by_distance_nearest_first(a, b) {
    if (!a.search_distance) return 1
    if (!b.search_distance) return -1
    var oldestEndA = (a.search_distance * 1000)
    var oldestEndB = (b.search_distance * 1000)
    if (oldestEndA < oldestEndB) return -1
    if (oldestEndA > oldestEndB) return 1
    return 0 //default return value (no sorting)
}

function angebote_compare_by_end_latest_first(a, b) {
    // compare "a" and "b" in some fashion, and return -1, 0, or 1
    var oldestEndA = get_latest_angebote_end_time(a)
    var oldestEndB = get_latest_angebote_end_time(b)
    if (oldestEndA > oldestEndB) // sort string descending
        return -1
    if (oldestEndA < oldestEndB)
        return 1
    return 0 //default return value (no sorting)
}

function value_sort_desc(a, b) {
    var nameA = a.value
    var nameB = b.value
    //
    if (nameA.toLowerCase() > nameB.toLowerCase()) // sort string descending
        return 1
    if (nameA.toLowerCase() < nameB.toLowerCase())
        return -1
    return 0 //default return value (no sorting)
}

// ---------- Parsing German Date Label Utilities ------------- //

function remove_dots(string) {
    return string.split(".").join("")
}

function remove_commas(string) {
    return string.split(",").join("")
}

function remove_weekday_label(germanDateString) {
    if (germanDateString.indexOf("Sonntag") !== -1) return germanDateString.replace("Sonntag", "")
    if (germanDateString.indexOf("Montag") !== -1) return germanDateString.replace("Montag", "")
    if (germanDateString.indexOf("Dienstag") !== -1) return germanDateString.replace("Dienstag", "")
    if (germanDateString.indexOf("Mittwoch") !== -1) return germanDateString.replace("Mittwoch", "")
    if (germanDateString.indexOf("Donnerstag") !== -1) return germanDateString.replace("Donnerstag", "")
    if (germanDateString.indexOf("Freitag") !== -1) return germanDateString.replace("Freitag", "")
    if (germanDateString.indexOf("Samstag") !== -1) return germanDateString.replace("Samstag", "")
    return germanDateString
}

function convert_to_en_month(germanDateString) {
    if (germanDateString.indexOf("Januar") !== -1) return germanDateString.replace("Januar", "January")
    if (germanDateString.indexOf("Februar") !== -1) return germanDateString.replace("Februar", "February")
    if (germanDateString.indexOf("März") !== -1) return germanDateString.replace("März", "March")
    if (germanDateString.indexOf("Mai") !== -1) return germanDateString.replace("Mai", "May")
    if (germanDateString.indexOf("Juni") !== -1) return germanDateString.replace("Juni", "June")
    if (germanDateString.indexOf("Juli") !== -1) return germanDateString.replace("Juli", "July")
    if (germanDateString.indexOf("Oktober") !== -1) return germanDateString.replace("Oktober", "October")
    if (germanDateString.indexOf("Dezember") !== -1) return germanDateString.replace("Dezember", "December")
    return germanDateString
}

function get_month_from_en(germanDateString) {
    if (germanDateString.indexOf("January") !== -1) return 0
    if (germanDateString.indexOf("February") !== -1) return 1
    if (germanDateString.indexOf("March") !== -1) return 2
    if (germanDateString.indexOf("April") !== -1) return 3
    if (germanDateString.indexOf("May") !== -1) return 4
    if (germanDateString.indexOf("June") !== -1) return 5
    if (germanDateString.indexOf("July") !== -1) return 6
    if (germanDateString.indexOf("August") !== -1) return 7
    if (germanDateString.indexOf("September") !== -1) return 8
    if (germanDateString.indexOf("October") !== -1) return 9
    if (germanDateString.indexOf("November") !== -1) return 10
    if (germanDateString.indexOf("December") !== -1) return 11
    return undefined
}


