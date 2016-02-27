
var angebote = (function($) {
    
    console.log("Kiezatlas Angebote Script loaded")
    
    var api = {} 
    
    /** Model: */
    var angebote_items =  []

    /** Functions */
    api.load_geo_objects_angebote = function(geo_object_ids) {
        var params = ""
        var count = 1
        for (var idx in geo_object_ids) {
            params += geo_object_ids[idx]
            if (count < geo_object_ids.length) {
                params += ";"
            }
            count++
        }
        $.ajax('/kiezatlas/angebot/list/many/' + params, {
            type: "GET",
            error: function(e) {
                console.warn("AJAX POST Error", e)
                if (e.status === 200) {
                    angebote_items = response
                }
            },
            success: function(response) {
                angebote_items = response
                console.log('Loaded Angebote', angebote_items)
            }
        })
    }

    api.get_angebotsinfos_by_geo_object_id = function (geo_object_id) {
        var results = []
        for (var e in angebote_items) {
            var angebotsinfo = angebote_items[e]
            if (angebotsinfo.assoc.role_1.topic_id === geo_object_id ||
                angebotsinfo.assoc.role_2.topic_id === geo_object_id) {
                results.push(angebotsinfo)
            }
        }
        return results
    }

    // TODO: Move Rendering Angebotsinfos to Ka-Website Module
    api.show_angebotsinfos = function(id) {
        var infos = api.get_angebotsinfos_by_geo_object_id(id)
        console.log("- NYE - Render Angebotsinfos", infos)
    }
    
    return api

}($))