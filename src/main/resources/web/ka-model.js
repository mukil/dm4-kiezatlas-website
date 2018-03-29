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
    "map_controls_results": false, // false, means: map_controls_query
    "set_site_info": function(topic) { model.site_info = topic },
    "set_site_id": function(topicId) { model.site_id = topicId },
    "get_site_info": function() { return model.site_info },
    "get_site_id": function() { return model.site_id },
    "set_districts": function(districts) { model.districts = districts },
    "get_districts": function() { return model.districts },
    "set_frontpage_mode": function() {
        model.set_site_info(undefined)
        model.set_site_id(undefined)
    },
    "set_angebotsfilter": function(value) { model.view_angebote = value },
    "set_mapcontrol_mode_results": function() {
        model.map_controls_results = true
        leafletMap.deactivate_circle_control()
        leafletMap.remove_circle_search_control()
    },
    "set_mapcontrol_mode_query": function(fitBounds) {
        model.map_controls_results = false
        if (!leafletMap.is_circle_query_active()) {
            leafletMap.activate_circle_control()
            leafletMap.render_circle_search_control(fitBounds)
            console.log("Activating circle query control...")
        } else {
            leafletMap.render_circle_search_control(fitBounds)
        }
    },
    "is_kiezatlas_site": function() { return (model.siteId) },
    "is_map_result_control": function() { return model.map_controls_results },
    "is_map_query_control": function() { return !model.map_controls_results },
    "is_angebote_mode": function() { return (model.view_angebote) },
    // ### Migrate from global scoope
    "month_names_de": [ "Januar", "Februar", "März", "April", "Mai", "Juni",
        "Juli", "August", "September", "Oktober", "November", "Dezember" ],
    "colors": {                  // kiezatlas hex colors
        "ka_blue": "#3e606f",       // circle control
        "ka_red": "#ce0000",        // districs layer polygon outline
        "ka_green": "#9cc300",      // ...
        "m_blue": "#9ec8d6",        // marker: medium blue outline and fill-in (selected)
        "ka_gold": "#f8f6e9",       // marker: yellow fill-ine and outline (selected)
        "bright_grey": "#a9a9a9",   // circlemarker: fill-in
        "yellow": "#f8f6e9",        // circle control
        "darkgrey": "#343434",      // unused
        "dark_blue": "#193441",     // unused
        "bright_blue": "#ecf4f7",   // unused
        "ka_water": "#ccdddd",      // unused
        "grey": "#868686",           // unused,
        "ka_yellow": "#f8f6e9", 
        "blue1": "#193441",
        "blue2": "#9ec8d6",
        "blue3": "#3787ab",
        "blue4": "#ecf4f7",
        "blue5": "#3e606f"
    }
}



